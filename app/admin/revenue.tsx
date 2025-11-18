// app/admin/revenue.tsx
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type RevenueItem = {
  category: string;
  revenue: number;
};

const mockData: RevenueItem[] = [
  { category: "Pizza", revenue: 300 },
  { category: "Burger", revenue: 200 },
  { category: "Sushi", revenue: 150 },
  { category: "Pasta", revenue: 100 },
];

export default function RevenueScreen() {
  const maxRevenue = Math.max(...mockData.map((c) => c.revenue));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Revenue by Category</Text>

      <View style={styles.chartContainer}>
        {mockData.map((item) => {
          const heightPercent = item.revenue / maxRevenue; // 0..1
          return (
            <View key={item.category} style={styles.barWrapper}>
              <View style={[styles.bar, { height: 200 * heightPercent }]} />
              <Text style={styles.revenueLabel}>${item.revenue}</Text>
              <Text style={styles.categoryLabel}>{item.category}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-evenly",
    width: "100%",
    height: 280,
  },
  barWrapper: {
    alignItems: "center",
  },
  bar: {
    width: 40,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  revenueLabel: {
    fontSize: 12,
    color: "black",
    marginTop: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: "black",
  },
});
