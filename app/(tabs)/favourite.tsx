// app/(tabs)/favourite.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onValue, ref, remove } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Food } from "../../models/Food";
import { auth, db } from "../../services/firebase";

export default function FavouriteScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [selectedTab, setSelectedTab] = useState<"Food Items" | "Restaurants">(
    "Food Items",
  );
  const [favourites, setFavourites] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  // Nếu chưa login → hỏi giống Compose
  useEffect(() => {
    if (!userId) {
      Alert.alert(
        "Login Required",
        "You need to log in to view your favorites list.",
        [
          {
            text: "Log In",
            onPress: () => router.replace("/(auth)/login"),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
        ],
      );
      setLoading(false);
    }
  }, [userId]);

  // Lắng nghe users/{uid}/favourites
  useEffect(() => {
    if (!userId) return;

    const favRef = ref(db, `users/${userId}/favourites`);
    const unsub = onValue(
      favRef,
      (snapshot) => {
        const list: Food[] = [];
        snapshot.forEach((child) => {
          const v: any = child.val();
          if (!v) return;
          list.push({
            id: v.Id,
            title: v.Title,
            price: v.Price,
            imagePath: v.ImagePath,
            description: v.Description ?? "",
            bestFood: v.BestFood ?? false,
            categoryId: v.CategoryId ?? "",
            locationId: v.LocationId ?? 0,
            priceId: v.PriceId ?? 0,
            timeId: v.TimeId ?? 0,
            calorie: v.Calorie ?? 0,
            numberInCart: v.numberInCart ?? 0,
            star: v.Star ?? 0,
            timeValue: v.TimeValue ?? 0,
          });
        });
        setFavourites(list);
        setLoading(false);
      },
      () => {
        Alert.alert("Lỗi", "Failed to load data");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [userId]);

  function renderContent() {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      );
    }

    if (!userId) {
      return null;
    }

    if (selectedTab === "Restaurants") {
      return (
        <View style={styles.center}>
          <Text>Restaurants tab not implemented yet.</Text>
        </View>
      );
    }

    if (favourites.length === 0) {
      return (
        <View style={styles.center}>
          <Text>Your favorites list is empty.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={favourites}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <FavouriteCard
            food={item}
            userId={userId}
            onPress={() =>
              router.push({
                pathname: "/food/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorites</Text>

      {/* Tabs: Food Items / Restaurants */}
      <View style={styles.tabRow}>
        {(["Food Items", "Restaurants"] as const).map((tab) => {
          const isSelected = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                isSelected && styles.tabButtonSelected,
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {renderContent()}
    </View>
  );
}

type FavouriteCardProps = {
  food: Food;
  userId: string;
  onPress: () => void;
};

function FavouriteCard({ food, userId, onPress }: FavouriteCardProps) {
  async function confirmRemove() {
    Alert.alert(
      "Confirm",
      "Do you want to remove this item from your favorites list?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              // Trong bản React, ta lưu favourite tại key = food.id
              const favRef = ref(db, `users/${userId}/favourites/${food.id}`);
              await remove(favRef);
            } catch (e: any) {
              Alert.alert(
                "Error",
                e.message ?? "Error removing item",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ borderRadius: 16, overflow: "hidden" }}>
        <View>
          <Image
            source={{ uri: food.imagePath }}
            style={styles.cardImage}
          />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              ${food.price.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heartButton}
            onPress={confirmRemove}
          >
            <Ionicons name="heart" size={22} color="red" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.foodTitle}>{food.title}</Text>
          <Text
            style={styles.foodDesc}
            numberOfLines={2}
          >
            {food.description}
          </Text>
          <View style={styles.starRow}>
            <Ionicons
              name="star"
              size={14}
              color="#FFD700"
            />
            <Text style={styles.starText}>
              {food.star} (25)
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// === styles ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "bold" },
  tabRow: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#F75C3E",
    borderColor: "#F75C3E",
  },
  tabText: { color: "black" },
  tabTextSelected: { color: "white", fontWeight: "600" },
  card: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: "100%",
    height: 180,
  },
  priceBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#00000099",
  },
  priceText: { color: "white", fontWeight: "bold" },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  cardContent: {
    padding: 16,
  },
  foodTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  foodDesc: {
    marginTop: 4,
    color: "gray",
    fontSize: 13,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  starText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
