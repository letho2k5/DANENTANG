// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import { auth, db } from "../../services/firebase";

export default function TabsLayout() {
  const user = auth.currentUser;
  const userId = user?.uid;

  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const cartRef = ref(db, `users/${userId}/cart`);
    const ordersRef = ref(db, `users/${userId}/orders`);
    const favRef = ref(db, `users/${userId}/favourites`);

    const unsubCart = onValue(cartRef, (snap) => {
      setCartCount(snap.size || snap.childrenCount || snap.numChildren?.() || 0);
    });

    const unsubOrders = onValue(ordersRef, (snap) => {
      setOrderCount(snap.size || snap.childrenCount || snap.numChildren?.() || 0);
    });

    const unsubFav = onValue(favRef, (snap) => {
      setFavCount(snap.size || snap.childrenCount || snap.numChildren?.() || 0);
    });

    return () => {
      unsubCart();
      unsubOrders();
      unsubFav();
    };
  }, [userId]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF7A00",
        tabBarInactiveTintColor: "#777",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="favourite"
        options={{
          title: "Favorite",
          tabBarBadge: favCount > 0 ? favCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Order",
          tabBarBadge: orderCount > 0 ? orderCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
