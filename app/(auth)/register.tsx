// app/(auth)/register.tsx – ĐĂNG KÝ SIÊU ĐẸP, GIỮ NGUYÊN LOGIC HOÀN TOÀN
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
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
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const formattedBirthDate = birthDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === "ios");
    if (currentDate) setBirthDate(currentDate);
  };

  // GIỮ NGUYÊN TOÀN BỘ LOGIC VALIDATE CỦA BẠN
  function validate(): boolean {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim() || !password || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ tất cả thông tin");
      return false;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không khớp");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ hoặc quá ngắn (tối thiểu 10 chữ số)");
      return false;
    }
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    if (birthDate > minAgeDate) {
      Alert.alert("Lỗi", "Bạn phải đủ 18 tuổi để đăng ký");
      return false;
    }
    return true;
  }

  // GIỮ NGUYÊN TOÀN BỘ LOGIC ĐĂNG KÝ
  async function handleRegisterConfirmed() {
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await fetchSignInMethodsForEmail(auth, email.trim());
      if (result.length > 0) {
        Alert.alert("Lỗi", "Email đã được sử dụng. Vui lòng chọn email khác.");
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      const userProfile = {
        uid,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        birthDate: formattedBirthDate,
        gender,
        balance: 1000000.0,
        role: "user",
      };
      await set(ref(db, `users/${uid}`), userProfile);
      Alert.alert("Thành công", "Đăng ký thành công", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  function onRegister() {
    if (!validate()) return;
    Alert.alert(
      "Đồng ý chia sẻ dữ liệu",
      "Chúng tôi sẽ lưu trữ thông tin của bạn trên Firebase để cung cấp dịch vụ. Thông tin này có thể được sử dụng để cá nhân hóa trải nghiệm người dùng. Bạn có đồng ý không?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", onPress: handleRegisterConfirmed },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>KN</Text>
            </View>
            <Text style={styles.appName}>KEBAB NGON</Text>
            <Text style={styles.tagline}>Tham gia cộng đồng ngay hôm nay!</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>

            {/* Họ tên */}
            <View style={styles.field}>
              <Ionicons name="person-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Ionicons name="mail-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Số điện thoại */}
            <View style={styles.field}>
              <Ionicons name="call-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                value={phone}
                keyboardType="numeric"
                maxLength={11}
                onChangeText={setPhone}
              />
            </View>

            {/* Địa chỉ */}
            <View style={styles.field}>
              <Ionicons name="location-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Địa chỉ"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Ngày sinh */}
            <View style={styles.field}>
              <Ionicons name="calendar-outline" size={24} color="#666" style={styles.icon} />
              <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateText}>{formattedBirthDate}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Giới tính */}
            <View style={styles.genderContainer}>
              <Ionicons name="transgender-outline" size={24} color="#666" style={{ marginRight: 12 }} />
              <View style={styles.genderRow}>
                {[
                  { value: "Male", label: "Nam" },
                  { value: "Female", label: "Nữ" },
                  { value: "Other", label: "Khác" },
                ].map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.genderBtn, gender === g.value && styles.genderActive]}
                    onPress={() => setGender(g.value as any)}
                  >
                    <Text style={[styles.genderText, gender === g.value && styles.genderTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mật khẩu */}
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu (ít nhất 6 ký tự)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Nút Đăng ký */}
            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
              onPress={onRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.registerBtnText}>Đăng ký ngay</Text>
              )}
            </TouchableOpacity>

            {/* Đăng nhập */}
            <TouchableOpacity style={styles.loginLinkContainer} onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.loginText}>
                Đã có tài khoản? <Text style={styles.loginHighlight}>Đăng nhập</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "white",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },

  scroll: { paddingBottom: 40 },

  // Logo
  logoContainer: { alignItems: "center", marginVertical: 32 },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#00BCD4",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logoText: { fontSize: 44, fontWeight: "bold", color: "white" },
  appName: { fontSize: 34, fontWeight: "900", color: "#333" },
  tagline: { fontSize: 17, color: "#666", marginTop: 8 },

  form: { paddingHorizontal: 32 },

  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 18,
    paddingHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  icon: { marginRight: 16 },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 18,
    color: "#333",
  },

  dateField: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
  },
  dateText: { fontSize: 17, color: "#333" },

  genderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  genderRow: { flexDirection: "row", flex: 1, justifyContent: "space-between" },
  genderBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    marginHorizontal: 6,
  },
  genderActive: { backgroundColor: "#00BCD4" },
  genderText: { fontSize: 16, color: "#666" },
  genderTextActive: { color: "white", fontWeight: "bold" },

  registerBtn: {
    backgroundColor: "#00BCD4",
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#00BCD4",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },

  loginLinkContainer: { alignItems: "center", marginTop: 24 },
  loginText: { fontSize: 16, color: "#666" },
  loginHighlight: { color: "#00BCD4", fontWeight: "bold" },
});