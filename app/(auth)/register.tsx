// app/(auth)/register.tsx
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import React, { useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState(""); // bạn có thể làm DatePicker sau
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !birthDate.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Lỗi", "Please fill in all information");
      return false;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Lỗi", "Invalid email");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Lỗi", "Password must be at least 6 characters");
      return false;
    }

    if (phone.trim().length < 10) {
      Alert.alert("Lỗi", "Phone number must have at least 10 digits");
      return false;
    }

    return true;
  }

  async function onRegister() {
    if (!validate()) return;

    Alert.alert(
      "Agree to Share Data",
      "We will store your information on Firebase to provide the service. This information may be used to personalize the user experience. Do you agree?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Agree",
          onPress: async () => {
            try {
              setLoading(true);
              // check email đã dùng chưa (fetchSignInMethodsForEmail) :contentReference[oaicite:3]{index=3}
              const result = await fetchSignInMethodsForEmail(
                auth,
                email.trim(),
              );
              if (result.length > 0) {
                Alert.alert(
                  "Lỗi",
                  "Email is already in use. Please choose a different email.",
                );
                setLoading(false);
                return;
              }

              const cred = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password,
              );

              const uid = cred.user.uid;
              const userProfile = {
                uid,
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim(),
                birthDate: birthDate.trim(),
                gender,
                balance: 1000000.0,
                role: "user", // thêm mặc định role user
              };

              await set(ref(db, `users/${uid}`), userProfile);

              Alert.alert("Thành công", "Registration successful", [
                {
                  text: "OK",
                  onPress: () =>
                    router.replace("/(auth)/login"), // về màn login
                },
              ]);
            } catch (e: any) {
              Alert.alert("Lỗi", e.message ?? "Registration failed");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Register</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        keyboardType="phone-pad"
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Date of Birth (dd/MM/yyyy)"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      {/* Gender simple buttons */}
      <View style={styles.genderRow}>
        {["Male", "Female", "Other"].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              gender === g && styles.genderButtonActive,
            ]}
            onPress={() => setGender(g as any)}
          >
            <Text
              style={[
                styles.genderText,
                gender === g && styles.genderTextActive,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <View style={{ height: 16 }} />

      <Button
        title={loading ? "Registering..." : "Register"}
        onPress={onRegister}
        disabled={loading}
      />

      <View style={{ height: 16 }} />

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.loginLink}>
          Already have an account? Log in
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "white",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  genderButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  genderText: { color: "#333" },
  genderTextActive: { color: "white", fontWeight: "600" },
  loginLink: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});
