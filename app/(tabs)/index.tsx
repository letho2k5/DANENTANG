// app/(tabs)/index.tsx
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { BannerCarousel } from "../../components/dashboard/BannerCarousel";
import { CategorySection } from "../../components/dashboard/CategorySection";
import { SearchBox } from "../../components/dashboard/SearchBox";
import { TopBar } from "../../components/dashboard/TopBar";
import { useMainViewModel } from "../../hooks/useMainViewModel";

export default function HomeScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  const {
    banners,
    categories,
    loadingBanner,
    loadingCategory,
  } = useMainViewModel({ categoryId: selectedCategoryId ?? "" });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <TopBar />

      {loadingBanner ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <BannerCarousel banners={banners} />
      )}

      <SearchBox />

      <CategorySection
        categories={categories}
        loading={loadingCategory}
        onSelectCategory={(cat) => setSelectedCategoryId(String(cat.id))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { alignItems: "center", justifyContent: "center", marginTop: 16 },
});
