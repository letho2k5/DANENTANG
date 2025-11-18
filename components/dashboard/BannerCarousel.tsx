// components/dashboard/BannerCarousel.tsx
import React, { useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    View,
} from "react-native";
import type { Banner } from "../../models/Banner";

const { width } = Dimensions.get("window");

type Props = { banners: Banner[] };

export function BannerCarousel({ banners }: Props) {
  const [index, setIndex] = useState(0);
  const onScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    setIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.image }}
            style={styles.banner}
          />
        )}
      />
      <View style={styles.dots}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginTop: 8 },
  banner: {
    width,
    height: 180,
    resizeMode: "cover",
  },
  dots: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#FF7A00",
  },
});
