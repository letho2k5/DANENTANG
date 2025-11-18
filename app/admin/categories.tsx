// app/admin/categories.tsx
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Category } from "../../models/Category";
import { uploadToCloudinary } from "../../services/cloudinary";
import { db } from "../../services/firebase";

type CategoryWithKey = {
  key: string;    // firebase key
  data: Category; // dữ liệu Category
};

export default function AdminCategoriesScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryWithKey[]>([]);
  const [loading, setLoading] = useState(true);

  // trạng thái sửa
  const [editing, setEditing] = useState<CategoryWithKey | null>(null);
  const [editName, setEditName] = useState("");

  // trạng thái xoá
  const [deleting, setDeleting] = useState<CategoryWithKey | null>(null);

  // trạng thái thêm mới
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Lắng nghe Category từ Firebase (giống ValueEventListener)
  useEffect(() => {
    const categoriesRef = ref(db, "Category");
    const unsub = onValue(
      categoriesRef,
      (snapshot) => {
        const list: CategoryWithKey[] = [];
        snapshot.forEach((child) => {
          const value = child.val();
          if (value) {
            const cat: Category = {
              id: value.Id,
              name: value.Name,
              imagePath: value.ImagePath,
            };
            list.push({ key: child.key as string, data: cat });
          }
        });
        setCategories(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading categories:", error);
        Alert.alert("Lỗi", "Lỗi tải danh mục: " + error.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  // Chọn ảnh (dùng cho thêm mới)
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền truy cập ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewImageUri(result.assets[0].uri);
    }
  }

  // Mở màn danh sách Food thuộc Category (tương đương ItemsListActivity)
  function handleOpenItemsList(item: CategoryWithKey) {
    // tuỳ bạn đặt route, ví dụ: app/items-list.tsx hoặc app/items/[categoryId].tsx
    router.push({
      pathname: "/items-list",
      params: { id: String(item.data.id), title: item.data.name },
    });
  }

  // Lưu sửa tên
  async function handleSaveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên mới");
      return;
    }

    try {
      const catRef = ref(db, `Category/${editing.key}`);
      await update(catRef, { Name: editName.trim() });
      setEditing(null);
      setEditName("");
    } catch (e: any) {
      Alert.alert("Lỗi", "Lỗi sửa: " + (e.message ?? e.toString()));
    }
  }

  // Xoá category
  async function handleDelete() {
    if (!deleting) return;
    try {
      const catRef = ref(db, `Category/${deleting.key}`);
      await remove(catRef);
      setDeleting(null);
    } catch (e: any) {
      Alert.alert("Lỗi", "Lỗi xoá: " + (e.message ?? e.toString()));
    }
  }

  // hash string đơn giản như hashCode để tạo Id
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  // Thêm Category mới (kèm upload ảnh lên Cloudinary)
  async function handleAddCategory() {
    if (!newName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên danh mục");
      return;
    }

    try {
      setUploading(true);

      const catRef = ref(db, "Category");
      const newRef = push(catRef);
      const newKey = newRef.key;
      if (!newKey) {
        throw new Error("Không tạo được key mới");
      }

      const createCategory = async (imageUrl: string) => {
        const newCatFirebase = {
          Id: hashString(newKey),
          Name: newName.trim(),
          ImagePath: imageUrl,
        };
        await set(newRef, newCatFirebase);
        setAdding(false);
        setNewName("");
        setNewImageUri(null);
      };

      if (newImageUri) {
        // upload Cloudinary
        const res = await uploadToCloudinary(newImageUri);
        await createCategory(res.secure_url);
      } else {
        // không có ảnh, để rỗng
        await createCategory("");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", "Lỗi thêm danh mục: " + (e.message ?? e.toString()));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Đang tải danh mục...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 8 }}>
      <Text style={styles.title}>Quản lý danh mục</Text>

      <FlatList
        numColumns={3}
        data={categories}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleOpenItemsList(item)}
          >
            <Image
              source={{ uri: item.data.imagePath || undefined }}
              style={styles.cardImage}
            />
            <Text style={styles.cardName} numberOfLines={1}>
              {item.data.name}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditing(item);
                  setEditName(item.data.name);
                }}
              >
                <Text style={{ color: "blue" }}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleting(item)}>
                <Text style={{ color: "red" }}>Xoá</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Nút thêm (FLOAT) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAdding(true)}
      >
        <Text style={{ fontSize: 28, color: "white" }}>+</Text>
      </TouchableOpacity>

      {/* Modal sửa category */}
      <Modal visible={!!editing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa danh mục</Text>
            <TextInput
              placeholder="Tên mới"
              value={editName}
              onChangeText={setEditName}
              style={styles.input}
            />
            <View style={styles.modalButtonsRow}>
              <Button title="Huỷ" onPress={() => setEditing(null)} />
              <Button title="Lưu" onPress={handleSaveEdit} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận xoá */}
      <Modal visible={!!deleting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xoá danh mục</Text>
            <Text>
              Bạn có chắc muốn xoá "
              {deleting?.data.name}
              "?
            </Text>
            <View style={styles.modalButtonsRow}>
              <Button title="Huỷ" onPress={() => setDeleting(null)} />
              <Button title="Xoá" color="red" onPress={handleDelete} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal thêm danh mục */}
      <Modal visible={adding} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm danh mục</Text>
            <TextInput
              placeholder="Tên danh mục"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            <Button title="Chọn ảnh" onPress={pickImage} />
            {newImageUri && (
              <Image
                source={{ uri: newImageUri }}
                style={{ width: 100, height: 100, marginTop: 8, borderRadius: 8 }}
              />
            )}
            <View style={styles.modalButtonsRow}>
              <Button
                title="Huỷ"
                onPress={() => {
                  setAdding(false);
                  setNewName("");
                  setNewImageUri(null);
                }}
              />
              {uploading ? (
                <ActivityIndicator />
              ) : (
                <Button title="Thêm" onPress={handleAddCategory} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  card: {
    flex: 1 / 3,
    margin: 6,
    borderRadius: 16,
    backgroundColor: "#FEEEDC",
    alignItems: "center",
    padding: 8,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 4,
    backgroundColor: "#ddd",
  },
  cardName: { fontWeight: "600", fontSize: 14 },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
