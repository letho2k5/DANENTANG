// components/cart/CartSummary.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  itemTotal: number;
  tax: number;
  delivery: number;
};

export function CartSummary({ itemTotal, tax, delivery }: Props) {
  const total = itemTotal + tax + delivery;

  return (
    <View style={styles.container}>
      <Row label="Subtotal:" value={`$${itemTotal.toFixed(2)}`} />
      <Row label="Delivery:" value={`$${delivery.toFixed(2)}`} />
      <Row label="Total Tax:" value={`$${tax.toFixed(2)}`} />

      <View style={styles.separator} />

      <Row
        label="Total:"
        value={`$${total.toFixed(2)}`}
        bold
      />
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.label,
          bold && { fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          bold && { fontWeight: "700" },
        ]}
      >
        {value}
      </Text>
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
  row: {
    width: "100%",
    flexDirection: "row",
    marginTop: 8,
  },
  label: {
    flex: 1,
    color: "#4B0082", // darkPurple
  },
  value: {
    color: "#000",
  },
  separator: {
    marginTop: 16,
    height: 1,
    width: "100%",
    backgroundColor: "gray",
  },
});
