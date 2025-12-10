// app/(auth)/forgot-password.tsx
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth } from "../../services/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSend() {
    if (!email.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập email đã đăng ký.");
      return;
    }

    try {
      setLoading(true);
      // Gọi hàm gửi email của Firebase
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        "Đã gửi yêu cầu!",
        "Vui lòng kiểm tra hộp thư (bao gồm cả mục Spam) để đặt lại mật khẩu.",
        [{ text: "OK, Quay lại đăng nhập", onPress: () => router.back() }]
      );
    } catch (e: any) {
      console.log("Forgot password error:", e.code);
      
      // Xử lý lỗi sang tiếng Việt dễ hiểu
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      
      switch (e.code) {
        case "auth/user-not-found":
          errorMessage = "Email này chưa được đăng ký trong hệ thống.";
          break;
        case "auth/invalid-email":
          errorMessage = "Định dạng email không hợp lệ.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Vui lòng kiểm tra kết nối mạng.";
          break;
      }

      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Quên mật khẩu?</Text>
        <Text style={styles.subtitle}>
          Đừng lo! Hãy nhập email của bạn, Kebab Ngon sẽ gửi hướng dẫn khôi phục mật khẩu.
        </Text>

        <Text style={styles.label}>Email đăng ký</Text>
        <TextInput
          placeholder="Ví dụ: kebab@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={onSend} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
<Text style={styles.buttonText}>Gửi email khôi phục</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Quay lại Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF", // Màu xanh giống màn hình Login
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10, // Bo tròn giống Login
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  button: {
    backgroundColor: "#007AFF", // Màu nút giống Login
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#A0C4FF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
    padding: 10,
  },
  backButtonText: {
    color: "#FF6F00", // Màu cam (nhấn mạnh thương hiệu)
    fontWeight: "600",
    fontSize: 14,
  },
});