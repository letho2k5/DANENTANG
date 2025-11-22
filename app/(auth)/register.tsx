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
// Giả định đường dẫn này là đúng cho cấu hình Firebase của bạn
import { auth, db } from "../../services/firebase";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
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

  // Hàm xử lý logic đăng ký thực tế
  async function handleRegisterConfirmed() {
    // Dù đã validate trước đó, ta vẫn check lại để đảm bảo
    if (!validate()) return; 

    try {
      setLoading(true);

      // 1. Kiểm tra email đã dùng chưa
      const result = await fetchSignInMethodsForEmail(auth, email.trim());
      if (result.length > 0) {
        Alert.alert(
          "Lỗi",
          "Email is already in use. Please choose a different email."
        );
        return; // Dừng lại ở đây
      }

      // 2. Tạo tài khoản Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
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
        role: "user",
      };

      // 3. Lưu thông tin người dùng vào Realtime Database
      await set(ref(db, `users/${uid}`), userProfile);

      Alert.alert("Thành công", "Registration successful", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);

    } catch (e: any) {
      // 4. Bắt lỗi (Lỗi mạng, lỗi Firebase, v.v.)
      Alert.alert("Lỗi", e.message ?? "Registration failed");
    } finally {
      // 5. Luôn kết thúc bằng việc tắt loading
      setLoading(false);
    }
  }

  function onRegister() {
    if (!validate()) return;
    
    // Hiển thị hộp thoại xác nhận trước khi thực hiện logic Firebase
    Alert.alert(
      "Agree to Share Data",
      "We will store your information on Firebase to provide the service. This information may be used to personalize the user experience. Do you agree?",
      [
        { text: "Cancel", style: "cancel" },
        // Gọi hàm handleRegisterConfirmed khi người dùng nhấn "Agree"
        { text: "Agree", onPress: handleRegisterConfirmed },
      ]
    );
  }

  return (
    // Sử dụng flex: 1 để ScrollView chiếm toàn bộ màn hình
    <ScrollView 
        contentContainerStyle={styles.container} 
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled" // Giữ bàn phím không bị đóng đột ngột
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
        disabled={loading} // Nút bị vô hiệu hóa khi loading = true
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
    backgroundColor: "white",
    flexGrow: 1, // Đảm bảo ScrollView cuộn được
    alignItems: "center", // Giữ lại căn giữa nếu muốn các TextInput có width không phải 100%
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 16,
  },
  input: {
    width: "100%", // Đảm bảo chiếm toàn bộ chiều rộng
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: "row",
    marginBottom: 12,
    width: "100%", // Chiếm 100% để căn chỉnh đúng
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