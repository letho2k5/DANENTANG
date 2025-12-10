// app/admin/revenue.tsx
import { format, subDays } from "date-fns";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../services/firebase";

type RevenueItem = {
  label: string;
  revenue: number;
  dateKey: string;
};

export default function RevenueScreen() {
  const [dailyData, setDailyData] = useState<RevenueItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<RevenueItem[]>([]);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(db, "users");

    const unsub = onValue(usersRef, (snapshot) => {
      const dailyMap = new Map<string, number>();
      const monthlyMap = new Map<string, number>();

      snapshot.forEach((userSnap) => {
        const historiesSnap = userSnap.child("histories");
        if (!historiesSnap.exists()) return;

        historiesSnap.forEach((orderSnap) => {
          const order = orderSnap.val();
          if (!order || order.status !== "Received") return;

          const revenue = Number(order.total ?? 0) + Number(order.tax ?? 0) + Number(order.deliveryFee ?? 0);
          if (revenue <= 0) return;

          let orderTime = Date.now();
          if (order.createdAt) {
            if (typeof order.createdAt === "string") orderTime = new Date(order.createdAt).getTime();
            else if (order.createdAt?.toMillis) orderTime = order.createdAt.toMillis();
            else if (typeof order.createdAt === "number") orderTime = order.createdAt;
          }

          const date = new Date(orderTime);
          if (isNaN(date.getTime())) return;

          const dateKey = format(date, "yyyy-MM-dd");
          const monthKey = format(date, "yyyy-MM");

          if (date >= subDays(new Date(), 6)) {
            dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + revenue);
          }

          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (date >= oneYearAgo) {
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + revenue);
          }
        });
      });

      const createData = (count: number, isDaily: boolean): RevenueItem[] => {
        const result: RevenueItem[] = [];
        for (let i = count - 1; i >= 0; i--) {
          const date = isDaily ? subDays(new Date(), i) : new Date();
          if (!isDaily) date.setMonth(date.getMonth() - i);
          const key = isDaily ? format(date, "yyyy-MM-dd") : format(date, "yyyy-MM");
          const map = isDaily ? dailyMap : monthlyMap;
          const revenue = Number((map.get(key) || 0).toFixed(2));
          result.push({
            label: isDaily ? format(date, "EEEE, dd/MM") : format(date, "MMMM yyyy"),
            revenue,
            dateKey: key,
          });
        }
        return result;
      };

      setDailyData(createData(7, true));
      setMonthlyData(createData(12, false));
      setLoading(false);
    });

    // Dữ liệu mặc định
    const init = (count: number, daily: boolean) => {
      const arr: RevenueItem[] = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = daily ? subDays(new Date(), i) : new Date();
        if (!daily) d.setMonth(d.getMonth() - i);
        arr.push({
          label: daily ? format(d, "EEEE, dd/MM") : format(d, "MMMM yyyy"),
          revenue: 0,
          dateKey: "",
        });
      }
      return arr;
    };

    setDailyData(init(7, true));
    setMonthlyData(init(12, false));
    setLoading(true);

    return () => unsub();
  }, []);

  const data = viewMode === "daily" ? dailyData : monthlyData;
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2);
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Đang tải doanh thu...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: RevenueItem }) => {
    const isToday = item.dateKey === format(new Date(), "yyyy-MM-dd");
    const isThisMonth = item.dateKey === format(new Date(), "yyyy-MM");

    return (
      <View style={[styles.itemCard, (isToday || isThisMonth) && styles.highlightCard]}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDate}>{item.label}</Text>
          {(isToday || isThisMonth) && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>
                {isToday ? "Hôm nay" : "Tháng này"}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.itemRevenue}>${item.revenue.toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Báo cáo doanh thu</Text>

      <Text style={styles.subtitle}>
        Chỉ tính đơn hàng đã hoàn tất (Đã nhận hàng)
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          Tổng doanh thu {viewMode === "daily" ? "7 ngày gần nhất" : "12 tháng gần đây"}
        </Text>
        <Text style={styles.summaryAmount}>${totalRevenue}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === "daily" && styles.tabActive]}
          onPress={() => setViewMode("daily")}
        >
          <Text style={[styles.tabText, viewMode === "daily" && styles.tabTextActive]}>
            7 ngày gần nhất
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "monthly" && styles.tabActive]}
          onPress={() => setViewMode("monthly")}
        >
          <Text style={[styles.tabText, viewMode === "monthly" && styles.tabTextActive]}>
            12 tháng gần đây
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.dateKey || item.label}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa" },
  loadingText: { marginTop: 20, fontSize: 18, color: "#666" },

  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", color: "#2c3e50", marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 32, fontStyle: "italic" },

  summaryCard: {
    backgroundColor: "#4CAF50",
    marginHorizontal: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 32,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  summaryLabel: { fontSize: 18, color: "#e8f5e9", marginBottom: 12, fontWeight: "600" },
  summaryAmount: { fontSize: 52, fontWeight: "bold", color: "white" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 8,
    marginBottom: 32,
    elevation: 10,
  },
  tab: { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  tabActive: { backgroundColor: "#4CAF50" },
  tabText: { fontSize: 17, color: "#666", fontWeight: "600" },
  tabTextActive: { color: "white", fontWeight: "bold" },

  itemCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightCard: {
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "#f0fff4",
  },
  itemHeader: { flexDirection: "row", alignItems: "center" },
  itemDate: { fontSize: 18, fontWeight: "600", color: "#2c3e50" },
  todayBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  todayBadgeText: { color: "white", fontSize: 12, fontWeight: "bold" },
  itemRevenue: { fontSize: 22, fontWeight: "bold", color: "#e74c3c" },
});