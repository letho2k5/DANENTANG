// app/(tabs)/history.tsx – LỊCH SỬ ĐƠN HÀNG SIÊU PRO + REALTIME
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Order } from "../../models/Order";
import { auth, db } from "../../services/firebase";

// Format thời gian đẹp như Grab
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function HistoryScreen() {
  const router = useRouter();
  const userId = auth.currentUser?.uid ?? "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const historyRef = ref(db, `users/${userId}/histories`);
    const unsub = onValue(historyRef, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val) {
          list.push({
            id: child.key!,
            items: val.items || [],
            total: Number(val.total || 0),
            tax: Number(val.tax || 0),
            deliveryFee: Number(val.deliveryFee || 10),
            status: val.status || "Received",
            createdAt: val.createdAt || Date.now(),
            address: val.address || "",
            paymentMethod: val.paymentMethod || "Tiền mặt",
          });
        }
      });

      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  const renderOrder = ({ item }: { item: Order }) => {
    const firstItem = item.items[0];
    const total = item.total + item.tax + item.deliveryFee;
    const itemCount = item.items.reduce((sum, i) => sum + (i.numberInCart || 1), 0);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.95}
        onPress={() => setSelectedOrder(item)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderTime}>{formatTime(item.createdAt || Date.now())}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.statusText}>Đã nhận</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {firstItem?.imagePath ? (
            <Image source={{ uri: firstItem.imagePath }} style={styles.foodImage} />
          ) : (
            <View style={[styles.foodImage, styles.placeholderImage]} />
          )}

          <View style={styles.info}>
            <Text style={styles.itemCount}>{itemCount} món</Text>
            <Text style={styles.address} numberOfLines={1}>
              {item.address || "Không có địa chỉ"}
            </Text>
            <Text style={styles.payment}>
              {item.paymentMethod === "Cash on Delivery" ? "Tiền mặt" : "Chuyển khoản"}
            </Text>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.totalPrice}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.detailText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử đơn hàng</Text>
        <Text style={styles.subtitle}>Đã hoàn thành • Tự động cập nhật</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={90} color="#ddd" />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptySubtitle}>
            Đơn sẽ tự động xuất hiện khi bạn nhận hàng
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal chi tiết */}
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </SafeAreaView>
  );
}

// MODAL CHI TIẾT – SIÊU ĐẸP
function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const total = order.total + order.tax + order.deliveryFee;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã đơn</Text>
                <Text style={styles.infoValue}>#{order.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.createdAt || Date.now()).toLocaleString("vi-VN")}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trạng thái</Text>
                <Text style={[styles.infoValue, styles.completedStatus]}>
                  Đã nhận hàng
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={styles.infoValue}>{order.address || "—"}</Text>
              </View>
            </View>

            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Sản phẩm đã đặt</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    • {item.title} × {item.numberInCart || 1}
                  </Text>
                  <Text style={styles.itemPrice}>
                    ${((item.price || 0) * (item.numberInCart || 1)).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tiền món</Text>
                <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Thuế</Text>
                <Text style={styles.totalValue}>${order.tax.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Phí giao</Text>
                <Text style={styles.totalValue}>${order.deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.finalTotalRow}>
                <Text style={styles.finalTotalLabel}>Tổng cộng</Text>
                <Text style={styles.finalTotalAmount}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    backgroundColor: "white",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#333" },
  subtitle: { fontSize: 15, color: "#666", marginTop: 6 },
  listContent: { padding: 16 },

  // Card đơn hàng
  orderCard: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f0fff4",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  orderId: { fontSize: 17, fontWeight: "bold", color: "#333" },
  orderTime: { fontSize: 14, color: "#666" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { color: "white", fontWeight: "bold", marginLeft: 6, fontSize: 13 },

  cardBody: {
    flexDirection: "row",
    padding: 16,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  itemCount: { fontSize: 18, fontWeight: "bold", color: "#333" },
  address: { fontSize: 14, color: "#666", marginTop: 4 },
  payment: { fontSize: 14, color: "#10b981", fontWeight: "600", marginTop: 4 },
  priceBox: {
    justifyContent: "center",
  },
  totalPrice: { fontSize: 22, fontWeight: "bold", color: "#ef4444" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  detailText: { color: "#666", fontWeight: "600" },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#999", marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: "#bbb", marginTop: 8, textAlign: "center" },

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: { fontSize: 22, fontWeight: "bold" },
  closeBtn: { padding: 8 },

  infoSection: { padding: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: { fontSize: 16, color: "#666" },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  completedStatus: { color: "#10b981", fontWeight: "bold" },

  itemsSection: { padding: 20, backgroundColor: "#f9fafb" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemName: { fontSize: 16, color: "#333" },
  itemPrice: { fontSize: 16, fontWeight: "600", color: "#ef4444" },

  totalSection: { padding: 20 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalLabel: { fontSize: 16, color: "#666" },
  totalValue: { fontSize: 16, fontWeight: "600" },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 2,
    borderColor: "#eee",
    marginTop: 8,
  },
  finalTotalLabel: { fontSize: 20, fontWeight: "bold" },
  finalTotalAmount: { fontSize: 24, fontWeight: "bold", color: "#ef4444" },
});