// // app/(tabs)/index.tsx
// import React, { useState } from "react";
// import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
// import { BannerCarousel } from "../../components/dashboard/BannerCarousel";
// import { CategorySection } from "../../components/dashboard/CategorySection";
// import { SearchBox } from "../../components/dashboard/SearchBox";
// import { TopBar } from "../../components/dashboard/TopBar";
// import { Sidebar } from "../../components/dashboard/Sidebar"; // IMPORT MỚI
// import { useMainViewModel } from "../../hooks/useMainViewModel";

// export default function HomeScreen() {
//   const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
//   const [isSidebarVisible, setIsSidebarVisible] = useState(false); // STATE MỚI: Quản lý hiển thị Sidebar

//   const {
//     banners,
//     categories,
//     loadingBanner,
//     loadingCategory,
//   } = useMainViewModel({ categoryId: selectedCategoryId ?? "" });

//   return (
//     <View style={styles.container}>
//       <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
//         {/* TRUYỀN HÀM MỞ SIDEBAR XUỐNG TOPBAR */}
//         <TopBar onOpenSidebar={() => setIsSidebarVisible(true)} />

//         {loadingBanner ? (
//           <View style={styles.center}>
//             <ActivityIndicator />
//           </View>
//         ) : (
//           <BannerCarousel banners={banners} />
//         )}

//         <SearchBox />

//         <CategorySection
//           categories={categories}
//           loading={loadingCategory}
//           onSelectCategory={(cat) => setSelectedCategoryId(String(cat.id))}
//         />
//       </ScrollView>

//       {/* COMPONENT SIDEBAR MỚI */}
//       <Sidebar 
//         isVisible={isSidebarVisible} 
//         onClose={() => setIsSidebarVisible(false)} 
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "white" },
//   center: { alignItems: "center", justifyContent: "center", marginTop: 16 },
// });





// app/(tabs)/index.tsx
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { BannerCarousel } from "../../components/dashboard/BannerCarousel";
import { CategorySection } from "../../components/dashboard/CategorySection";
import { SearchBox } from "../../components/dashboard/SearchBox";
import { Sidebar } from "../../components/dashboard/Sidebar";
import { TopBar } from "../../components/dashboard/TopBar";
// 1. IMPORT NÚT CHATBOT (đây là chỗ sửa: thêm import cho FloatingChatButton)
import FloatingChatButton from "../../components/FloatingChatButton";
import { useMainViewModel } from "../../hooks/useMainViewModel";

export default function HomeScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const {
    banners,
    categories,
    loadingBanner,
    loadingCategory,
  } = useMainViewModel({ categoryId: selectedCategoryId ?? "" });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
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

      <Sidebar 
        isVisible={isSidebarVisible} 
        onClose={() => setIsSidebarVisible(false)} 
      />

      {/* 2. ĐẶT NÚT CHATBOT Ở CUỐI CÙNG (Ngoài ScrollView) (đây là chỗ sửa: thêm component FloatingChatButton) */}
      <FloatingChatButton />
    </View>
  );
}

const styles = StyleSheet.create({
  // Quan trọng: phải có flex: 1 (đây là chỗ sửa: đảm bảo container có flex: 1)
  container: { flex: 1, backgroundColor: "white" },
  center: { alignItems: "center", justifyContent: "center", marginTop: 16 },
});