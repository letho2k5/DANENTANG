// app/(tabs)/cart.tsx
import { useRouter } from "expo-router";
import { get, push, ref, set, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CartItem } from "../../components/cart/CartItem";
import { CartSummary } from "../../components/cart/CartSummary";
import { DeliveryInfoBox } from "../../components/cart/DeliveryInfoBox";
import type { BankPaymentInfo } from "../../models/BankPaymentInfo";
import type { Food } from "../../models/Food";
import { auth, db } from "../../services/firebase";
import { calculateSelectedTotal, calculateTax } from "../../utils/cart";

const DELIVERY_FEE = 10;

export default function CartScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [cartItems, setCartItems] = useState<Food[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [tax, setTax] = useState(0);
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [address, setAddress] = useState("NY-downtown-no97");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [bankPaymentInfo, setBankPaymentInfo] = useState<BankPaymentInfo | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Nếu chưa login → giống AlertDialog bên Kotlin
  useEffect(() => {
    if (!userId) {
      Alert.alert(
        "Thông báo",
        "Bạn cần đăng nhập để xem giỏ hàng.",
        [
          {
            text: "Đăng nhập",
            onPress: () => router.replace("/(auth)/login"),
          },
          {
            text: "Hủy",
            style: "cancel",
            onPress: () => router.back(),
          },
        ],
      );
    }
  }, [userId]);

  // TODO: load giỏ hàng (thay thế ManagmentCart.getListCart)
  useEffect(() => {
    async function loadCart() {
      if (!userId) {
        setLoadingCart(false);
        return;
      }

      setLoadingCart(true);

      try {
        // TODO: thay bằng logic thật của bạn (Firebase / AsyncStorage ...)
        // Ví dụ tạm: đọc ở path "users/{uid}/cart"
        const cartRef = ref(db, `users/${userId}/cart`);
        const snap = await get(cartRef);
        const list: Food[] = [];

        snap.forEach((child) => {
          const value: any = child.val();
          if (!value) return;
          // map theo Food.ts
          list.push({
            id: value.Id,
            title: value.Title,
            price: value.Price,
            imagePath: value.ImagePath,
            description: value.Description ?? "",
            bestFood: value.BestFood ?? false,
            categoryId: value.CategoryId ?? "",
            locationId: value.LocationId ?? 0,
            priceId: value.PriceId ?? 0,
            timeId: value.TimeId ?? 0,
            calorie: value.Calorie ?? 0,
            numberInCart: value.numberInCart ?? 1,
            star: value.Star ?? 0,
            timeValue: value.TimeValue ?? 0,
          });
        });

        const selected: Record<string, boolean> = {};
        list.forEach((item) => {
          selected[item.title] = true;
        });

        setCartItems(list);
        setSelectedItems(selected);
        const total = calculateSelectedTotal(list, selected);
        setSelectedTotal(total);
        setTax(calculateTax(total));
      } catch (e) {
        console.log("Error loading cart:", e);
      } finally {
        setLoadingCart(false);
      }
    }

    loadCart();
  }, [userId]);

  function recalcTotals(nextItems: Food[], nextSelected: Record<string, boolean>) {
    const total = calculateSelectedTotal(nextItems, nextSelected);
    setSelectedTotal(total);
    setTax(calculateTax(total));
  }

  function toggleSelect(item: Food, checked: boolean) {
    const next = { ...selectedItems, [item.title]: checked };
    setSelectedItems(next);
    recalcTotals(cartItems, next);
  }

  function handleIncrease(item: Food) {
    const next = cartItems.map((it) =>
      it.id === item.id
        ? { ...it, numberInCart: it.numberInCart + 1 }
        : it,
    );
    setCartItems(next);
    recalcTotals(next, selectedItems);

    // TODO: cập nhật về cart backend (Firebase / AsyncStorage)
  }

  function handleDecrease(item: Food) {
    const next = cartItems
      .map((it) =>
        it.id === item.id
          ? { ...it, numberInCart: Math.max(0, it.numberInCart - 1) }
          : it,
      )
      .filter((it) => it.numberInCart > 0);
    setCartItems(next);

    const nextSelected: Record<string, boolean> = {};
    next.forEach((it) => {
      nextSelected[it.title] = selectedItems[it.title] ?? true;
    });
    setSelectedItems(nextSelected);
    recalcTotals(next, nextSelected);

    // TODO: cập nhật về cart backend
  }

  function handleDelete(item: Food) {
    const next = cartItems.filter((it) => it.id !== item.id);
    setCartItems(next);

    const nextSelected = { ...selectedItems };
    delete nextSelected[item.title];
    setSelectedItems(nextSelected);
    recalcTotals(next, nextSelected);

    // TODO: xoá khỏi cart backend
  }

  async function createOrder(): Promise<void> {
    if (!userId) return;

    const selectedList = cartItems.filter(
      (it) => selectedItems[it.title] === true,
    );
    if (selectedList.length === 0) {
      Alert.alert("Thông báo", "Bạn chưa chọn món nào để đặt hàng.");
      return;
    }

    setPlacingOrder(true);
    try {
      const userRef = ref(db, `users/${userId}`);
      const userSnap = await get(userRef);
      const fullName =
        (userSnap.child("fullName").val() as string) ?? "Unknown";

      const userOrderRef = ref(db, `users/${userId}/orders`);
      const newOrderRef = push(userOrderRef);
      const orderId = newOrderRef.key;
      if (!orderId) throw new Error("Không tạo được orderId");

      const order = {
        id: orderId,
        items: selectedList,
        total: selectedTotal,
        tax,
        deliveryFee: DELIVERY_FEE,
        status: "Wait Confirmed",
        userId,
        userName: fullName,
        address,
        paymentMethod,
        bankPaymentInfo:
          paymentMethod === "Bank Payment" ? bankPaymentInfo : null,
      };

      await set(newOrderRef, order);
      Alert.alert("Thành công", "Đặt hàng thành công!");
      router.back();
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Lỗi khi đặt hàng!");
    } finally {
      setPlacingOrder(false);
    }
  }

  // Với Bank Payment: DeliveryInfoBox sẽ gọi onPayConfirmed(total), ở đây ta trừ balance và tạo order
  async function handlePayConfirmed(amount: number) {
    if (!userId) return;
    setPlacingOrder(true);
    try {
      const userRef = ref(db, `users/${userId}`);
      const snap = await get(userRef);
      const currentBalance =
        (snap.child("balance").val() as number) ?? 0;
      const newBalance = currentBalance - amount;

      await update(userRef, { balance: newBalance });
      await createOrder();
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Lỗi khi thanh toán!");
      setPlacingOrder(false);
    }
  }

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text>Đang kiểm tra đăng nhập...</Text>
      </View>
    );
  }

  if (loadingCart) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Đang tải giỏ hàng...</Text>
      </View>
    );
  }

  const totalAmount = selectedTotal + tax + DELIVERY_FEE;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 18 }}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <Text>Cart Is Empty</Text>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id.toString()}
          ListFooterComponent={
            <>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <CartSummary
                itemTotal={selectedTotal}
                tax={tax}
                delivery={DELIVERY_FEE}
              />

              <Text style={styles.sectionTitle}>Information</Text>
              <DeliveryInfoBox
                onAddressChange={setAddress}
                onPaymentMethodChange={setPaymentMethod}
                onBankPaymentInfoChange={setBankPaymentInfo}
                totalAmount={totalAmount}
                userId={userId}
                onPayConfirmed={handlePayConfirmed}
              />

              {paymentMethod !== "Bank Payment" && (
                <TouchableOpacity
                  style={styles.placeOrderButton}
                  onPress={createOrder}
                  disabled={placingOrder}
                >
                  <Text style={styles.placeOrderText}>
                    {placingOrder ? "Processing..." : "Place Order"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          }
          renderItem={({ item }) => (
            <CartItem
              item={item}
              isChecked={selectedItems[item.title] ?? true}
              onCheckedChange={(checked) => toggleSelect(item, checked)}
              onIncrease={() => handleIncrease(item)}
              onDecrease={() => handleDecrease(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#4B0082",
  },
  placeOrderButton: {
    marginTop: 16,
    backgroundColor: "#4B0082",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  placeOrderText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
