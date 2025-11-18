// components/dashboard/CategorySection.tsx
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Category } from "../../models/Category";

type Props = {
  categories: Category[];
  loading: boolean;
  onSelectCategory?: (cat: Category) => void;
};

const ITEM_PER_ROW = 3;
const screenWidth = Dimensions.get("window").width;
const cardWidth = (screenWidth - 16 * 2 - 8 * 2) / ITEM_PER_ROW;

export function CategorySection({ categories, loading, onSelectCategory }: Props) {
  const router = useRouter();

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // chunk 3 item / row
  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += ITEM_PER_ROW) {
    rows.push(categories.slice(i, i + ITEM_PER_ROW));
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={styles.title}>Choose Category</Text>

      {rows.map((row, rowIndex) => (
        <View style={styles.row} key={rowIndex}>
          {row.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.card, { width: cardWidth }]}
              onPress={() => {
                onSelectCategory?.(cat);
                // giống ItemsListActivity: id + title
                router.push({
                  pathname: "/items-list",
                  params: { id: String(cat.id), title: cat.name },
                });
              }}
            >
              <Image
                source={{ uri: cat.imagePath }}
                style={styles.image}
              />
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FEE4C4", // lightOrange
    borderRadius: 13,
    paddingVertical: 8,
    alignItems: "center",
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginBottom: 8,
  },
  catName: {
    color: "#4B0082",
    fontWeight: "bold",
    fontSize: 14,
  },
});
