import { MaterialCommunityIcons } from "@expo/vector-icons";
import { onValue, ref, remove, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AdminUser } from "../../models/AdminUser";
import { db } from "../../services/firebase";

type UserRoleFilter = "all" | "admin" | "user";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserRoleFilter>("all");
  // State mới để quản lý người dùng đang được xem chi tiết
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null); 

  /**
   * Tải danh sách người dùng và áp dụng sắp xếp/lọc
   */
  useEffect(() => {
    const usersRef = ref(db, "users");

    const unsub = onValue(
      usersRef,
      (snapshot) => {
        let result: AdminUser[] = [];
        snapshot.forEach((child) => {
          const id = child.key ?? "";
          if (!id) return;

          const email = (child.child("email").val() as string) ?? "No Email";
          const role = (child.child("role").val() as string) ?? "";

          result.push({ id, email, role });
        });

        // Sắp xếp: Admin lên đầu, sau đó theo email
        result.sort((a, b) => {
          const aAdmin = a.role === "admin" ? 1 : 0;
          const bAdmin = b.role === "admin" ? 1 : 0;
          if (bAdmin - aAdmin !== 0) {
            return bAdmin - aAdmin;
          }
          return a.email.localeCompare(b.email);
        });

        setUsers(result);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading users:", error);
        Alert.alert("Lỗi", "Không tải được danh sách người dùng");
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  /**
   * Lọc danh sách người dùng dựa trên trạng thái filter
   */
  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    return user.role === (filter === "admin" ? "admin" : "user");
  });

  /**
   * Cập nhật vai trò (role) của người dùng
   */
  async function updateRole(user: AdminUser, newRole: "admin" | "user") {
    try {
      await update(ref(db, `users/${user.id}`), { role: newRole });
      Alert.alert(
        "Thành công",
        `Đã cập nhật vai trò của ${user.email} thành ${newRole.toUpperCase()}.`,
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Không cập nhật được vai trò");
    }
  }

  /**
   * Xử lý xoá người dùng
   */
  async function handleDeleteUser(user: AdminUser) {
    try {
      await remove(ref(db, `users/${user.id}`));
      Alert.alert("Thành công", `Đã xoá người dùng: ${user.email}`);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Không xoá được người dùng");
    }
  }

  /**
   * Hiển thị ActionSheet (iOS) hoặc Alert (Android) cho các tùy chọn quản lý
   */
  function showUserActions(user: AdminUser) {
    const isCurrentlyAdmin = user.role === "admin";
    const toggleRoleText = isCurrentlyAdmin
      ? "⬇️ Giáng cấp thành User"
      : "⬆️ Thăng cấp thành Admin";
    const newRole = isCurrentlyAdmin ? "user" : "admin";

    // Thêm tùy chọn "Xem Chi tiết"
    const options = [
      "👁️ Xem Chi tiết", 
      toggleRoleText,
      `🗑️ Xoá ${user.email}`,
      "Hủy",
    ];

    const destructiveButtonIndex = 2; // Nút Xoá
    const cancelButtonIndex = 3; // Nút Hủy

    const handleAction = (buttonIndex: number) => {
      switch (buttonIndex) {
        case 0:
            // Xem Chi tiết
            setSelectedUser(user);
            break;
        case 1:
          // Thăng/Giáng cấp
          updateRole(user, newRole);
          break;
        case 2:
          // Xác nhận và Xoá
          Alert.alert(
            "Xác nhận xoá",
            `Bạn có chắc chắn muốn xoá ${user.email}?`,
            [
              { text: "Hủy", style: "cancel" },
              { text: "Xoá", style: "destructive", onPress: () => handleDeleteUser(user) },
            ],
          );
          break;
        case 3:
          // Hủy
          break;
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          title: `Quản lý người dùng: ${user.email}`,
        },
        handleAction,
      );
    } else {
      // Dùng Alert cho Android
      Alert.alert(`Quản lý người dùng: ${user.email}`, "Chọn hành động:", [
        { text: options[0], onPress: () => setSelectedUser(user) }, // Xem chi tiết
        { text: options[1], onPress: () => updateRole(user, newRole) }, // Sửa vai trò
        { text: options[2], style: 'destructive', onPress: () => handleAction(2) }, // Xoá
        { text: options[3], style: 'cancel' }, // Hủy
      ]);
    }
  }

  /**
   * Render từng mục người dùng
   */
  function renderUser({ item: user }: { item: AdminUser }) {
    const isAdmin = user.role === "admin";
    const roleText = isAdmin ? "Admin" : "Người dùng thường";
    const iconName = isAdmin ? "crown" : "account";
    const textColor = isAdmin ? "white" : "black";

    return (
      <TouchableOpacity
        style={[styles.card, isAdmin && styles.cardAdmin]}
        onPress={() => showUserActions(user)}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={textColor}
          style={styles.icon}
        />
        
        <View style={styles.userInfo}>
          <Text style={[styles.emailText, { color: textColor }]}>
            {user.email}
          </Text>
          <Text style={[styles.roleText, { color: isAdmin ? 'white' : '#555' }]}>
            Vai trò: **{roleText}**
          </Text>
        </View>

        {/* Nút hành động (More Options) */}
        <MaterialCommunityIcons name="dots-vertical" size={24} color={textColor} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👑 Bảng điều khiển Quản lý User</Text>
      
      {/* Bộ lọc vai trò */}
      <View style={styles.filterContainer}>
        <FilterButton
          title="Tất cả"
          value="all"
          currentFilter={filter}
          onPress={setFilter}
        />
        <FilterButton
          title="Admin"
          value="admin"
          currentFilter={filter}
          onPress={setFilter}
        />
        <FilterButton
          title="Users"
          value="user"
          currentFilter={filter}
          onPress={setFilter}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderUser}
          contentContainerStyle={{ paddingVertical: 10 }}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Không tìm thấy người dùng nào phù hợp với bộ lọc.</Text>
          )}
        />
      )}

      {/* Modal Xem Chi tiết Người dùng */}
      <Modal
        visible={!!selectedUser}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chi tiết Người dùng</Text>

            {selectedUser && (
              <>
                <InfoRow label="Email" value={selectedUser.email} />
                <InfoRow label="Vai trò" value={selectedUser.role === 'admin' ? "Admin" : "User thường"} />
                <InfoRow label="User ID" value={selectedUser.id} isId={true} />
              </>
            )}

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Component phụ ---

interface FilterButtonProps {
    title: string;
    value: UserRoleFilter;
    currentFilter: UserRoleFilter;
    onPress: (filter: UserRoleFilter) => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ title, value, currentFilter, onPress }) => (
    <TouchableOpacity
        style={[
            styles.filterButton,
            currentFilter === value && styles.filterButtonActive,
        ]}
        onPress={() => onPress(value)}
    >
        <Text
            style={[
                styles.filterText,
                currentFilter === value && styles.filterTextActive,
            ]}
        >
            {title}
        </Text>
    </TouchableOpacity>
);

interface InfoRowProps {
    label: string;
    value: string;
    isId?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isId = false }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={[styles.infoValue, isId && styles.infoId]}>{value}</Text>
    </View>
);


// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16, color: "#333" },
  loading: { marginTop: 50 },

  // Filter Styles
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: "#007AFF", // Màu xanh dương nổi bật
  },
  filterText: {
    color: "#555",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "white",
    fontWeight: "600",
  },

  // Card Styles
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: "#CCC", 
  },
  cardAdmin: {
    backgroundColor: "#2E7D32", 
    borderLeftColor: "#1B5E20",
  },
  icon: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  emailText: { fontSize: 16, fontWeight: "600" },
  roleText: { fontSize: 13, marginTop: 4 },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#333',
    width: 80, // Cố định chiều rộng nhãn
  },
  infoValue: {
    flexShrink: 1,
    color: '#666',
    fontWeight: '500',
  },
  infoId: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontWeight: 'bold',
  }
}); 