// app/(tabs)/orders.tsx – ĐÃ CÓ THỜI GIAN ĐẶT ĐƠN + ĐẸP NHƯ GRAB
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onValue, ref, remove, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Order } from "../../models/Order";
import { auth, db } from "../../services/firebase";

// Hàm format thời gian đẹp
const formatOrderTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else {
    return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

export default function OrdersScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userId) {
      setShowLoginDialog(true);
      setLoading(false);
      return;
    }

    const ordersRef = ref(db, `users/${userId}/orders`);
    const unsub = onValue(
      ordersRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((child) => {
          const v: any = child.val();
          if (!v) return;
          list.push({
            id: child.key || "",
            items: v.items || [],
            total: v.total ?? 0,
            tax: v.tax ?? 0,
            deliveryFee: v.deliveryFee ?? 0,
            status: v.status ?? "Wait Confirmed",
            userId: v.userId ?? userId,
            userName: v.userName ?? null,
            address: v.address ?? "",
            paymentMethod: v.paymentMethod ?? "",
            bankPaymentInfo: v.bankPaymentInfo ?? null,
            createdAt: v.createdAt ?? Date.now(), // LẤY THỜI GIAN TẠT
          });
        });

        // Sắp xếp đơn mới nhất lên đầu
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setOrders(list);
        setLoading(false);
      },
      () => {
        Alert.alert("Lỗi", "Không thể tải đơn hàng");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  function handleMoveToHistory(order: Order) {
    if (!userId || order.status !== "Received") {
      Alert.alert("Thông báo", "Chỉ có thể chuyển đơn khi đã nhận hàng");
      return;
    }

    const orderRef = ref(db, `users/${userId}/orders/${order.id}`);
    const historyRef = ref(db, `users/${userId}/histories/${order.id}`);

    set(historyRef, order)
      .then(() => remove(orderRef))
      .then(() => Alert.alert("Thành công", "Đơn đã chuyển sang lịch sử"))
      .catch(() => Alert.alert("Lỗi", "Không thể chuyển đơn"));
  }

  if (showLoginDialog) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, marginBottom: 16, textAlign: "center" }}>
          Vui lòng đăng nhập để xem đơn hàng
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <TouchableOpacity onPress={() => router.push("/history")}>
          <Text style={styles.historyText}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={{ marginTop: 12, color: "#666" }}>Đang tải đơn hàng...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={80} color="#ddd" />
          <Text style={{ fontSize: 18, marginTop: 16, color: "#999" }}>
            Chưa có đơn hàng nào
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => setSelectedOrder(item)}
              onStatusPress={() => handleMoveToHistory(item)}
            />
          )}
        />
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

// CARD ĐƠN HÀNG – CÓ HIỂN THỊ THỜI GIAN
function OrderCard({ order, onPress, onStatusPress }: {
  order: Order;
  onPress: () => void;
  onStatusPress: () => void;
}) {
  const firstItem = order.items[0];

  const statusColors: Record<string, string> = {
    "Wait Confirmed": "#FFA502",
    "Preparing": "#FF6B6B",
    "Shipping": "#4ECDC4",
    "Received": "#45B649",
    "Cancelled": "#95A5A6",
  };

  const statusColor = statusColors[order.status] || "#999";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Đơn hàng #{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={styles.orderTime}>{formatOrderTime(order.createdAt || Date.now())}</Text>
      </View>

      <View style={styles.cardBody}>
        {firstItem?.imagePath ? (
          <Image source={{ uri: firstItem.imagePath }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, { backgroundColor: "#f0f0f0" }]} />
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.itemCount}>{order.items.length} món</Text>
          <Text style={styles.address} numberOfLines={1}>
            Giao đến: {order.address || "Chưa có địa chỉ"}
          </Text>
          <Text style={styles.payment}>
            {order.paymentMethod === "Cash on Delivery" ? "Thanh toán khi nhận" : "Đã thanh toán online"}
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>
            ${(order.total + order.tax + order.deliveryFee).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
        {order.status === "Received" && (
          <TouchableOpacity onPress={onStatusPress} style={styles.moveBtn}>
            <Text style={styles.moveText}>Chuyển lịch sử</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// MODAL CHI TIẾT – CÓ THỜI GIAN ĐẶT ĐƠN
function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const total = order.total + order.tax + order.deliveryFee;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Thời gian đặt đơn */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn hàng</Text>
              <Text style={styles.infoValue}>#{order.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian đặt</Text>
              <Text style={styles.infoValue}>
                {new Date(order.createdAt || Date.now()).toLocaleString("vi-VN")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={[styles.infoValue, { color: "#45B649", fontWeight: "bold" }]}>
                {order.status}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Địa chỉ giao</Text>
              <Text style={styles.infoValue}>{order.address || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thanh toán</Text>
              <Text style={styles.infoValue}>
                {order.paymentMethod === "Cash on Delivery" ? "Khi nhận hàng" : "Đã thanh toán"}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Danh sách món */}
            <Text style={styles.sectionTitle}>Danh sách món ăn</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {item.title} × {item.numberInCart}
                </Text>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.numberInCart).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Tổng tiền */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loginButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
  historyText: { fontSize: 16, color: "#FF6B6B", fontWeight: "600" },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  orderId: { fontSize: 16, fontWeight: "bold", color: "#333" },
  orderTime: { fontSize: 14, color: "#666" },
  cardBody: {
    flexDirection: "row",
    padding: 16,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  itemCount: { fontSize: 18, fontWeight: "bold", color: "#333" },
  address: { fontSize: 14, color: "#666", marginTop: 4 },
  payment: { fontSize: 14, color: "#45B649", marginTop: 4, fontWeight: "600" },
  priceContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  totalPrice: { fontSize: 20, fontWeight: "bold", color: "#FF6B6B" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { color: "white", fontWeight: "bold", fontSize: 14 },
  moveBtn: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moveText: { color: "#666", fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "92%",
    borderRadius: 20,
    maxHeight: "85%",
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoLabel: { fontSize: 16, color: "#666" },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 20,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  itemTitle: { fontSize: 16, color: "#333" },
  itemPrice: { fontSize: 16, fontWeight: "600", color: "#FF6B6B" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#f0f8ff",
    borderRadius: 12,
    margin: 20,
    marginTop: 10,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold" },
  totalAmount: { fontSize: 24, fontWeight: "bold", color: "#FF6B6B" },
});