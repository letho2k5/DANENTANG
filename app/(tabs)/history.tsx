// app/(tabs)/history.tsx – ĐỌC TỪ histories, HIỂN THỊ ĐÚNG 100%
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Order } from "../../models/Order";
import { auth, db } from "../../services/firebase";

export default function HistoryScreen() {
  const router = useRouter();
  const userId = auth.currentUser?.uid ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // ĐỌC TỪ histories THAY VÌ orders
      const snap = await get(ref(db, `users/${userId}/histories`));
      const list: Order[] = [];

      snap.forEach((child) => {
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
            userName: val.userName || "",
            bankPaymentInfo: val.bankPaymentInfo || null,
          });
        }
      });

      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tải lịch sử đơn hàng");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderOrder = ({ item }: { item: Order }) => {
    const total = item.total + item.tax + item.deliveryFee;
    const itemsText = item.items.map((i: any) => i.title).join(", ");

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelectedOrder(item)}
      >
        <View style={styles.header}>
          <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Đã nhận hàng</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(item.createdAt || Date.now())}</Text>
        <Text style={styles.address}>Giao đến: {item.address || "—"}</Text>
        <Text style={styles.items} numberOfLines={2}>
          {itemsText || "Không có món"}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.total}>${total.toFixed(2)}</Text>
          <Text style={styles.detailHint}>Bấm để xem chi tiết</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Lịch sử đơn hàng</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00BCD4" style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>Chưa có đơn hàng nào trong lịch sử</Text>
          <Text style={styles.emptySub}>
            Các đơn đã nhận sẽ được chuyển vào đây
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </View>
  );
}

// Modal chi tiết đơn hàng – giữ nguyên đẹp như cũ
function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const total = Number(order.total || 0) + Number(order.tax || 0) + Number(order.deliveryFee || 10);

  return (
    <Modal visible={!!order} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Đơn hàng #{order.id.slice(-8).toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
              <Text style={styles.info}>Mã đơn: #{order.id}</Text>
              <Text style={styles.info}>
                Ngày đặt: {new Date(order.createdAt || Date.now()).toLocaleString("vi-VN")}
              </Text>
              <Text style={styles.info}>Trạng thái: <Text style={{ color: "#4CAF50", fontWeight: "bold" }}>Đã nhận hàng</Text></Text>
              <Text style={styles.info}>Địa chỉ: {order.address || "—"}</Text>
              <Text style={styles.info}>Phương thức thanh toán: {order.paymentMethod}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
              <View style={styles.row}>
                <Text>Tiền món</Text>
                <Text>${Number(order.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text>Thuế</Text>
                <Text>${Number(order.tax || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text>Phí giao</Text>
                <Text>${Number(order.deliveryFee || 10).toFixed(2)}</Text>
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sản phẩm</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemCard}>
                  <Text style={styles.itemName}>• {item.title || "Món ăn"}</Text>
                  <Text style={styles.itemDetail}>
                    {item.numberInCart || 1} × ${Number(item.price || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerBar: {
    backgroundColor: "white",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#212121" },

  orderCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 17, fontWeight: "bold" },
  statusBadge: { backgroundColor: "#4CAF50", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: "white", fontSize: 13, fontWeight: "bold" },
  date: { marginTop: 8, fontSize: 14, color: "#757575" },
  address: { marginTop: 6, fontSize: 14, color: "#555", fontStyle: "italic" },
  items: { marginTop: 10, fontSize: 15, color: "#444" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  total: { fontSize: 20, fontWeight: "bold", color: "#00BCD4" },
  detailHint: { color: "#666", fontSize: 14, fontStyle: "italic" },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 18, color: "#757575", marginTop: 16, textAlign: "center" },
  emptySub: { fontSize: 15, color: "#757575", marginTop: 8, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 21, fontWeight: "bold", color: "#212121" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#00BCD4" },
  info: { fontSize: 16, marginBottom: 8, color: "#333" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: "#eee" },
  totalLabel: { fontSize: 18, fontWeight: "bold" },
  totalAmount: { fontSize: 21, fontWeight: "bold", color: "#00BCD4" },
  itemCard: { marginLeft: 8, marginBottom: 12 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#212121" },
  itemDetail: { fontSize: 15, color: "#757575", marginLeft: 12 },
});