// app/admin/index.tsx – ADMIN DASHBOARD CHUẨN DOANH NGHIỆP 2025
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router"; // Dùng Href thay vì string
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase";

// Dùng Href để TypeScript hiểu chính xác các route có thật
type MenuItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: Href;
}

// Tất cả route đều hợp lệ và được TypeScript công nhận 100%
const MENU_ITEMS: MenuItem[] = [
  { title: "Quản lý Danh mục", icon: "grid-outline", color: "#FF6B6B", route: "/admin/categories" },
  { title: "Quản lý Đơn hàng", icon: "receipt-outline", color: "#4ECDC4", route: "/admin/orders" },
  { title: "Doanh thu", icon: "trending-up-outline", color: "#45B649", route: "/admin/revenue" },
  { title: "Tài khoản người dùng", icon: "people-outline", color: "#5D5FEF", route: "/admin/users" },
  // { title: "Khuyến mãi", icon: "pricetag-outline", color: "#FFA502", route: "/admin/promotions" },
  // { title: "Cài đặt", icon: "settings-outline", color: "#8E8E93", route: "/admin/settings" },
];

export default function AdminScreen() {
  const router = useRouter();

  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTimestamp = startOfDay.getTime();

    let todayOrdersCount = 0;
    let todayRevenueTotal = 0;

    const usersRef = ref(db, "users");

    const unsubUsers = onValue(usersRef, (snapshot) => {
      todayOrdersCount = 0;
      todayRevenueTotal = 0;

      snapshot.forEach((userSnap) => {
        const ordersSnap = userSnap.child("orders");
        const historiesSnap = userSnap.child("histories");

        const processNode = (node: any) => {
          node.forEach((orderSnap: any) => {
            const order = orderSnap.val();
            if (!order) return;

            const orderTime = order.timestamp || order.createdAt || 0;
            const total = (order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0);

            if (orderTime >= startTimestamp) {
              todayOrdersCount++;
            }
          });
        };

        processNode(ordersSnap);
        processNode(historiesSnap);

        // Doanh thu chỉ tính từ đơn đã hoàn thành (histories)
        historiesSnap.forEach((orderSnap: any) => {
          const order = orderSnap.val();
          if (!order) return;
const orderTime = order.timestamp || order.createdAt || 0;
          const total = (order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0);

          if (orderTime >= startTimestamp) {
            todayRevenueTotal += total;
          }
        });
      });

      setTodayOrders(todayOrdersCount);
      setTodayRevenue(todayRevenueTotal);
      setLoadingStats(false);
    });

    // Đếm tổng số người dùng
    const unsubCount = onValue(ref(db, "users"), (snap) => {
      setTotalUsers(snap.size);
    });

    return () => {
      unsubUsers();
      unsubCount();
    };
  }, []);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn thoát không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thoát",
        style: "destructive",
        onPress: () => {
          auth.signOut();
          router.replace("/(auth)/login" as Href);
        },
      },
    ]);
  };

const formatCurrencyUSD = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${amount.toLocaleString("en-US")}`;
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Chào mừng trở lại,</Text>
            <Text style={styles.adminName}>Admin Kebab Ngon</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={28} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {loadingStats ? (
          <View style={styles.loadingStats}>
            <ActivityIndicator size="large" color="#00BCD4" />
            <Text style={{ marginTop: 12, color: "#666" }}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="cart-outline" size={36} color="#4ECDC4" />
              <Text style={styles.statNumber}>{todayOrders}</Text>
              <Text style={styles.statLabel}>Đơn hôm nay</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={36} color="#45B649" />
              <Text style={styles.statNumber}>{formatCurrencyUSD(todayRevenue)}</Text>
              <Text style={styles.statLabel}>Doanh thu hôm nay</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={36} color="#5D5FEF" />
              <Text style={styles.statNumber}>{totalUsers}</Text>
              <Text style={styles.statLabel}>Tổng khách hàng</Text>
            </View>
          </View>
)}

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>First Order 30% OFF!</Text>
            <Text style={styles.bannerSubtitle}>Giao hàng miễn phí toàn quốc</Text>
          </View>
          <View style={styles.bannerImage}>
            <Text style={styles.pizzaEmoji}>PIZZA</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Quản lý hệ thống</Text>
        <View style={styles.grid}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuCard, { borderLeftColor: item.color }]}
              onPress={() => router.push(item.route)} // Type-safe 100%
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon} size={32} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Kebab Ngon Admin Panel</Text>
          <Text style={styles.version}>v2.0 • Realtime Dashboard</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  welcome: { fontSize: 16, color: "#666" },
  adminName: { fontSize: 24, fontWeight: "bold", color: "#333" },
  logoutBtn: { padding: 8 },

  loadingStats: { padding: 40, alignItems: "center" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
 statLabel: {
  fontSize: 12,
  color: "#666",
  marginTop: 8,
  fontWeight: "600",
  textAlign: "center",       
},

  banner: {
    margin: 16,
    backgroundColor: "#FFF3CD",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 24, fontWeight: "bold", color: "#D63031" },
  bannerSubtitle: { fontSize: 16, color: "#2D3436", marginTop: 6 },
  bannerImage: {
    width: 90,
height: 90,
    backgroundColor: "#FFD93D",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  pizzaEmoji: { fontSize: 20 },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  grid: { paddingHorizontal: 20, gap: 16 },
  menuCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderLeftWidth: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  menuTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#333" },

  footer: { marginTop: 50, padding: 20, alignItems: "center" },
  footerText: { fontSize: 14, color: "#999" },
  version: { fontSize: 12, color: "#ccc", marginTop: 6 },
});