import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthActions } from "../../hooks/useAuthActions";
import type { UserProfile } from "../../models/UserProfile";
import { uploadToCloudinary } from "../../services/cloudinary";
import { auth, db } from "../../services/firebase";

const { width, height } = Dimensions.get("window");

// --- COLOR PALETTE ---
const PRIMARY_COLOR = "#00BCD4"; // Cyan
const ACCENT_COLOR = "#FF9800"; // Orange (ít dùng)
const BACKGROUND_LIGHT = "#F0F2F5"; // Nền xám nhạt, hiện đại
const CARD_BG = "#FFFFFF"; // Nền thẻ
const TEXT_DARK = "#212121";
const TEXT_MUTED = "#757575";
const RED_DANGER = "#E53935"; // Màu đỏ cho Đăng xuất

// --- PLACEHOLDER ---
const DEFAULT_PROFILE_PICTURE =
  "https://placehold.co/120x120/4DD0E1/ffffff/png?text=AVT";
const DEFAULT_BACKGROUND_IMAGE =
  "https://placehold.co/800x200/006064/E0F7FA/png?text=Background";

// --- Info line component ---
function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoLineContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>
        {value && value.length > 0 ? value : "Chưa cập nhật"}
      </Text>
    </View>
  );
}

// Modal hiển thị ảnh fullscreen
function FullScreenImageModal({
  visible,
  imageUrl,
  onClose,
}: {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="fade">
      <View style={modalStyles.modalContainer}>
        <Image source={{ uri: imageUrl }} style={modalStyles.fullImage} resizeMode="contain" />
        <TouchableOpacity style={modalStyles.closeButton} onPress={onClose} accessibilityLabel="Close image">
          <Ionicons name="close-circle" size={36} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { handleLogout } = useAuthActions();
  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal zoom image
  const [modalVisible, setModalVisible] = useState(false);
  const [currentZoomImage, setCurrentZoomImage] = useState("");

  const handleZoomImage = (url: string) => {
    if (!url) return;
    setCurrentZoomImage(url);
    setModalVisible(true);
  };

  // Logic tải Profile (Không thay đổi)
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) {
        const v = snap.val();
        setProfile({
          uid: v.uid ?? userId,
          fullName: v.fullName ?? user?.displayName ?? "",
          email: v.email ?? user?.email ?? "",
          phone: v.phone ?? "",
          address: v.address ?? "",
          birthDate: v.birthDate ?? "",
          gender: v.gender ?? "",
          balance: Number(v.balance ?? 0),
          // @ts-ignore
          profilePictureUrl: v.profilePictureUrl ?? undefined,
          // @ts-ignore
          backgroundImageUrl: v.backgroundImageUrl ?? undefined,
        });
      } else {
        setProfile({
          uid: userId,
          fullName: user?.displayName ?? "",
          email: user?.email ?? "",
          phone: "",
          address: "",
          birthDate: "",
          gender: "",
          balance: 0,
          // @ts-ignore
          profilePictureUrl: undefined,
          // @ts-ignore
          backgroundImageUrl: undefined,
        });
      }
    } catch (e) {
      console.log("loadProfile error", e);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    let mounted = true;
    if (mounted) loadProfile();
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  // ImagePicker + upload (Không thay đổi logic chính)
  async function pickAndUploadImage(isAvatar: boolean) {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        console.log("Permission not granted for media library");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: isAvatar ? true : false, // Cho phép crop avatar
        aspect: isAvatar ? [1, 1] : undefined, // Tỉ lệ 1:1 cho avatar
        quality: 0.8,
      });

      if ((result as any).canceled || !((result as any).assets && (result as any).assets.length)) {
        return;
      }

      const uri = (result as any).assets[0].uri as string;
      if (!uri) return;

      await uploadImageAndUpdateProfile(uri, isAvatar);
    } catch (e) {
      console.log("pickAndUploadImage error", e);
    }
  }

  // Upload to Cloudinary then update DB (Không thay đổi logic chính)
  async function uploadImageAndUpdateProfile(uri: string, isAvatar: boolean) {
    if (!userId) {
      console.log("User not logged in");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadToCloudinary(uri);
      const downloadUrl = res?.secure_url;
      if (!downloadUrl) throw new Error("No secure_url from Cloudinary");

      const updateData: any = isAvatar ? { profilePictureUrl: downloadUrl } : { backgroundImageUrl: downloadUrl };
      await update(ref(db, `users/${userId}`), updateData);

      setProfile((prev) => (prev ? { ...prev, ...updateData } : prev));
    } catch (e) {
      Alert.alert("Lỗi tải ảnh", "Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.");
      console.log("uploadImageAndUpdateProfile error", e);
    } finally {
      setUploading(false);
    }
  }

  const handleEditRedirect = () => router.push("/profile/edit");

  // --- Render states ---
  if (!userId) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-circle-outline" size={80} color={PRIMARY_COLOR} />
        <Text style={styles.noticeTitle}>Bạn chưa đăng nhập</Text>
        <Text style={styles.subText}>Đăng nhập để xem trang cá nhân.</Text>

        <TouchableOpacity style={[styles.btn, { marginTop: 24 }]} onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.btnText}>Đăng Nhập Ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ marginTop: 10, color: PRIMARY_COLOR }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const currentBackgroundUrl = (profile as any)?.backgroundImageUrl || DEFAULT_BACKGROUND_IMAGE;
  const currentProfileUrl = (profile as any)?.profilePictureUrl || DEFAULT_PROFILE_PICTURE;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} />}
      >
        {/* HEADER: background + card */}
        <View style={styles.headerWrap}>
          {/* Ảnh bìa */}
          <TouchableOpacity activeOpacity={0.9} onPress={() => handleZoomImage(currentBackgroundUrl)}>
            <Image source={{ uri: currentBackgroundUrl }} style={styles.backgroundImage} />
            <View style={styles.backgroundOverlay} pointerEvents="none" />
          </TouchableOpacity>

          {/* Nút chỉnh sửa ảnh bìa */}
          <TouchableOpacity
            style={styles.backgroundEditBtn}
            onPress={() => pickAndUploadImage(false)}
            accessibilityLabel="Chỉnh sửa ảnh bìa"
          >
            <Ionicons name="camera-outline" size={20} color="white" />
          </TouchableOpacity>

          {/* Thẻ Profile */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => handleZoomImage(currentProfileUrl)}>
                <Image source={{ uri: currentProfileUrl }} style={styles.avatar} />
              </TouchableOpacity>

              {/* Nút chỉnh sửa Avatar */}
              <TouchableOpacity
                style={styles.avatarEditBtn}
                onPress={() => pickAndUploadImage(true)}
                accessibilityLabel="Chỉnh sửa avatar"
              >
                <Ionicons name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.nameText}>{profile?.fullName || "Người dùng"}</Text>
            <Text style={styles.emailText}>{profile?.email || ""}</Text>

            {/* Hàng nút hành động */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleEditRedirect} accessibilityLabel="Chỉnh sửa hồ sơ">
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() =>
                  Alert.alert("Xác nhận", "Bạn có muốn đăng xuất khỏi ứng dụng?", [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Đăng xuất",
                      style: "destructive",
                      onPress: () => {
                        handleLogout();
                        router.replace("/(auth)/login");
                      },
                    },
                  ])
                }
                accessibilityLabel="Đăng xuất"
              >
                <Ionicons name="log-out-outline" size={18} color={RED_DANGER} />
                <Text style={styles.logoutBtnText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* INFO SECTION */}
        <View style={styles.sectionContainer}>
          {/* Tiêu đề mục */}
          <View style={styles.sectionTitleRow}>
            <Ionicons name="information-circle-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.sectionTitleText}>Thông tin cá nhân</Text>
          </View>

          {/* Danh sách thông tin */}
          <InfoLine label="Số dư tài khoản" value={(profile?.balance ?? 0).toLocaleString("vi-VN") + " VND"} />
          <InfoLine label="Số điện thoại" value={profile?.phone} />
          <InfoLine label="Giới tính" value={profile?.gender} />
          <InfoLine label="Ngày sinh" value={profile?.birthDate} />
          <InfoLine label="Địa chỉ" value={profile?.address} />
        </View>

        {/* Trạng thái Uploading */}
        {uploading && (
          <View style={styles.uploadingBox}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={{ marginLeft: 8, color: TEXT_MUTED }}>Đang tải ảnh lên...</Text>
          </View>
        )}

      </ScrollView>

      {/* Modal full-screen image */}
      <FullScreenImageModal visible={modalVisible} imageUrl={currentZoomImage} onClose={() => setModalVisible(false)} />
    </>
  );
}

// --- STYLES ---

/* Modal styles */
const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width,
    height: height,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 32,
    right: 20,
    padding: 10,
    zIndex: 999,
  },
});

/* Main styles */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND_LIGHT,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: BACKGROUND_LIGHT,
  },
  noticeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginTop: 15,
  },
  subText: {
    color: TEXT_MUTED,
    marginTop: 8,
    fontSize: 15,
  },

  btn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12, // Bo góc hiện đại hơn
    height: 48,
    paddingHorizontal: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // --- Header & Card ---
  headerWrap: {
    // Độ cao tối ưu để thẻ profile nổi bật
    height: 340,
    marginBottom: 24,
  },
  backgroundImage: {
    width: "100%",
    height: 220, // Ảnh bìa lớn hơn
    position: "absolute",
    top: 0,
    left: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)", // Overlay nhẹ
  },
  backgroundEditBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 8, // Bo góc vuông hơn
    zIndex: 20,
  },

  profileCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: -50,
    backgroundColor: CARD_BG,
    borderRadius: 16, // Bo góc lớn hơn
    padding: 18,
    alignItems: "center",
    shadowColor: TEXT_DARK,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  avatarWrap: {
    position: "relative",
    marginTop: -100, // Đẩy lên nổi bật trên nền ảnh bìa
    marginBottom: 6,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 999,
    borderWidth: 6, // Border dày hơn
    borderColor: CARD_BG,
  },
  avatarEditBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: PRIMARY_COLOR,
    padding: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: CARD_BG,
    zIndex: 10,
  },

  nameText: { fontSize: 22, fontWeight: "800", color: TEXT_DARK, marginTop: 4 },
  emailText: { fontSize: 14, color: TEXT_MUTED, marginTop: 4, marginBottom: 8 },

  // --- Action Buttons ---
  actionRow: { flexDirection: "row", marginTop: 15, alignItems: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 10,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: { color: "#fff", marginLeft: 8, fontWeight: "600", fontSize: 14 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  logoutBtnText: { color: RED_DANGER, marginLeft: 8, fontWeight: "600", fontSize: 14 },

  // --- Info Section ---
  sectionContainer: {
    marginHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 16, // Đồng bộ bo góc
    padding: 18,
    marginTop: 80, // Khoảng cách sau thẻ profile
    shadowColor: TEXT_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitleText: { marginLeft: 10, fontSize: 18, fontWeight: "700", color: TEXT_DARK },

  infoLineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BACKGROUND_LIGHT, // Dùng màu nền nhẹ
  },
  infoLabel: { fontSize: 15, color: TEXT_MUTED, fontWeight: "500" },
  infoValue: { fontSize: 15, color: TEXT_DARK, fontWeight: "600", maxWidth: "60%", textAlign: "right" },

  uploadingBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: TEXT_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
});