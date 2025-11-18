// components/dashboard/TopBar.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function TopBar() {
  return (
    <View style={styles.container}>
      <TouchableOpacity>
        <Ionicons name="settings-outline" size={20} />
      </TouchableOpacity>

      <View style={{ alignItems: "center" }}>
        <Text style={styles.title}>Kebab Ngon</Text>
        <Text style={styles.subtitle}>Fantastic</Text>
      </View>

      <TouchableOpacity>
        <Ionicons name="chatbubble-ellipses-outline" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "red", fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "black", fontSize: 14 },
});
