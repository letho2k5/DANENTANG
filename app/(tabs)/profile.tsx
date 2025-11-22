// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { UserProfile } from "../../models/UserProfile";
import { auth, db } from "../../services/firebase";

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const snap = await get(ref(db, `users/${userId}`));
        if (snap.exists()) {
          const v = snap.val();
          const p: UserProfile = {
            uid: v.uid ?? userId,
            fullName: v.fullName ?? "",
            email: v.email ?? "",
            phone: v.phone ?? "",
            address: v.address ?? "",
            birthDate: v.birthDate ?? "",
            gender: v.gender ?? "",
            balance: v.balance ?? 0,
          };
          setProfile(p);
        }
      } catch (e) {
        console.log(e);
        Alert.alert("Error", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  async function handleLogout() {
    try {
      // TODO: nếu bạn có dùng AsyncStorage lưu "UserPrefs" thì clear ở đây
      await auth.signOut();
      router.replace("/(auth)/login");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Logout failed");
    }
  }

  if (!userId) {
    // tương đương AlertDialog trong ProfileScreen khi uid == null :contentReference[oaicite:4]{index=4}
    return (
      <View style={styles.center}>
        <Text style={styles.noticeTitle}>Notice</Text>
        <Text style={{ marginTop: 8, textAlign: "center" }}>
          You need to log in to view your profile.
        </Text>

        <TouchableOpacity
          style={[styles.btn, { marginTop: 16 }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.btnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "gray" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Avatar + tên + email */}
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          <Ionicons
            name="person-circle"
            size={90}
            color="#90CAF9"
          />
        </View>

        <Text style={styles.nameText}>
          {profile?.fullName || "Username"}
        </Text>
        <Text style={styles.emailText}>
          {profile?.email || "Email"}
        </Text>

        <View style={styles.infoSection}>
          <InfoLine label="Phone Number" value={profile?.phone} />
          <InfoLine label="Gender" value={profile?.gender} />
          <InfoLine label="Date of Birth" value={profile?.birthDate} />
          <InfoLine label="Address" value={profile?.address} />
          <InfoLine
            label="Balance"
            value={
              profile
                ? profile.balance.toLocaleString("en-US")
                : undefined
            }
          />
        </View>
      </View>

      {/* Edit Profile */}
      <TouchableOpacity
        style={[styles.btn, { marginTop: 16 }]}
        onPress={() => router.push("/profile/edit")}
      >
        <Ionicons
          name="create-outline"
          size={20}
          color="white"
        />
        <Text style={[styles.btnText, { marginLeft: 8 }]}>
          Edit Profile
        </Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.btn, styles.logoutBtn]}
        onPress={() =>
          Alert.alert(
            "Confirm Logout",
            "Are you sure you want to log out?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Log Out", style: "destructive", onPress: handleLogout },
            ],
          )
        }
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="white"
        />
        <Text style={[styles.btnText, { marginLeft: 8 }]}>
          Log Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <Text style={styles.infoLine}>
      {label}: {value && value.length > 0 ? value : "-"}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: "#E3F2FD",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    alignItems: "center",
  },
  avatarBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  nameText: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "bold",
    color: "#0D47A1",
  },
  emailText: {
    fontSize: 16,
    color: "gray",
    marginTop: 4,
  },
  infoSection: {
    marginTop: 16,
    alignSelf: "stretch",
  },
  infoLine: {
    fontSize: 16,
    color: "#424242",
    marginVertical: 2,
  },
  btn: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1976D2",
    borderRadius: 16,
    height: 50,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: "#E53935",
  },
});
