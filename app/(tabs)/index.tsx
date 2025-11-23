// app/(tabs)/index.tsx
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { BannerCarousel } from "../../components/dashboard/BannerCarousel";
import { CategorySection } from "../../components/dashboard/CategorySection";
import { SearchBox } from "../../components/dashboard/SearchBox";
import { TopBar } from "../../components/dashboard/TopBar";
import { Sidebar } from "../../components/dashboard/Sidebar"; // IMPORT MỚI
import { useMainViewModel } from "../../hooks/useMainViewModel";

export default function HomeScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // STATE MỚI: Quản lý hiển thị Sidebar

  const {
    banners,
    categories,
    loadingBanner,
    loadingCategory,
  } = useMainViewModel({ categoryId: selectedCategoryId ?? "" });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {/* TRUYỀN HÀM MỞ SIDEBAR XUỐNG TOPBAR */}
        <TopBar onOpenSidebar={() => setIsSidebarVisible(true)} />

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

      {/* COMPONENT SIDEBAR MỚI */}
      <Sidebar 
        isVisible={isSidebarVisible} 
        onClose={() => setIsSidebarVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { alignItems: "center", justifyContent: "center", marginTop: 16 },
});