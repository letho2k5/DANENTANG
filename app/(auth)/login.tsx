// app/(auth)/login.tsx – ĐẸP NHƯ CODE GỐC + HOÀN HẢO KHÔNG LỖI (Mobile & Web)
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { get, ref } from "firebase/database";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    }, 4000);
  };

  const onLogin = async () => {
    Keyboard.dismiss();
    setMessage(null);

    if (!email.trim()) return showMessage("Vui lòng nhập email của bạn", "error");
    if (!password) return showMessage("Vui lòng nhập mật khẩu", "error");

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const uid = userCredential.user.uid;

      const snap = await get(ref(db, `users/${uid}`));
      if (!snap.exists()) {
        await auth.signOut();
        return showMessage("Tài khoản không tồn tại trong hệ thống", "error");
      }

      const userData = snap.val();
      const role = (userData.role || "user").toString().toLowerCase();
      const name = userData.name || userData.displayName || "bạn";
      const isBlocked = userData.isBlocked === true;

      if (isBlocked) {
        await auth.signOut();
        return showMessage("Tài khoản của bạn đã bị khóa. Liên hệ hỗ trợ.", "error");
      }

      showMessage(`Chào mừng trở lại, ${name}!`, "success");

      setTimeout(() => {
        router.replace(role === "admin" ? "/admin" : "/(tabs)");
      }, 1200);

    } catch (error: any) {
 console.log("Firebase error:", error.code); // để bạn debug lần đầu

      if (error.code === "auth/invalid-credential") {
        showMessage("Email hoặc mật khẩu không đúng", "error");
      } else if (error.code === "auth/user-not-found") {
        showMessage("Email này chưa được đăng ký", "error");
      } else if (error.code === "auth/wrong-password") {
        showMessage("Mật khẩu không đúng", "error");
      } else if (error.code === "auth/invalid-email") {
        showMessage("Email không hợp lệ", "error");
      } else if (error.code === "auth/user-disabled") {
        showMessage("Tài khoản đã bị vô hiệu hóa", "error");
      } else if (error.code === "auth/too-many-requests") {
        showMessage("Quá nhiều lần thử sai. Thử lại sau vài phút", "error");
      } else if (error.code === "auth/network-request-failed") {
        showMessage("Không có kết nối mạng", "error");
      } else {
        showMessage("Có lỗi xảy ra. Vui lòng thử lại", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.inner}>

          {/* Logo Section – giống hệt code gốc */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>KN</Text>
            </View>
            <Text style={styles.appName}>KEBAB NGON</Text>
            <Text style={styles.tagline}>If you hungry, just one click...</Text>
          </View>

          {/* Message Box – đẹp như cũ */}
          {message && (
            <Animated.View
              style={[
                styles.messageBox,
                message.type === "success" ? styles.success : styles.error,
                { opacity: fadeAnim },
              ]}
            >
              <Ionicons
                name={message.type === "success" ? "checkmark-circle" : "alert-circle"}
                size={26}
                color={message.type === "success" ? "#155724" : "#721c24"}
              />
              <Text style={styles.messageText}>{message.text}</Text>
            </Animated.View>
          )}

          {/* Form – giữ nguyên giao diện gốc 100% */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Chào mừng trở lại</Text>
            <Text style={styles.formSubtitle}>Đăng nhập để tiếp tục thưởng thức món ngon</Text>

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
                autoCorrect={false}
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
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={onLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerPrompt}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.registerLink}>Đăng ký miễn phí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Style – GIỮ NGUYÊN 99% như code gốc bạn gửi ban đầu
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },

  // Logo Section
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logoText: { fontSize: 42, fontWeight: "900", color: "white" },
  appName: { fontSize: 34, fontWeight: "900", color: "#222", letterSpacing: 1 },
  tagline: { fontSize: 16, color: "#777", marginTop: 8, fontStyle: "italic" },

  // Message
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    marginHorizontal: 10,
  },
  success: { backgroundColor: "#d4edda", borderColor: "#c3e6cb" },
  error: { backgroundColor: "#f8d7da", borderColor: "#f5c6cb" },
  messageText: { color: "#333", fontWeight: "600", fontSize: 16, marginLeft: 10 },

  // Form
  form: { width: "100%" },
  formTitle: { fontSize: 28, fontWeight: "bold", color: "#222", textAlign: "center", marginBottom: 8 },
  formSubtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 17, paddingVertical: 18, color: "#333" },
  eyeIcon: { padding: 8 },

  forgotText: { color: "#00BCD4", fontWeight: "700", textAlign: "right", marginBottom: 28, fontSize: 15 },

  loginBtn: {
    backgroundColor: "#00BCD4",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "white", fontSize: 18, fontWeight: "800" },

  divider: { flexDirection: "row", alignItems: "center", marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { marginHorizontal: 20, color: "#999", fontSize: 15, fontWeight: "600" },

  registerSection: { flexDirection: "row", justifyContent: "center" },
  registerPrompt: { color: "#666", fontSize: 16 },
  registerLink: { color: "#00BCD4", fontWeight: "bold", fontSize: 16, marginLeft: 6 },
}); 