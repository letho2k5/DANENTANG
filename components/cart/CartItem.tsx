// components/cart/CartItem.tsx
import React from "react";
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Food } from "../../models/Food";

type Props = {
  item: Food;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onDelete: () => void;
};

export function CartItem({
  item,
  isChecked,
  onCheckedChange,
  onIncrease,
  onDecrease,
  onDelete,
}: Props) {
  function confirmDelete() {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa món này khỏi giỏ hàng?",
      [
        { text: "Không", style: "cancel" },
        { text: "Có", style: "destructive", onPress: onDelete },
      ],
    );
  }

  return (
    <View style={styles.container}>
      {/* “Checkbox” đơn giản */}
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onCheckedChange(!isChecked)}
      >
        <Text style={{ fontSize: 16 }}>
          {isChecked ? "☑" : "☐"}
        </Text>
      </TouchableOpacity>

      <Image
        source={{ uri: item.imagePath }}
        style={styles.image}
      />

      <View style={{ flex: 1, paddingHorizontal: 8 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.qButton}
            onPress={onDecrease}
          >
            <Text style={styles.qText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.qText}>{item.numberInCart}</Text>

          <TouchableOpacity
            style={styles.qButton}
            onPress={onIncrease}
          >
            <Text style={styles.qText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
      >
        <Text style={{ color: "red", fontSize: 18 }}>✖</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 8,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  checkbox: {
    paddingHorizontal: 8,
  },
  image: {
    width: 100,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#ddd",
  },
  title: { fontSize: 16, fontWeight: "700" },
  price: { marginTop: 2, color: "red", fontWeight: "600" },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  qButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFA500",
    alignItems: "center",
    justifyContent: "center",
  },
  qText: { fontSize: 16, fontWeight: "700", marginHorizontal: 8 },
  deleteButton: {
    paddingHorizontal: 8,
  },
});
