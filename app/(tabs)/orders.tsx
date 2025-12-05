// app/(tabs)/orders.tsx
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
          });
        });
        setOrders(list);
        setLoading(false);
      },
      () => {
        Alert.alert("Error", "Failed to load orders");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [userId]);

  function handleMoveToHistory(order: Order) {
    if (!userId) return;

    if (order.status !== "Received") {
      Alert.alert(
        "Notice",
        "Can only move to history when status is 'Received'",
      );
      return;
    }

    const orderRef = ref(db, `users/${userId}/orders/${order.id}`);
    const historyRef = ref(db, `users/${userId}/histories/${order.id}`);

    set(historyRef, order)
      .then(() => remove(orderRef))
      .then(() => {
        Alert.alert("Success", "Order moved to history");
      })
      .catch(() => {
        Alert.alert("Error", "Error moving to history");
      });
  }

  if (showLoginDialog) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>
          Please log in to view your orders.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Log In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "gray" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => router.push("/history")}>
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text>No orders found.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => setSelectedOrder(item)}
              onStatusPress={() => handleMoveToHistory(item)}
            />
          )}
        />
      )}

      {/* Dialog chi tiết đơn */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

type CardProps = {
  order: Order;
  onPress: () => void;
  onStatusPress: () => void;
};

function OrderCard({ order, onPress, onStatusPress }: CardProps) {
  const firstItem = order.items[0];

  const statusColor =
    order.status === "Shipping"
      ? "#FFC107"
      : order.status === "Received"
      ? "#F44336"
      : "gray";

  const paymentLabel =
    order.paymentMethod === "Cash on Delivery"
      ? "Not Paid"
      : order.paymentMethod === "Bank Payment"
      ? "Paid"
      : "Unknown";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.cardRow}>
        {firstItem ? (
          <Image
            source={{ uri: firstItem.imagePath }}
            style={styles.cardImage}
          />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: "#ddd" }]} />
        )}

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.cardTitle}>
            {order.items.length} items • #{order.id}
          </Text>
          <Text style={styles.cardText}>Estimated Arrival: Now</Text>
          <Text style={styles.cardText}>Status: {order.status}</Text>
          <Text style={styles.cardText}>Payment: {paymentLabel}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: statusColor }]}
          onPress={onStatusPress}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            {order.status || "No Status"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const paymentStatus =
    order.paymentMethod === "Cash on Delivery"
      ? "Not Paid"
      : order.paymentMethod === "Bank Payment"
      ? "Paid"
      : "Unknown";

  const total =
    (order.total || 0) +
    (order.tax || 0) +
    (order.deliveryFee || 0);

  return (
    <Modal
      visible={!!order}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Order Details #{order.id}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 450 }}>
            <Text style={styles.modalSectionTitle}>
              Order Information
            </Text>
            <Text>Address: {order.address}</Text>
            <Text>Payment Method: {order.paymentMethod}</Text>
            <Text>Payment Status: {paymentStatus}</Text>
            <Text>Subtotal: ${order.total.toFixed(2)}</Text>
            <Text>Tax: ${order.tax.toFixed(2)}</Text>
            <Text>Delivery Fee: ${order.deliveryFee.toFixed(2)}</Text>
            <Text>Total: ${total.toFixed(2)}</Text>

            <View style={{ height: 16 }} />

            <Text style={styles.modalSectionTitle}>Products</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={{ marginTop: 8 }}>
                <Text>Name: {item.title}</Text>
                <Text>Quantity: {item.numberInCart}</Text>
                <Text>Price: ${item.price}</Text>
                <Text>
                  Total: ${(item.price * item.numberInCart).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4B0082",
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  historyText: {
    color: "#4B0082",
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    backgroundColor: "white",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardText: { fontSize: 13, marginTop: 2 },
  cardFooter: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
});
