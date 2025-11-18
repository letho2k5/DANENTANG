// app/items-list.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  equalTo,
  get,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  set,
} from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { uploadToCloudinary } from "../services/cloudinary";
import { auth, db } from "../services/firebase";

// model Food – dùng chung toàn app
export interface Food {
  id: number;
  title: string;
  price: number;
  imagePath: string;
  description: string;
  bestFood: boolean;
  categoryId: string;
  locationId: number;
  priceId: number;
  timeId: number;
  calorie: number;
  numberInCart: number;
  star: number;
  timeValue: number;
}

export default function ItemsListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; title: string }>();
  const categoryId = params.id ?? "";
  const title = params.title ?? "";

  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  const [items, setItems] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);

  // state thêm sản phẩm
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCalorie, setNewCalorie] = useState("");
  const [newTimeValue, setNewTimeValue] = useState("");
  const [newStar, setNewStar] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // lấy role user
  useEffect(() => {
    if (!userId) {
      setUserRole("");
      return;
    }
    const roleRef = ref(db, `users/${userId}/role`);
    const unsub = onValue(
      roleRef,
      (snap) => {
        const role = (snap.val() as string) ?? "";
        setUserRole(role);
      },
      () => setUserRole(""),
    );
    return () => unsub();
  }, [userId]);

  // load foods filter theo CategoryId
  useEffect(() => {
    if (!categoryId) return;

    const foodsQuery = query(
      ref(db, "Foods"),
      orderByChild("CategoryId"),
      equalTo(categoryId),
    );

    const unsub = onValue(
      foodsQuery,
      (snap) => {
        const list: Food[] = [];
        snap.forEach((child) => {
          const v: any = child.val();
          if (!v) return;
          list.push({
            id: v.Id,
            title: v.Title,
            price: v.Price,
            imagePath: v.ImagePath,
            description: v.Description ?? "",
            bestFood: v.BestFood ?? false,
            categoryId: v.CategoryId ?? "",
            locationId: v.LocationId ?? 0,
            priceId: v.PriceId ?? 0,
            timeId: v.TimeId ?? 0,
            calorie: v.Calorie ?? 0,
            numberInCart: v.numberInCart ?? 0,
            star: v.Star ?? 0,
            timeValue: v.TimeValue ?? 0,
          });
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.log("Error load items:", err);
        Alert.alert("Lỗi", "Không tải được danh sách món");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [categoryId]);

  // reset form
  function resetForm() {
    setNewTitle("");
    setNewPrice("");
    setNewDescription("");
    setNewCalorie("");
    setNewTimeValue("");
    setNewStar("");
    setImageUri(null);
  }

  // chọn ảnh bằng Expo ImagePicker
  async function pickImage() {
    const { status } =
      await import("expo-image-picker").then((m) =>
        m.requestMediaLibraryPermissionsAsync(),
      );
    if (status !== "granted") {
      Alert.alert("Cần quyền", "Vui lòng cấp quyền truy cập ảnh");
      return;
    }

    const result = await import("expo-image-picker").then((m) =>
      m.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: m.MediaTypeOptions.Images,
        quality: 0.8,
      }),
    );

    // @ts-ignore
    if (result.canceled) return;
    // @ts-ignore
    setImageUri(result.assets[0].uri);
  }

  // thêm sản phẩm mới (admin)
  async function handleAddProduct() {
    if (!categoryId) {
      Alert.alert("Lỗi", "Thiếu CategoryId");
      return;
    }
    if (!newTitle.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập Title");
      return;
    }
    const priceVal = parseFloat(newPrice);
    if (!newPrice.trim() || isNaN(priceVal) || priceVal <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá hợp lệ");
      return;
    }
    const starVal = newStar.trim()
      ? parseFloat(newStar)
      : 4.0;
    if (starVal < 0 || starVal > 5) {
      Alert.alert("Lỗi", "Star Rating phải 0–5");
      return;
    }

    setUploading(true);

    try {
      let imageUrl = "";

      if (imageUri) {
        const res = await uploadToCloudinary(imageUri);
        imageUrl = res.secure_url;
      } else {
        imageUrl =
          "https://via.placeholder.com/300x200.png?text=Food";
      }

      // sinh Id mới: max Id + 1
      const foodsSnap = await get(ref(db, "Foods"));
      let maxId = 0;
      foodsSnap.forEach((child) => {
        const v: any = child.val();
        if (v && typeof v.Id === "number") {
          maxId = Math.max(maxId, v.Id);
        }
      });
      const newId = maxId + 1;

      const calorieVal = newCalorie.trim()
        ? parseInt(newCalorie, 10)
        : 200;
      const timeVal = newTimeValue.trim()
        ? parseInt(newTimeValue, 10)
        : 15;

      const newProduct = {
        BestFood: false,
        CategoryId: categoryId,
        Description: newDescription.trim(),
        Id: newId,
        ImagePath: imageUrl,
        LocationId: 1,
        Price: priceVal,
        PriceId: 1,
        TimeId: 1,
        Title: newTitle.trim(),
        Calorie: calorieVal,
        numberInCart: 0,
        Star: starVal,
        TimeValue: timeVal,
      };

      await set(ref(db, `Foods/${newId}`), newProduct);
      Alert.alert("Thành công", "Đã thêm sản phẩm");
      resetForm();
      setShowAddModal(false);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Không thêm được sản phẩm");
    } finally {
      setUploading(false);
    }
  }

  function renderBody() {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.center}>
          <Text>No items found in this category</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item, index }) => (
          <ItemRow
            item={item}
            index={index}
            userRole={userRole}
            onPress={() =>
              router.push({
                pathname: "/food/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="black"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {userRole === "admin" ? (
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Add Product
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      {renderBody()}

      {/* Modal add product (admin) */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!uploading) {
            setShowAddModal(false);
            resetForm();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                Add New Product
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Title"
                value={newTitle}
                editable={!uploading}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Price"
                keyboardType="numeric"
                value={newPrice}
                editable={!uploading}
                onChangeText={setNewPrice}
              />
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Description"
                multiline
                value={newDescription}
                editable={!uploading}
                onChangeText={setNewDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Calorie"
                keyboardType="numeric"
                value={newCalorie}
                editable={!uploading}
                onChangeText={setNewCalorie}
              />
              <TextInput
                style={styles.input}
                placeholder="Time Value (min)"
                keyboardType="numeric"
                value={newTimeValue}
                editable={!uploading}
                onChangeText={setNewTimeValue}
              />
              <TextInput
                style={styles.input}
                placeholder="Star Rating (0–5)"
                keyboardType="numeric"
                value={newStar}
                editable={!uploading}
                onChangeText={setNewStar}
              />

              <TouchableOpacity
                style={styles.chooseImageButton}
                onPress={pickImage}
                disabled={uploading}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  {imageUri ? "Change Image" : "Choose Image"}
                </Text>
              </TouchableOpacity>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 10,
                    marginTop: 8,
                  }}
                />
              )}

              {uploading && (
                <View style={{ marginTop: 8, alignItems: "center" }}>
                  <ActivityIndicator size="small" />
                  <Text style={{ marginTop: 4 }}>
                    Uploading...
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#999" }]}
                  onPress={() => {
                    if (uploading) return;
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text style={{ color: "white" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: "#4B0082" },
                  ]}
                  onPress={handleAddProduct}
                  disabled={uploading}
                >
                  <Text style={{ color: "white" }}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ====== 1 item row: giống Items(...) bên Kotlin :contentReference[oaicite:3]{index=3} ======

type ItemRowProps = {
  item: Food;
  index: number;
  userRole: string;
  onPress: () => void;
};

function ItemRow({ item, index, userRole, onPress }: ItemRowProps) {
  const [showEdit, setShowEdit] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title);
  const [editPrice, setEditPrice] = useState(String(item.price));
  const [editDescription, setEditDescription] = useState(
    item.description,
  );
  const [editCalorie, setEditCalorie] = useState(
    String(item.calorie),
  );
  const [editTimeValue, setEditTimeValue] = useState(
    String(item.timeValue),
  );
  const [editStar, setEditStar] = useState(String(item.star));

  const isEvenRow = index % 2 === 0;

  function confirmDelete() {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${item.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(ref(db, `Foods/${item.id}`));
            } catch (e: any) {
              Alert.alert(
                "Lỗi",
                e.message ?? "Không xóa được sản phẩm",
              );
            }
          },
        },
      ],
    );
  }

  async function saveEdit() {
    const priceVal = parseFloat(editPrice);
    const starVal = parseFloat(editStar);
    const calorieVal = parseInt(editCalorie, 10);
    const timeVal = parseInt(editTimeValue, 10);

    try {
      await set(ref(db, `Foods/${item.id}`), {
        BestFood: item.bestFood,
        CategoryId: item.categoryId,
        Description: editDescription.trim(),
        Id: item.id,
        ImagePath: item.imagePath,
        LocationId: item.locationId,
        Price: isNaN(priceVal) ? item.price : priceVal,
        PriceId: item.priceId,
        TimeId: item.timeId,
        Title: editTitle.trim(),
        Calorie: isNaN(calorieVal) ? item.calorie : calorieVal,
        numberInCart: item.numberInCart,
        Star: isNaN(starVal) ? item.star : starVal,
        TimeValue: isNaN(timeVal) ? item.timeValue : timeVal,
      });
      setShowEdit(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Không lưu được sản phẩm");
    }
  }

  const content = (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: "row" }}>
          {/* reorder image & content tuỳ vào index chẵn / lẻ */}
          {isEvenRow ? (
            <>
              <ItemImage item={item} />
              <ItemDetails
                item={item}
                userRole={userRole}
                onEdit={() => setShowEdit(true)}
                onDelete={confirmDelete}
              />
            </>
          ) : (
            <>
              <ItemDetails
                item={item}
                userRole={userRole}
                onEdit={() => setShowEdit(true)}
                onDelete={confirmDelete}
              />
              <ItemImage item={item} />
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {content}

      {/* Modal edit */}
      <Modal
        visible={showEdit && userRole === "admin"}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEdit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Price"
                keyboardType="numeric"
                value={editPrice}
                onChangeText={setEditPrice}
              />
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Description"
                multiline
                value={editDescription}
                onChangeText={setEditDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Calorie"
                keyboardType="numeric"
                value={editCalorie}
                onChangeText={setEditCalorie}
              />
              <TextInput
                style={styles.input}
                placeholder="Time Value (min)"
                keyboardType="numeric"
                value={editTimeValue}
                onChangeText={setEditTimeValue}
              />
              <TextInput
                style={styles.input}
                placeholder="Star Rating"
                keyboardType="numeric"
                value={editStar}
                onChangeText={setEditStar}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#999" }]}
                  onPress={() => setShowEdit(false)}
                >
                  <Text style={{ color: "white" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: "#4B0082" },
                  ]}
                  onPress={saveEdit}
                >
                  <Text style={{ color: "white" }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ItemImage({ item }: { item: Food }) {
  return (
    <Image
      source={{ uri: item.imagePath }}
      style={styles.itemImage}
    />
  );
}

function ItemDetails({
  item,
  userRole,
  onEdit,
  onDelete,
}: {
  item: Food;
  userRole: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.itemDetails}>
      <Text
        style={styles.itemTitle}
        numberOfLines={1}
      >
        {item.title}
      </Text>

      {/* Time */}
      <View style={styles.rowInfo}>
        <Ionicons
          name="time-outline"
          size={16}
          color="#4B0082"
        />
        <Text style={styles.rowInfoText}>
          {item.timeValue} min
        </Text>
      </View>

      {/* Star */}
      <View style={styles.rowInfo}>
        <Ionicons
          name="star"
          size={16}
          color="#FFD700"
        />
        <Text style={styles.rowInfoText}>{item.star}</Text>
      </View>

      <Text style={styles.itemPrice}>${item.price}</Text>

      {userRole === "admin" && (
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onEdit}
          >
            <Text style={styles.smallButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.smallButton,
              { backgroundColor: "#E53935" },
            ]}
            onPress={onDelete}
          >
            <Text style={styles.smallButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ====== styles ======

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
  },
  addButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#4B0082",
    borderRadius: 8,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemContainer: {
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 8,
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#ddd",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  itemTitle: {
    color: "#4B0082",
    fontSize: 16,
    fontWeight: "600",
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rowInfoText: {
    marginLeft: 4,
    fontSize: 13,
  },
  itemPrice: {
    marginTop: 8,
    color: "#4B0082",
    fontSize: 18,
    fontWeight: "700",
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#4B0082",
    borderRadius: 8,
    marginRight: 8,
  },
  smallButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  chooseImageButton: {
    marginTop: 8,
    backgroundColor: "#FF7A00",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
});
