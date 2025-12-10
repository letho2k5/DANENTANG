// app/(auth)/login.tsx – ĐĂNG NHẬP SIÊU ĐẸP, SIÊU MƯỢT 2025
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { get, ref } from "firebase/database";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fadeAnim = new Animated.Value(0);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMessage(null));
    }, 3000);
  };

  const onLogin = async () => {
    if (!email.trim() || !password) {
      showMessage("Vui lòng nhập đầy đủ email và mật khẩu", "error");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      const snap = await get(ref(db, `users/${uid}`));

      if (!snap.exists()) {
        await auth.signOut();
        showMessage("Tài khoản không tồn tại trong hệ thống", "error");
        return;
      }

      const role = (snap.child("role").val() as string) || "user";

      showMessage("Đăng nhập thành công!", "success");

      setTimeout(() => {
        if (role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/(tabs)");
        }
      }, 800);
    } catch (e: any) {
      const msg = e.code === "auth/user-not-found" || e.code === "auth/wrong-password"
        ? "Email hoặc mật khẩu không đúng"
        : "Lỗi kết nối, vui lòng thử lại";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.inner}>

          {/* Logo + Title */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>KN</Text>
            </View>
            <Text style={styles.appName}>KEBAB NGON</Text>
            <Text style={styles.tagline}>If you hungry, just one click...</Text>
          </View>

          {/* Message */}
          {message && (
            <Animated.View style={[styles.messageBox, message.type === "success" ? styles.success : styles.error, { opacity: fadeAnim }]}>
              <Text style={styles.messageText}>{message.text}</Text>
            </Animated.View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Chào mừng trở lại</Text>
            <Text style={styles.formSubtitle}>Đăng nhập để tiếp tục</Text>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email của bạn"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={onLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <View style={styles.registerSection}>
              <Text style={styles.registerPrompt}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },

  // Logo Section
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#00BCD4",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoText: { fontSize: 36, fontWeight: "bold", color: "white" },
  appName: { fontSize: 32, fontWeight: "900", color: "#333" },
  tagline: { fontSize: 16, color: "#666", marginTop: 8 },

  // Message
  messageBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  success: { backgroundColor: "#d4edda", borderColor: "#c3e6cb" },
  error: { backgroundColor: "#f8d7da", borderColor: "#f5c6cb" },
  messageText: { color: "#333", fontWeight: "600" },

  // Form
  form: { width: "100%" },
  formTitle: { fontSize: 26, fontWeight: "bold", color: "#333", textAlign: "center" },
  formSubtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 17, paddingVertical: 16, color: "#333" },
  eyeIcon: { padding: 8 },

  forgotText: { color: "#00BCD4", fontWeight: "600", textAlign: "right", marginBottom: 24 },

  loginBtn: {
    backgroundColor: "#00BCD4",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#00BCD4",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { marginHorizontal: 16, color: "#999", fontSize: 14 },

  // Register
  registerSection: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  registerPrompt: { color: "#666", fontSize: 16 },
  registerLink: { color: "#00BCD4", fontWeight: "bold", fontSize: 16, marginLeft: 6 },
});