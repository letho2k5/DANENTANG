// app/admin/orders.tsx
import { useRouter } from "expo-router";
import { onValue, ref, remove, update } from "firebase/database";
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
import type { Food } from "../../models/Food";
import type { Order } from "../../models/Order";
import { db } from "../../services/firebase";

const FILTERS = ["", "Wait Confirmed", "Shipping", "Received"] as const;

export default function AdminOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("Wait Confirmed");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    const usersRef = ref(db, "users");

    const unsub = onValue(
      usersRef,
      (snapshot) => {
        const list: Order[] = [];

        snapshot.forEach((userSnap) => {
          const fullName = (userSnap.child("fullName").val() as string) || "Khách vãng lai";
          const userId = userSnap.key!;
          const ordersSnap = userSnap.child("orders");

          ordersSnap.forEach((orderSnap) => {
            const data = orderSnap.val();
            if (!data) return;

            const status = data.status || "Wait Confirmed";
            if (selectedFilter !== "" && status !== selectedFilter) return;

            let sortTime = Date.now();
            if (data.createdAt) {
              if (typeof data.createdAt === "string") {
                sortTime = new Date(data.createdAt).getTime();
              } else if (data.createdAt?.toMillis) {
                sortTime = data.createdAt.toMillis();
              } else if (typeof data.createdAt === "number") {
                sortTime = data.createdAt;
              }
            }

            const rawItems = data.items || [];

            const order: Order = {
              id: orderSnap.key!,
              userId,
              userName: fullName,
              status,
              total: Number(data.total ?? 0),
              tax: Number(data.tax ?? 0),
              deliveryFee: Number(data.deliveryFee ?? 0),
              address: data.address || "Chưa có địa chỉ",
              paymentMethod: data.paymentMethod || "Cash on Delivery",
              bankPaymentInfo: data.bankPaymentInfo || null,
              createdAt: data.createdAt,

            items: rawItems.map((it: any): Food => ({
              id: it.id || it.Id || Date.now(),
              title: it.Title || it.title || "Món ăn",
              price: Number(it.Price || it.price || 0),
              imagePath: it.ImagePath || it.imagePath || "",
              numberInCart: Number(it.numberInCart || 1),
              description: it.description || it.Description || "",
              categoryId: it.categoryId || it.CategoryId || "",
              bestFood: !!it.bestFood || !!it.BestFood || false,
              locationId: Number(it.locationId || it.LocationId || 0),
              priceId: Number(it.priceId || it.PriceId || 0),
              timeId: Number(it.timeId || it.TimeId || 0),
              calorie: Number(it.calorie || it.Calorie || 0),
              star: Number(it.star || it.Star || 0),
              timeValue: Number(it.timeValue || it.TimeValue || 0),
            })),
            };

            (order as any).__sortTime = sortTime;
            list.push(order);
          });
        });

        list.sort((a, b) => ((b as any).__sortTime || 0) - ((a as any).__sortTime || 0));
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải đơn hàng:", error);
        Alert.alert("Lỗi", "Không thể tải đơn hàng");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [selectedFilter]);

  const formatTime = (createdAt: any): string => {
    if (!createdAt) return "Không xác định";
    let time: number;
    try {
      if (typeof createdAt === "string") time = new Date(createdAt).getTime();
      else if (createdAt?.toMillis) time = createdAt.toMillis();
      else if (typeof createdAt === "number") time = createdAt;
      else return "Lỗi định dạng";
      if (isNaN(time)) return "Thời gian lỗi";
      return new Date(time).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Lỗi thời gian";
    }
  };

  const getNextStatus = (status: string): string | null => {
    if (status === "Wait Confirmed") return "Shipping";
    if (status === "Shipping") return "Received";
    if (status === "Received") return "Completed";
    return null;
  };

  const handleAdvanceStatus = async (order: Order) => {
    const next = getNextStatus(order.status);
    if (!next) {
      Alert.alert("Thông báo", "Đơn hàng đã hoàn tất");
      return;
    }

    setUpdating(true);
    try {
      const orderRef = ref(db, `users/${order.userId}/orders/${order.id}`);
      if (next === "Completed") {
        await remove(orderRef);
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        Alert.alert("Thành công", "Đơn hàng đã được chuyển vào lịch sử!");
      } else {
        await update(orderRef, { status: next });
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
        Alert.alert("Thành công", `Cập nhật trạng thái → ${next}`);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const firstItem = item.items[0];
    const statusColor =
      item.status === "Wait Confirmed" ? "#2196F3" :
      item.status === "Shipping" ? "#FF9800" :
      item.status === "Received" ? "#F44336" : "#9E9E9E";

    const statusText =
      item.status === "Wait Confirmed" ? "Xác nhận" :
      item.status === "Shipping" ? "Đang giao" :
      item.status === "Received" ? "Hoàn tất" : "Cập nhật";

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedOrder(item)}>
        <View style={styles.cardRow}>
          {firstItem?.imagePath ? (
            <Image source={{ uri: firstItem.imagePath }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]} />
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>#{item.id.slice(-6)} • {item.items.length} món</Text>
            <Text style={styles.cardDate}>Đặt lúc: {formatTime(item.createdAt)}</Text>
            <Text style={styles.cardText}>Khách: {item.userName}</Text>
            <Text style={styles.cardText}>Trạng thái: {item.status}</Text>
            <Text style={styles.cardText}>
              Tổng: ${(item.total + item.tax + item.deliveryFee).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: statusColor }]}
            onPress={(e) => {
              e.stopPropagation();
              handleAdvanceStatus(item);
            }}
            disabled={updating}
          >
            <Text style={styles.statusButtonText}>
              {updating ? "..." : statusText}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
        <TouchableOpacity onPress={() => router.push("/admin/orders-history")}>
          <Text style={styles.historyLink}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter || "all"}
            style={[
              styles.filterBtn,
              selectedFilter === filter && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterBtnText,
                selectedFilter === filter && styles.filterBtnTextActive,
              ]}
            >
              {filter === "" ? "Tất cả" : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : orders.length === 0 ? (
        <Text style={styles.emptyText}>Không có đơn hàng</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết đơn #{selectedOrder.id.slice(-6)}</Text>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <Text style={styles.closeBtn}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.section}>Thông tin</Text>
                <Text style={styles.infoText}>Khách: {selectedOrder.userName}</Text>
                <Text style={styles.infoText}>Địa chỉ: {selectedOrder.address}</Text>
                <Text style={styles.infoText}>Ngày đặt: {formatTime(selectedOrder.createdAt)}</Text>
                <Text style={styles.infoText}>Phương thức: {selectedOrder.paymentMethod}</Text>
                <Text style={styles.infoText}>Trạng thái: {selectedOrder.status}</Text>

                <View style={styles.priceBox}>
                  <Text style={styles.priceLine}>Tiền món: ${selectedOrder.total.toFixed(2)}</Text>
                  <Text style={styles.priceLine}>Thuế: ${selectedOrder.tax.toFixed(2)}</Text>
                  <Text style={styles.priceLine}>Phí giao: ${selectedOrder.deliveryFee.toFixed(2)}</Text>
                  <Text style={styles.totalPrice}>
                    Tổng: ${(selectedOrder.total + selectedOrder.tax + selectedOrder.deliveryFee).toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.section}>Sản phẩm</Text>
                {selectedOrder.items.map((food, i) => (
                  <View key={i} style={styles.productItem}>
                    <Text style={styles.productName}>• {food.title}</Text>
                    <Text style={styles.productDetail}>
                      {food.numberInCart} × ${food.price.toFixed(2)} = ${(food.price * food.numberInCart).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  emptyText: { textAlign: "center", marginTop: 60, fontSize: 18, color: "#999" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#2c3e50" },
  historyLink: { fontSize: 16, color: "#4CAF50", fontWeight: "600" },

  filterContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, padding: 16 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, backgroundColor: "#e0e0e0" },
  filterBtnActive: { backgroundColor: "#4CAF50" },
  filterBtnText: { fontSize: 14, color: "#555", fontWeight: "600" },
  filterBtnTextActive: { color: "white", fontWeight: "bold" },

  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, marginVertical: 10, elevation: 10, overflow: "hidden" },
  cardRow: { flexDirection: "row" },
  cardImage: { width: 110, height: 110 },
  placeholderImage: { backgroundColor: "#ddd" },
  cardInfo: { flex: 1, padding: 16, justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "bold", color: "#2c3e50" },
  cardDate: { fontSize: 13.5, color: "#27ae60", marginTop: 4, fontWeight: "600" },
  cardText: { fontSize: 14.5, color: "#555", marginTop: 6 },

  cardFooter: { padding: 12, alignItems: "flex-end" },
  statusButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  statusButtonText: { color: "white", fontWeight: "bold", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "94%", maxHeight: "92%", backgroundColor: "#fff", borderRadius: 28, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 23, fontWeight: "bold", color: "#2c3e50" },
  closeBtn: { fontSize: 36, fontWeight: "bold", color: "#999" },

  section: { fontSize: 19, fontWeight: "bold", marginTop: 28, marginBottom: 12, color: "#2c3e50" },
  infoText: { fontSize: 16, color: "#444", marginBottom: 8 },
  priceBox: { backgroundColor: "#f8f9fa", padding: 18, borderRadius: 18, marginVertical: 16 },
  priceLine: { fontSize: 16, color: "#555", marginBottom: 8 },
  totalPrice: { fontSize: 21, fontWeight: "bold", color: "#e74c3c", marginTop: 12 },

  productItem: { paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee" },
  productName: { fontSize: 16.5, fontWeight: "600", color: "#2c3e50" },
  productDetail: { fontSize: 15, color: "#666", marginTop: 4 },
});