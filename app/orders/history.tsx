// app/orders/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
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

export default function OrderHistoryScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userId) {
      Alert.alert("You are not logged in");
      setLoading(false);
      return;
    }

    const historyRef = ref(db, `users/${userId}/histories`);
    const unsub = onValue(
      historyRef,
      (snap) => {
        const list: Order[] = [];
        snap.forEach((child) => {
          const v: any = child.val();
          if (!v) return;
          list.push({
            id: child.key || "",
            items: v.items || [],
            total: v.total ?? 0,
            tax: v.tax ?? 0,
            deliveryFee: v.deliveryFee ?? 0,
            status: v.status ?? "",
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
        Alert.alert("Error loading order history");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [userId]);

  const paymentStatus = "Paid"; // history luôn coi là đã thanh toán

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text>No orders in history.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedOrder(item)}
            >
              <View style={styles.cardRow}>
                {item.items[0] ? (
                  <Image
                    source={{ uri: item.items[0].imagePath }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.cardImage,
                      { backgroundColor: "#ddd" },
                    ]}
                  />
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.cardTitle}>
                    {item.items.length} items • #{item.id}
                  </Text>
                  <Text style={styles.cardText}>
                    Estimated Arrival: Delivered
                  </Text>
                  <Text style={styles.cardText}>
                    Status: {item.status}
                  </Text>
                  <Text style={styles.cardText}>
                    Payment: {paymentStatus}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <HistoryDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

function HistoryDetailModal({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

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
            <Text>Payment Status: Paid</Text>
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
                  Total: {(item.price * item.numberInCart).toFixed(2)}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    width: 120,
    height: 120,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "gray",
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardText: { fontSize: 13, marginTop: 2 },
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
