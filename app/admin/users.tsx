// app/admin/users.tsx
import { onValue, ref, remove } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AdminUser } from "../../models/AdminUser";
import { db } from "../../services/firebase";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Lấy danh sách user từ Firebase (giống UserScreen trong Kotlin)
  useEffect(() => {
    const usersRef = ref(db, "users");

    const unsub = onValue(
      usersRef,
      (snapshot) => {
        const result: AdminUser[] = [];
        snapshot.forEach((child) => {
          const id = child.key ?? "";
          if (!id) return;

          const email = (child.child("email").val() as string) ?? "No Email";
          const role = (child.child("role").val() as string) ?? "";

          result.push({ id, email, role });
        });

        // sort admin trước (role == "admin")
        result.sort((a, b) => {
          const aAdmin = a.role === "admin" ? 1 : 0;
          const bAdmin = b.role === "admin" ? 1 : 0;
          return bAdmin - aAdmin;
        });

        setUsers(result);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading users:", error);
        Alert.alert("Lỗi", "Không tải được danh sách user");
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  async function handleDeleteUser() {
    if (!userToDelete) return;
    try {
      await remove(ref(db, `users/${userToDelete.id}`));
      Alert.alert("Thành công", `Đã xoá: ${userToDelete.email}`);
      setUserToDelete(null);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Không xoá được user");
    }
  }

  function renderUser(user: AdminUser) {
    const isAdmin = user.role === "admin";

    return (
      <View
        style={[
          styles.card,
          isAdmin && styles.cardAdmin,
        ]}
      >
        <View>
          <Text
            style={[
              styles.emailText,
              isAdmin && styles.textOnAdmin,
            ]}
          >
            Email: {user.email}
          </Text>
          <Text
            style={[
              styles.roleText,
              isAdmin && styles.textOnAdmin,
            ]}
          >
            Quyền: {isAdmin ? "Admin" : "Người dùng thường"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setUserToDelete(user)}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>✖</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý người dùng</Text>

      {loading ? (
        <Text>Đang tải...</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => renderUser(item)}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {/* Modal xác nhận xoá */}
      <Modal
        visible={!!userToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setUserToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận xoá</Text>
            <Text style={{ marginBottom: 16 }}>
              Bạn có muốn xoá người dùng {userToDelete?.email}?
            </Text>
            <View style={styles.modalButtonsRow}>
              <Button title="Hủy" onPress={() => setUserToDelete(null)} />
              <Button title="Xoá" color="#E53935" onPress={handleDeleteUser} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "white",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: "space-between",
  },
  cardAdmin: {
    backgroundColor: "#4CAF50",
  },
  emailText: { fontSize: 16, fontWeight: "500", color: "black" },
  roleText: { fontSize: 14, color: "#555" },
  textOnAdmin: { color: "white" },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000077",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
