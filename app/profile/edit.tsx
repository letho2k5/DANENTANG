// app/profile/edit.tsx
import { useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        Alert.alert("Error", "You are not logged in");
        router.replace("/(auth)/login");
        return;
      }

      try {
        const snap = await get(ref(db, `users/${userId}`));
        if (snap.exists()) {
          const v: any = snap.val();
          setFullName(v.fullName ?? "");
          setEmail(v.email ?? "");
          setPhone(v.phone ?? "");
          setGender(v.gender ?? "");
          setBirthDate(v.birthDate ?? "");
        }
      } catch (e) {
        Alert.alert("Error", "Error loading data");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  async function handleSave() {
    if (!userId) return;

    const updatedInfo = {
      fullName,
      email,
      phone,
      gender,
      birthDate,
    };

    try {
      setSaving(true);
      await update(ref(db, `users/${userId}`), updatedInfo);
      Alert.alert("Success", "Update successful!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Error", "Error updating profile!");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>

        <ProfileTextField
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />
        <ProfileTextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <ProfileTextField
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <ProfileTextField
          label="Gender"
          value={gender}
          onChangeText={setGender}
        />
        <ProfileTextField
          label="Date of Birth"
          value={birthDate}
          onChangeText={setBirthDate}
        />

        <TouchableOpacity
          style={[styles.button, { marginTop: 16 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "phone-pad";
};

function ProfileTextField({
  label,
  value,
  onChangeText,
  keyboardType = "default",
}: FieldProps) {
  return (
    <View style={{ width: "100%", marginTop: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#1976D2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  backButton: {
    backgroundColor: "#757575",
    marginBottom: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
