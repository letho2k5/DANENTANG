// app/admin/order-history.tsx
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function AdminOrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(true);
    const usersRef = ref(db, "users");

    const unsub = onValue(
      usersRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((userSnap) => {
          const fullName = (userSnap.child("fullName").val() as string) ?? "Unknown";
          const userId = userSnap.key as string;
          const historiesSnap = userSnap.child("histories");
          historiesSnap.forEach((orderSnap) => {
            const value: any = orderSnap.val();
            if (!value) return;
            const items: any[] = value.items ?? [];
            list.push({
              id: orderSnap.key as string,
              userId,
              userName: fullName,
              status: value.status ?? "",
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
          });
        });
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading order histories:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  function renderCard(order: Order) {
    const firstItem = order.items[0];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedOrder(order)}
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
            <Text>Customer: {order.userName}</Text>
            <Text>Status: {order.status}</Text>
            <Text>Payment: Paid</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Order History</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : orders.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 16 }}>No orders found</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {/* Modal chi tiết */}
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
                <Text>Customer: {selectedOrder.userName}</Text>
                <Text>Address: {selectedOrder.address}</Text>
                <Text>Payment Method: {selectedOrder.paymentMethod}</Text>
                <Text>Payment Status: Paid</Text>
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
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  cardTitle: { fontWeight: "bold", marginBottom: 4 },
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
