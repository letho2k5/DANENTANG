// app/admin/order-history.tsx – LỊCH SỬ ĐƠN HÀNG ADMIN SIÊU ĐẸP & PRO
import { Ionicons } from "@expo/vector-icons";
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
import { db } from "../../services/firebase";

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

export default function AdminOrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(true);
    const usersRef = ref(db, "users");

    const unsub = onValue(usersRef, (snapshot) => {
      const list: Order[] = [];

      snapshot.forEach((userSnap) => {
        const fullName = (userSnap.child("fullName").val() as string) || "Khách vãng lai";
        const userId = userSnap.key!;
        const historiesSnap = userSnap.child("histories");

        historiesSnap.forEach((orderSnap) => {
          const val: any = orderSnap.val();
          if (!val) return;

          list.push({
            id: orderSnap.key!,
            userId,
            userName: fullName,
            status: val.status || "Received",
            total: Number(val.total || 0),
            tax: Number(val.tax || 0),
            deliveryFee: Number(val.deliveryFee || 10),
            address: val.address || "",
            paymentMethod: val.paymentMethod || "Tiền mặt",
            createdAt: val.createdAt || Date.now(),
            items: (val.items || []).map((it: any) => ({
              title: it.Title || it.title,
              price: it.Price || it.price,
              numberInCart: it.numberInCart || 1,
              imagePath: it.ImagePath || it.imagePath,
            })),
          });
        });
      });

      // Sắp xếp mới nhất lên đầu
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
            <Text style={styles.customerName}>{item.userName}</Text>
            <Text style={styles.orderTime}>{formatTime(item.createdAt || Date.now())}</Text>
          </View>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-done" size={22} color="white" />
            <Text style={styles.completedText}>Hoàn thành</Text>
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
        <Text style={styles.pageTitle}>Lịch sử đơn hàng</Text>
        <Text style={styles.subtitle}>Tất cả đơn đã hoàn thành</Text>
      </View>

      {/* Loading & Empty State */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={90} color="#ddd" />
          <Text style={styles.emptyTitle}>Chưa có đơn hoàn thành</Text>
          <Text style={styles.emptySubtitle}>
            Các đơn hàng đã giao thành công sẽ hiện ở đây
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal chi tiết */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết đơn hàng hoàn thành</Text>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <Ionicons name="close" size={28} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mã đơn</Text>
                    <Text style={styles.infoValue}>#{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Khách hàng</Text>
                    <Text style={styles.infoValue}>{selectedOrder.userName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thời gian hoàn thành</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedOrder.createdAt || Date.now()).toLocaleString("vi-VN")}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Địa chỉ giao</Text>
                    <Text style={styles.infoValue}>{selectedOrder.address || "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thanh toán</Text>
                    <Text style={styles.infoValue}>
                      {selectedOrder.paymentMethod === "Cash on Delivery" ? "Tiền mặt khi nhận" : "Chuyển khoản"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Sản phẩm đã giao</Text>
                {selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={styles.productRow}>
                    <Text style={styles.productName}>
                      • {item.title} × {item.numberInCart || 1}
                    </Text>
                    <Text style={styles.productPrice}>
                      ${((item.price || 0) * (item.numberInCart || 1)).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.summary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tiền món</Text>
                    <Text style={styles.summaryValue}>${selectedOrder.total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Thuế</Text>
                    <Text style={styles.summaryValue}>${selectedOrder.tax.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phí giao</Text>
                    <Text style={styles.summaryValue}>${selectedOrder.deliveryFee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.finalTotalRow}>
                    <Text style={styles.finalTotalLabel}>Tổng doanh thu</Text>
                    <Text style={styles.finalTotalAmount}>
                      ${(selectedOrder.total + selectedOrder.tax + selectedOrder.deliveryFee).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    backgroundColor: "white",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  pageTitle: { fontSize: 26, fontWeight: "bold", color: "#333" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 6 },

  list: { padding: 16 },

  // Order Card
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
    backgroundColor: "#ecfdf5",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  orderId: { fontSize: 17, fontWeight: "bold", color: "#333" },
  customerName: { fontSize: 15, color: "#10b981", fontWeight: "600", marginTop: 4 },
  orderTime: { fontSize: 14, color: "#666", marginTop: 4 },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completedText: { color: "white", fontWeight: "bold", marginLeft: 8, fontSize: 14 },

  cardBody: {
    flexDirection: "row",
    padding: 16,
  },
  foodImage: {
    width: 88,
    height: 88,
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
  priceBox: { justifyContent: "center" },
  totalPrice: { fontSize: 22, fontWeight: "bold", color: "#22c55e" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  detailText: { color: "#666", fontWeight: "600" },

  // Empty & Loading
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
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
    paddingBottom: 20,
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

  infoSection: { paddingHorizontal: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoLabel: { fontSize: 15, color: "#666" },
  infoValue: { fontSize: 17, fontWeight: "600", color: "#333" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 20, marginHorizontal: 20 },

  sectionTitle: { fontSize: 18, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 12 },

  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  productName: { fontSize: 16, color: "#333" },
  productPrice: { fontSize: 16, fontWeight: "600", color: "#22c55e" },

  summary: { padding: 20, backgroundColor: "#f0fdf4", borderRadius: 16, margin: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { fontSize: 16, color: "#666" },
  summaryValue: { fontSize: 16, fontWeight: "600" },
  finalTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 16, borderTopWidth: 2, borderColor: "#bbf7d0" },
  finalTotalLabel: { fontSize: 20, fontWeight: "bold" },
  finalTotalAmount: { fontSize: 26, fontWeight: "bold", color: "#22c55e" },
});