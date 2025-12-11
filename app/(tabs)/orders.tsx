// app/(tabs)/orders.tsx - PHIÊN BẢN HOÀN HẢO, KHÔNG LỖI
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onValue, ref, remove, set, update } from "firebase/database";
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

// Format thời gian đẹp như Grab
const formatOrderTime = (timestamp: any): string => {
  if (!timestamp) return "Vừa xong";

  let date: Date;
  if (typeof timestamp === "number") {
    date = new Date(timestamp);
  } else if (timestamp.toMillis) {
    date = new Date(timestamp.toMillis());
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Trạng thái hiển thị đẹp cho khách hàng
const DISPLAY_STATUS: Record<string, string> = {
  "Wait Confirmed": "Chờ xác nhận",
  Shipping: "Đang giao",
  Delivered: "Đã giao hàng",
  Received: "Đã nhận hàng",
};

export default function OrdersScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const ordersRef = ref(db, `users/${userId}/orders`);
    const unsub = onValue(
      ordersRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((child) => {
          const v = child.val();
          if (!v) return;

          list.push({
            id: child.key!,
            items: v.items || [],
            total: Number(v.total ?? 0),
            tax: Number(v.tax ?? 0),
            deliveryFee: Number(v.deliveryFee ?? 0),
            status: v.status || "Wait Confirmed",
            address: v.address || "",
            paymentMethod: v.paymentMethod || "Cash on Delivery",
            createdAt: v.createdAt || Date.now(),
          });
        });

        // Sắp xếp: mới nhất lên đầu
        list.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        Alert.alert("Lỗi", "Không thể tải đơn hàng");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  const handleConfirmReceived = async (order: Order) => {
    if (order.status !== "Delivered") return;

    const orderRef = ref(db, `users/${userId}/orders/${order.id}`);
    try {
      await update(orderRef, { status: "Received" });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "Received" } : o))
      );
      Alert.alert("Thành công", "Đã xác nhận nhận hàng");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };

  const handleMoveToHistory = async (order: Order) => {
    if (order.status !== "Received") return;

    const orderRef = ref(db, `users/${userId}/orders/${order.id}`);
    const historyRef = ref(db, `users/${userId}/histories/${order.id}`);

    try {
      await set(historyRef, { ...order, movedToHistoryAt: Date.now() });
      await remove(orderRef);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      Alert.alert("Thành công", "Đơn hàng đã được chuyển vào lịch sử");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chuyển đơn");
    }
  };

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.loginText}>Vui lòng đăng nhập để xem đơn hàng</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.loginButtonText}>Đăng nhập ngay</Text>
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
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => setSelectedOrder(item)}
              onConfirmReceived={() => handleConfirmReceived(item)}
              onMoveToHistory={() => handleMoveToHistory(item)}
            />
          )}
        />
      )}

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </View>
  );
}

function OrderCard({
  order,
  onPress,
  onConfirmReceived,
  onMoveToHistory,
}: {
  order: Order;
  onPress: () => void;
  onConfirmReceived: () => void;
  onMoveToHistory: () => void;
}) {
  const firstItem = order.items[0];
  const displayText = DISPLAY_STATUS[order.status] || order.status;
  const isDelivered = order.status === "Delivered";
  const isReceived = order.status === "Received";

  const hasAction = isDelivered || isReceived; // ✅ Có button hành động hay không

  const statusColor =
    isDelivered || isReceived
      ? "#9C27B0"
      : order.status === "Shipping"
      ? "#4ECDC4"
      : "#FFA502";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Đơn #{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={styles.orderTime}>{formatOrderTime(order.createdAt)}</Text>
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
            {order.paymentMethod.includes("Cash") ? "Thanh toán khi nhận" : "Đã thanh toán"}
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>
            ${(order.total + order.tax + order.deliveryFee).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* 🔻 CHỖ NÀY ĐÃ SỬA LOGIC HIỂN THỊ */}
      <View style={styles.cardFooter}>
        {/* Chỉ hiện badge trạng thái khi KHÔNG có button hành động */}
        {!hasAction && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{displayText}</Text>
          </View>
        )}

        {/* Khi Delivered → chỉ hiện nút Đã nhận hàng (không hiện badge bên trái) */}
        {isDelivered && (
          <TouchableOpacity onPress={onConfirmReceived} style={styles.actionBtn}>
            <Text style={styles.actionText}>Đã nhận hàng</Text>
          </TouchableOpacity>
        )}

        {/* Khi Received → chỉ hiện nút Chuyển lịch sử (không hiện badge bên trái) */}
        {isReceived && (
          <TouchableOpacity onPress={onMoveToHistory} style={styles.actionBtn}>
            <Text style={styles.actionText}>Chuyển lịch sử</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}


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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn</Text>
              <Text style={styles.infoValue}>#{order.id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian đặt</Text>
              <Text style={styles.infoValue}>
                {new Date(order.createdAt as number).toLocaleString("vi-VN")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={[styles.infoValue, { color: "#9C27B0", fontWeight: "bold" }]}>
                {DISPLAY_STATUS[order.status] || order.status}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>{order.address || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thanh toán</Text>
              <Text style={styles.infoValue}>
                {order.paymentMethod.includes("Cash") ? "Khi nhận hàng" : "Đã thanh toán"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Danh sách món ăn</Text>
            {order.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {item.title} × {item.numberInCart}
                </Text>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.numberInCart).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loginText: { fontSize: 18, marginBottom: 20, textAlign: "center", color: "#333" },
  loginButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

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

  loadingText: { marginTop: 12, color: "#666", fontSize: 16 },
  emptyText: { fontSize: 18, marginTop: 16, color: "#999" },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 8,
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
  },
  orderId: { fontSize: 16, fontWeight: "bold", color: "#333" },
  orderTime: { fontSize: 14, color: "#666" },

  cardBody: { flexDirection: "row", padding: 16 },
  itemImage: { width: 90, height: 90, borderRadius: 12 },
  infoContainer: { flex: 1, marginLeft: 16, justifyContent: "center" },
  itemCount: { fontSize: 18, fontWeight: "bold", color: "#333" },
  address: { fontSize: 14, color: "#666", marginTop: 4 },
  payment: { fontSize: 14, color: "#45B649", marginTop: 4, fontWeight: "600" },
  priceContainer: { justifyContent: "center" },
  totalPrice: { fontSize: 20, fontWeight: "bold", color: "#FF6B6B" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  statusBadge: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  statusText: { color: "white", fontWeight: "bold", fontSize: 14 },
  actionBtn: {
    backgroundColor: "#9C27B0",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 25,
  },
  actionText: { color: "white", fontWeight: "bold", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "white", width: "92%", borderRadius: 20, maxHeight: "88%", elevation: 10 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  infoLabel: { fontSize: 16, color: "#666" },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  divider: { height: 1, backgroundColor: "#eee", marginHorizontal: 20, marginVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", paddingHorizontal: 20, marginTop: 8, color: "#333" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  itemTitle: { fontSize: 16, color: "#333" },
  itemPrice: { fontSize: 16, fontWeight: "600", color: "#FF6B6B" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 20, backgroundColor: "#f0f8ff", borderRadius: 12, margin: 20, marginTop: 10 },
  totalLabel: { fontSize: 18, fontWeight: "bold" },
  totalAmount: { fontSize: 24, fontWeight: "bold", color: "#FF6B6B" },
});