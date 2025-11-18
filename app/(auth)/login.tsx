// app/(auth)/login.tsx
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { get, ref } from "firebase/database";
import React, { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "../../services/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onLogin() {
    if (!email.trim() || !password) {
      setMessage("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const uid = cred.user.uid;
      const snapshot = await get(ref(db, `users/${uid}`));

      if (!snapshot.exists()) {
        setMessage("Tài khoản không hợp lệ, vui lòng đăng ký tài khoản");
        await auth.signOut();
        return;
      }

      const role = (snapshot.child("role").val() as string) ?? "user";
      setMessage("Login successful");

      // TODO: nếu muốn lưu user vào AsyncStorage thì làm ở đây

      if (role === "admin") {
        router.replace("/admin"); // tương đương AdminActivity
      } else {
        router.replace("/"); // hoặc "/(tabs)" tuỳ cấu trúc app bạn
      }
    } catch (e: any) {
      setMessage("Lỗi đăng nhập: " + (e.message ?? "Không xác định"));
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <View style={styles.container}>
      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <Text style={styles.appTitle}>KEBAB NGON</Text>
      <Text style={styles.subtitle}>If you hungry,...</Text>

      <Text style={styles.sectionTitle}>Login to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <View style={{ width: "100%", marginBottom: 8 }}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.showPassButton}
          onPress={() => setShowPassword((v) => !v)}
        >
          <Text style={{ fontSize: 12 }}>
            {showPassword ? "Ẩn" : "Hiện"} mật khẩu
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 12 }} />

      <Button
        title={loading ? "Đang đăng nhập..." : "Login"}
        onPress={onLogin}
        disabled={loading}
      />

      <View style={{ height: 24 }} />

      <Text>OR</Text>

      {/* Chỗ Google / Facebook bạn có thể bổ sung sau */}

      <View style={{ height: 24 }} />

      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text style={styles.registerText}>
          Don&apos;t have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  messageBox: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: "#FFE082",
    padding: 10,
    borderRadius: 8,
  },
  messageText: { color: "black", fontWeight: "500", textAlign: "center" },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: "gray", marginBottom: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  showPassButton: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  rightRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  link: {
    color: "#007AFF",
    fontSize: 12,
  },
  registerText: {
    fontSize: 14,
    color: "#FF6F00",
    fontWeight: "bold",
  },
});
