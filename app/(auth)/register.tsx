import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
// Import DateTimePicker
import DateTimePicker from "@react-native-community/datetimepicker";
// Giả định đường dẫn này là đúng cho cấu hình Firebase của bạn
import { auth, db } from "../../services/firebase";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Sử dụng Date object cho ngày sinh
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1)); // Mặc định 01/01/2000
  const [showDatePicker, setShowDatePicker] = useState(false); // Trạng thái ẩn/hiện DatePicker
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Định dạng Date thành chuỗi dd/MM/yyyy
  const formattedBirthDate = birthDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Xử lý khi chọn ngày
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === "ios"); // Ẩn DatePicker trên Android, giữ lại trên iOS
    if (currentDate) {
      setBirthDate(currentDate);
    }
  };

  function validate(): boolean {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !password ||
      !confirmPassword
    ) {
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

    // Kiểm tra số điện thoại (Tối thiểu 10 ký tự, chỉ chứa số)
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ hoặc quá ngắn (tối thiểu 10 chữ số)");
      return false;
    }

    // Kiểm tra tuổi (ví dụ: tối thiểu 18 tuổi)
    const today = new Date();
    const minAgeDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    if (birthDate > minAgeDate) {
      Alert.alert("Lỗi", "Bạn phải đủ 18 tuổi để đăng ký");
      return false;
    }

    return true;
  }

  async function handleRegisterConfirmed() {
    if (!validate()) return;

    try {
      setLoading(true);

      // 1. Kiểm tra email đã dùng chưa
      const result = await fetchSignInMethodsForEmail(auth, email.trim());
      if (result.length > 0) {
        Alert.alert("Lỗi", "Email đã được sử dụng. Vui lòng chọn email khác.");
        return;
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
        // Lưu ngày sinh dưới dạng chuỗi đã định dạng
        birthDate: formattedBirthDate, 
        gender,
        balance: 1000000.0,
        role: "user",
      };

      // 3. Lưu thông tin người dùng vào Realtime Database
      await set(ref(db, `users/${uid}`), userProfile);

      Alert.alert("Thành công", "Đăng ký thành công", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  function onRegister() {
    if (!validate()) return;

    // Hiển thị hộp thoại xác nhận
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
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ flex: 1, backgroundColor: "#F7F7F7" }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Tạo Tài Khoản Mới 📝</Text>
      <Text style={styles.subtitle}>
        Vui lòng điền thông tin chi tiết của bạn.
      </Text>

      {/* Tên đầy đủ */}
      <TextInput
        style={styles.input}
        placeholder="Họ và Tên"
        value={fullName}
        onChangeText={setFullName}
      />

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />

      {/* Số điện thoại */}
      <TextInput
        style={styles.input}
        placeholder="Số Điện Thoại"
        value={phone}
        keyboardType="numeric" // Thay đổi thành numeric cho logic hơn
        onChangeText={setPhone}
        maxLength={11} // Giới hạn ký tự
      />

      {/* Địa chỉ */}
      <TextInput
        style={styles.input}
        placeholder="Địa Chỉ"
        value={address}
        onChangeText={setAddress}
      />

      {/* Chọn Ngày Sinh */}
      <View style={styles.datePickerContainer}>
        <Text style={styles.datePickerLabel}>Ngày Sinh:</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {formattedBirthDate}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DatePicker Component */}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          maximumDate={new Date()} // Không cho chọn ngày trong tương lai
        />
      )}

      {/* Giới Tính */}
      <View style={styles.genderRow}>
        <Text style={styles.genderTitle}>Giới Tính:</Text>
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

      {/* Mật khẩu */}
      <TextInput
        style={styles.input}
        placeholder="Mật Khẩu (ít nhất 6 ký tự)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Xác nhận mật khẩu */}
      <TextInput
        style={styles.input}
        placeholder="Xác Nhận Mật Khẩu"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <View style={{ height: 24 }} />

      {/* Nút Đăng Ký */}
      <TouchableOpacity
        style={[styles.registerButton, loading && styles.buttonDisabled]}
        onPress={onRegister}
        disabled={loading}
      >
        <Text style={styles.registerButtonText}>
          {loading ? "Đang Đăng Ký..." : "Đăng Ký"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 16 }} />

      {/* Link đăng nhập */}
      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.loginLink}>
          Đã có tài khoản? **Đăng nhập**
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// --- Stylesheet Cải Tiến ---
const PRIMARY_COLOR = "#1a73e8"; // Màu xanh lam hiện đại
const BORDER_COLOR = "#dadce0"; // Màu viền nhẹ
const BG_COLOR = "#F7F7F7"; // Màu nền xám nhạt

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: BG_COLOR,
    flexGrow: 1,
    alignItems: "stretch", // Căn chỉnh các phần tử theo chiều ngang
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10, // Bo góc mềm mại hơn
    padding: 14,
    marginBottom: 16,
    backgroundColor: "white", // Nền trắng cho TextInput nổi bật
    fontSize: 16,
    // Đổ bóng nhẹ cho Android (elevation) và iOS (shadow)
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  // --- Date Picker Style ---
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  datePickerLabel: {
    fontSize: 16,
    color: "#555",
    marginRight: 10,
    fontWeight: "600",
  },
  datePickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    padding: 14,
    backgroundColor: "white",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  datePickerText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  // --- Gender Picker Style ---
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  genderTitle: {
    fontSize: 16,
    color: "#555",
    marginRight: 10,
    fontWeight: "600",
  },
  genderButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: "white",
  },
  genderButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  genderText: { color: "#333", fontWeight: "500" },
  genderTextActive: { color: "white", fontWeight: "600" },
  // --- Button Style ---
  registerButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    // Đổ bóng nổi bật
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  registerButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#b3cde0", // Màu mờ khi bị vô hiệu hóa
  },
  loginLink: {
    color: PRIMARY_COLOR,
    fontWeight: "500",
    fontSize: 16,
    textAlign: "center",
  },
}); 