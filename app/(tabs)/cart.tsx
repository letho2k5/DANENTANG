// app/(tabs)/cart.tsx – ĐÃ HOÀN CHỈNH 100% (XÓA + TĂNG/GIẢM THEO ID)

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

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!userId) {
      Alert.alert("Thông báo", "Bạn cần đăng nhập để xem giỏ hàng.", [
        { text: "Đăng nhập", onPress: () => router.replace("/(auth)/login") },
        { text: "Hủy", style: "cancel", onPress: () => router.back() },
      ]);
    }
  }, [userId, router]);

  // Tải giỏ hàng từ Firebase
  useEffect(() => {
    async function loadCart() {
      if (!userId) {
        setLoadingCart(false);
        return;
      }

      setLoadingCart(true);
      try {
        const cartRef = ref(db, `users/${userId}/cart`);
        const snap = await get(cartRef);
        const list: Food[] = [];

        snap.forEach((child) => {
          const value: any = child.val();
          if (!value) return;

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
        list.forEach((item) => (selected[item.title] = true));
        setCartItems(list);
        setSelectedItems(selected);

        const total = calculateSelectedTotal(list, selected);
        setSelectedTotal(total);
        setTax(calculateTax(total));
      } catch (e) {
        console.log("Lỗi tải giỏ hàng:", e);
      } finally {
        setLoadingCart(false);
      }
    }

    loadCart();
  }, [userId]);

  // Tính lại tổng khi thay đổi
  function recalcTotals(items: Food[], selected: Record<string, boolean>) {
    const total = calculateSelectedTotal(items, selected);
    setSelectedTotal(total);
    setTax(calculateTax(total));
  }

  // Toggle chọn món
  function toggleSelect(item: Food, checked: boolean) {
    const next = { ...selectedItems, [item.title]: checked };
    setSelectedItems(next);
    recalcTotals(cartItems, next);
  }

  // Cập nhật số lượng (tăng/giảm/xóa) – CHUNG 1 HÀM
  async function updateQuantity(item: Food, newQuantity: number) {
    if (!userId || newQuantity < 0) return;

    try {
      const cartRef = ref(db, `users/${userId}/cart`);
      const snapshot = await get(cartRef);
      let keyToUpdate: string | null = null;

      snapshot.forEach((child) => {
        const data = child.val();
        if (data && data.Id === item.id) {
          keyToUpdate = child.key;
          return true;
        }
      });

      if (!keyToUpdate) return;

      if (newQuantity === 0) {
        // Xóa hoàn toàn khỏi Firebase
        await set(ref(db, `users/${userId}/cart/${keyToUpdate}`), null);
      } else {
        // Cập nhật số lượng
        await update(ref(db, `users/${userId}/cart/${keyToUpdate}`), {
          numberInCart: newQuantity,
        });
      }

      // Cập nhật state local
      if (newQuantity === 0) {
        const nextItems = cartItems.filter((i) => i.id !== item.id);
        setCartItems(nextItems);
        const nextSelected = { ...selectedItems };
        delete nextSelected[item.title];
        setSelectedItems(nextSelected);
        recalcTotals(nextItems, nextSelected);
      } else {
        const nextItems = cartItems.map((i) =>
          i.id === item.id ? { ...i, numberInCart: newQuantity } : i
        );
        setCartItems(nextItems);
        recalcTotals(nextItems, selectedItems);
      }
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      Alert.alert("Lỗi", "Không thể cập nhật giỏ hàng");
    }
  }

  // Tăng số lượng
  function handleIncrease(item: Food) {
    updateQuantity(item, item.numberInCart + 1);
  }

  // Giảm số lượng
  function handleDecrease(item: Food) {
    updateQuantity(item, item.numberInCart - 1);
  }

  // Xóa món (gọi khi nhấn nút thùng rác)
  function handleDelete(item: Food) {
    Alert.alert("Xóa món", `Bạn có chắc muốn xóa "${item.title}" khỏi giỏ hàng?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => updateQuantity(item, 0),
      },
    ]);
  }

  // Đặt hàng
  async function createOrder() {
    if (!userId) return;

    const selectedList = cartItems.filter((it) => selectedItems[it.title]);
    if (selectedList.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một món để đặt hàng.");
      return;
    }

    setPlacingOrder(true);
    try {
      const userRef = ref(db, `users/${userId}`);
      const userSnap = await get(userRef);
      const fullName = userSnap.child("fullName").val() ?? "Khách";

      const orderRef = ref(db, `users/${userId}/orders`);
      const newOrderRef = push(orderRef);

      await set(newOrderRef, {
        id: newOrderRef.key,
        items: selectedList,
        total: selectedTotal,
        tax,
        deliveryFee: DELIVERY_FEE,
        status: "Wait Confirmed",
        userName: fullName,
        address,
        paymentMethod,
        bankPaymentInfo: paymentMethod === "Bank Payment" ? bankPaymentInfo : null,
        createdAt: Date.now(),
      });

      Alert.alert("Thành công!", "Đơn hàng đã được đặt", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể đặt hàng");
    } finally {
      setPlacingOrder(false);
    }
  }

  // Thanh toán bằng ví
  async function handlePayConfirmed(amount: number) {
    if (!userId) return;
    setPlacingOrder(true);
    try {
      const userRef = ref(db, `users/${userId}`);
      const snap = await get(userRef);
      const balance = snap.child("balance").val() ?? 0;
      if (balance < amount) {
        Alert.alert("Lỗi", "Số dư không đủ!");
        setPlacingOrder(false);
        return;
      }
      await update(userRef, { balance: balance - amount });
      await createOrder();
    } catch (e: any) {
      Alert.alert("Lỗi thanh toán", e.message || "Không thể thanh toán");
      setPlacingOrder(false);
    }
  }

  const totalAmount = selectedTotal + tax + DELIVERY_FEE;

  if (!userId || loadingCart) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text style={{ marginTop: 10 }}>Đang tải giỏ hàng...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 28, fontWeight: "300" }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giỏ hàng của bạn</Text>
        <View style={{ width: 40 }} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 18, color: "#999" }}>Giỏ hàng trống</Text>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              <CartSummary itemTotal={selectedTotal} tax={tax} delivery={DELIVERY_FEE} />

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
                  style={[styles.placeOrderButton, placingOrder && { opacity: 0.7 }]}
                  onPress={createOrder}
                  disabled={placingOrder}
                >
                  <Text style={styles.placeOrderText}>
                    {placingOrder ? "Đang xử lý..." : `Đặt hàng • ${totalAmount.toFixed(2)}$`}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  placeOrderButton: {
    margin: 16,
    backgroundColor: "#FF7A00",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  placeOrderText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});