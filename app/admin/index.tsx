// app/admin/index.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type ActionCardProps = {
  title: string;
  onPress: () => void;
};

function ActionCard({ title, onPress }: ActionCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Ở đây bạn có thể thêm Icon sau, mình chỉ để chữ cho đơn giản */}
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function BannerSection() {
  return (
    <View style={styles.banner}>
      <View>
        <Text style={styles.bannerTitle}>First order 30% off</Text>
        <Text style={styles.bannerText}>Free delivery</Text>
        <Text style={styles.bannerText}>Start your pizza journey</Text>
      </View>
      <TouchableOpacity style={styles.bannerButton}>
        <Text style={styles.bannerButtonText}>Order Now</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);

  function handleLogout() {
    Alert.alert("Logout", "Do you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          setLogoutLoading(true);
          // TODO: clear auth / AsyncStorage nếu bạn có lưu token
          router.replace("/(auth)/login"); // điều hướng về màn Login
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.appTitle}>Kebab Ngon</Text>
        <TouchableOpacity onPress={handleLogout} disabled={logoutLoading}>
          <Text style={styles.logoutText}>{logoutLoading ? "..." : "Logout"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Fast Order - Big Flavor - Kebab Ngon NOW!
      </Text>

      {/* Banner */}
      <BannerSection />

      {/* Grid 4 nút chức năng */}
      <View style={styles.grid}>
        <ActionCard
          title="Category"
          onPress={() => router.push("/admin/categories")}
        />
        <ActionCard
          title="Order"
          onPress={() => router.push("/admin/orders")}
        />
        <ActionCard
          title="Revenue"
          onPress={() => router.push("/admin/revenue")}
        />
        <ActionCard
          title="Account"
          onPress={() => router.push("/admin/users")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
  },
  logoutText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "gray",
    marginBottom: 16,
  },
  banner: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#F5E8C7",
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
    color: "black",
  },
  bannerButton: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
  },
  card: {
    width: "48%",
    height: 100,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
});
