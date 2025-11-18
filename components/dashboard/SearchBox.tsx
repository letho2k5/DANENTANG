// components/dashboard/SearchBox.tsx
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Food } from "../../models/Food";
import { db } from "../../services/firebase";

export function SearchBox() {
  const [text, setText] = useState("");
  const [products, setProducts] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadFoods() {
      try {
        const foodsRef = ref(db, "Foods");
        const snap = await get(foodsRef);
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
            numberInCart: value.numberInCart ?? 0,
            star: value.Star ?? 0,
            timeValue: value.TimeValue ?? 0,
          });
        });
        setProducts(list);
        setLoading(false);
      } catch (e: any) {
        setError("Failed to load products");
        setLoading(false);
      }
    }
    loadFoods();
  }, []);

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(text.toLowerCase()),
  );

  function handleSelect(item: Food) {
    setFocused(false);
    setText(item.title);
    // giống DetailEachFoodActivity: truyền id (hoặc object nếu muốn)
    router.push({ pathname: "/food/[id]", params: { id: String(item.id) } });
  }

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setFocused(true);
        }}
        placeholder="What do you want to eat?"
        style={styles.input}
        onFocus={() => setFocused(true)}
      />

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
        </View>
      )}

      {error && !loading && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {focused && text.length > 0 && !loading && (
        filtered.length > 0 ? (
          <View style={styles.dropdown}>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id.toString()}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemRow}
                  onPress={() => handleSelect(item)}
                >
                  <Image
                    source={{ uri: item.imagePath }}
                    style={styles.itemImage}
                  />
                  <View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemPrice}>${item.price}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <Text style={styles.noResult}>No products found</Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
  },
  loadingBox: {
    marginTop: 8,
    alignItems: "center",
  },
  errorText: { marginTop: 8, color: "red" },
  dropdown: {
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 4,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: "row",
    padding: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#ccc",
  },
  itemTitle: { fontSize: 14, fontWeight: "500" },
  itemPrice: { fontSize: 12, color: "gray" },
  noResult: { marginTop: 8, color: "gray" },
});
