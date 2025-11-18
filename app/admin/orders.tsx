// app/admin/orders.tsx
import { useRouter } from "expo-router";
import { onValue, ref, remove, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
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
import { db } from "../../services/firebase";

const FILTERS = ["", "Wait Confirmed", "Shipping", "Received"];

export default function AdminOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("Wait Confirmed");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    // tương đương usersRef.addListenerForSingleValueEvent trong Kotlin :contentReference[oaicite:6]{index=6}
    const usersRef = ref(db, "users");
    const unsub = onValue(
      usersRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((userSnap) => {
          const fullName = (userSnap.child("fullName").val() as string) ?? "Unknown";
          const userId = userSnap.key as string;
          const ordersSnap = userSnap.child("orders");
          ordersSnap.forEach((orderSnap) => {
            const value: any = orderSnap.val();
            if (!value) return;
            const status = value.status ?? "";
            if (selectedFilter === "" || status === selectedFilter) {
              const items: any[] = value.items ?? [];
              list.push({
                id: orderSnap.key as string,
                userId,
                userName: fullName,
                status,
                total: value.total ?? 0,
                tax: value.tax ?? 0,
                deliveryFee: value.deliveryFee ?? 0,
                address: value.address,
                paymentMethod: value.paymentMethod,
                items: items.map((it) => ({
                  Title: it.Title,
                  Price: it.Price,
                  numberInCart: it.numberInCart,
                  ImagePath: it.ImagePath,
                })),
              });
            }
          });
        });
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading orders:", error);
        Alert.alert("Lỗi", "Không tải được danh sách đơn");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [selectedFilter]);

  function getNextStatus(status: string): string | null {
    if (status === "Wait Confirmed") return "Shipping";
    if (status === "Shipping") return "Received";
    if (status === "Received") return "Completed"; // để logic riêng cho xoá
    return null;
  }

  async function handleAdvanceStatus(order: Order) {
    const next = getNextStatus(order.status);
    if (!next) {
      Alert.alert("Thông báo", "Trạng thái không hợp lệ để cập nhật");
      return;
    }

    setUpdating(true);
    try {
      const orderRef = ref(db, `users/${order.userId}/orders/${order.id}`);

      if (next === "Completed") {
        // giống Kotlin: khi từ Received → xoá order khỏi "orders" :contentReference[oaicite:7]{index=7}
        await remove(orderRef);
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        Alert.alert("Thành công", "Đơn đã hoàn tất và xoá khỏi danh sách");
      } else {
        await update(orderRef, { status: next });
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
        );
        Alert.alert("Thành công", `Cập nhật trạng thái: ${next}`);
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Cập nhật đơn thất bại");
    } finally {
      setUpdating(false);
    }
  }

  function renderOrderCard(order: Order) {
    const firstItem = order.items[0];
    const statusButtonText =
      order.status === "Wait Confirmed"
        ? "Confirmed"
        : order.status === "Shipping"
        ? "Shipped"
        : order.status === "Received"
        ? "Completed"
        : "Update";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedOrder(order)} // 1 tap mở dialog chi tiết
      >
        <View style={styles.cardRow}>
          <Image
            source={{ uri: firstItem?.ImagePath || "" }}
            style={styles.cardImage}
          />
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <Text style={styles.cardTitle}>
              {order.items.length} items • #{order.id}
            </Text>
            <Text>Ordered by: {order.userName}</Text>
            <Text>Status: {order.status}</Text>
            <Text>
              Payment:{" "}
              {order.paymentMethod === "Cash on Delivery"
                ? "Not paid"
                : order.paymentMethod === "Bank Payment"
                ? "Paid"
                : "Unknown"}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 8, alignItems: "flex-end" }}>
          <TouchableOpacity
            style={styles.statusButton}
            onPress={() => handleAdvanceStatus(order)}
            disabled={updating}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {updating ? "..." : statusButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header + nút History */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>All Orders</Text>
        <Text
          style={styles.historyText}
          onPress={() => router.push("/admin/order-history")}
        >
          History
        </Text>
      </View>

      {/* Filter buttons */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter || "all"}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonSelected,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextSelected,
              ]}
            >
              {filter === "" ? "All" : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List orders */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : orders.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 16 }}>No orders found</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderOrderCard(item)}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {/* Modal chi tiết đơn */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView>
                <Text style={styles.modalTitle}>
                  Order Details #{selectedOrder.id}
                </Text>

                <Text style={styles.modalSectionTitle}>Order Information</Text>
                <Text>Ordered by: {selectedOrder.userName}</Text>
                <Text>Address: {selectedOrder.address}</Text>
                <Text>Payment Method: {selectedOrder.paymentMethod}</Text>
                <Text>
                  Payment Status:{" "}
                  {selectedOrder.paymentMethod === "Cash on Delivery"
                    ? "Not paid"
                    : selectedOrder.paymentMethod === "Bank Payment"
                    ? "Paid"
                    : "Unknown"}
                </Text>
                <Text>Subtotal: ${selectedOrder.total ?? 0}</Text>
                <Text>Tax: ${selectedOrder.tax ?? 0}</Text>
                <Text>Delivery Fee: ${selectedOrder.deliveryFee ?? 0}</Text>
                <Text>
                  Total: $
                  {(selectedOrder.total ?? 0) +
                    (selectedOrder.tax ?? 0) +
                    (selectedOrder.deliveryFee ?? 0)}
                </Text>

                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>
                  Products
                </Text>
                {selectedOrder.items.map((item, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <Text>Name: {item.Title}</Text>
                    <Text>Quantity: {item.numberInCart}</Text>
                    <Text>Price: ${item.Price}</Text>
                    <Text>Total: ${item.Price * item.numberInCart}</Text>
                  </View>
                ))}

                <View style={{ marginTop: 16 }}>
                  <Button title="Close" onPress={() => setSelectedOrder(null)} />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  historyText: { color: "#007AFF", fontWeight: "500" },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ccc",
  },
  filterButtonSelected: {
    backgroundColor: "#4CAF50",
  },
  filterText: { fontSize: 12, color: "white" },
  filterTextSelected: { fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  cardTitle: { fontWeight: "bold", marginBottom: 4 },
  statusButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000077",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  modalSectionTitle: { fontWeight: "bold", marginTop: 8 },
});
