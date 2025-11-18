// components/cart/DeliveryInfoBox.tsx
import { get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../services/firebase";
import type { BankPaymentInfo } from "../../models/BankPaymentInfo";

type Props = {
  onAddressChange: (addr: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onBankPaymentInfoChange: (info: BankPaymentInfo | null) => void;
  totalAmount: number;
  userId: string;
  onPayConfirmed: (amount: number) => void;
};

export function DeliveryInfoBox({
  onAddressChange,
  onPaymentMethodChange,
  onBankPaymentInfoChange,
  totalAmount,
  userId,
  onPayConfirmed,
}: Props) {
  const [address, setAddress] = useState("NY-downtown-no97");
  const [paymentMethod, setPaymentMethod] = useState<"Cash on Delivery" | "Bank Payment">(
    "Cash on Delivery",
  );
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [balance, setBalance] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(false);

  useEffect(() => {
    onAddressChange(address);
  }, [address]);

  useEffect(() => {
    onPaymentMethodChange(paymentMethod);
  }, [paymentMethod]);

  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, `users/${userId}`);
    get(userRef)
      .then((snap) => {
        const bal = (snap.child("balance").val() as number) ?? 0;
        setBalance(bal);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (paymentMethod === "Bank Payment") {
      onBankPaymentInfoChange({
        cardHolderName,
        cardNumber,
      });
    } else {
      onBankPaymentInfoChange(null);
    }
  }, [paymentMethod, cardHolderName, cardNumber]);

  const isPaymentInfoComplete =
    cardHolderName.trim().length > 0 && cardNumber.trim().length > 0;

  function confirmPay() {
    Alert.alert(
      "Xác nhận thanh toán",
      `Bạn có chắc muốn thanh toán số tiền $${totalAmount.toFixed(2)} không?`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Có",
          onPress: () => {
            if (balance < totalAmount) {
              Alert.alert(
                "Lỗi",
                "Số dư tài khoản không đủ để thanh toán!",
              );
            } else {
              onPayConfirmed(totalAmount);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      {/* Address */}
      <Text style={styles.label}>Your Delivery Address</Text>
      <TextInput
        value={address}
        onChangeText={(text) => {
          setAddress(text);
          onAddressChange(text);
        }}
        style={styles.textInput}
      />

      {/* Payment method */}
      <View style={{ marginTop: 16 }}>
        <Text style={styles.label}>Payment Method</Text>

        <View style={styles.paymentRow}>
          {["Cash on Delivery", "Bank Payment"].map((method) => {
            const active = paymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  active && styles.paymentOptionActive,
                ]}
                onPress={() => {
                  setPaymentMethod(method as any);
                  if (method !== "Bank Payment") {
                    setCardHolderName("");
                    setCardNumber("");
                  }
                }}
              >
                <Text
                  style={[
                    styles.paymentOptionText,
                    active && { color: "white" },
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bank Payment form */}
      {paymentMethod === "Bank Payment" && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.label}>Vietcombank Payment Details</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Cardholder Name"
            value={cardHolderName}
            onChangeText={setCardHolderName}
          />

          <TextInput
            style={styles.textInput}
            placeholder="Card Number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="number-pad"
          />

          <View style={styles.balanceRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={
                balanceVisible
                  ? balance.toFixed(0)
                  : "******"
              }
              editable={false}
            />
            <TouchableOpacity
              onPress={() => setBalanceVisible((v) => !v)}
              style={styles.showBalanceButton}
            >
              <Text>
                {balanceVisible ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              !isPaymentInfoComplete && { backgroundColor: "gray" },
            ]}
            onPress={confirmPay}
            disabled={!isPaymentInfoComplete}
          >
            <Text style={styles.payButtonText}>Pay</Text>
          </TouchableOpacity>

          {!isPaymentInfoComplete && (
            <Text style={styles.warnText}>
              Vui lòng điền đầy đủ thông tin thanh toán để tiếp tục.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 8,
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 8,
  },
  label: { fontSize: 14, color: "gray", marginBottom: 4 },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    backgroundColor: "white",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  paymentOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 8,
    alignItems: "center",
    marginHorizontal: 4,
    backgroundColor: "white",
  },
  paymentOptionActive: {
    backgroundColor: "#4B0082",
    borderColor: "#4B0082",
  },
  paymentOptionText: { color: "#333", fontWeight: "600" },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  showBalanceButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
  },
  payButton: {
    marginTop: 12,
    backgroundColor: "#4B0082",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  payButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  warnText: {
    marginTop: 4,
    color: "red",
    fontSize: 12,
  },
});
