// app/food/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, onValue, push, ref, remove, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { uploadToCloudinary } from "../../services/cloudinary";
import { auth, db } from "../../services/firebase";

// ==== Models ====

export interface Food {
  id: number;
  title: string;
  price: number;
  imagePath: string;
  description: string;
  timeValue: number;
  star: number;
  calorie: number;
  numberInCart: number;
}

// Cập nhật Review interface theo models/Review.ts
export interface Review {
  userName: string;
  rating: number; // 0..5 (chỉ cho đánh giá gốc, replies sẽ là 0)
  comment: string;
  isPharmacist: boolean; // Thay thế cho isAdmin
  parentReviewId?: string | null;
  reviewId?: string | null; // Key/ID của review trên Firebase
  uid?: string | null; // User ID
  timestamp: number;
  imageUrl?: string | null;
}

// Định nghĩa kiểu dữ liệu tổ chức reviews để hiển thị
interface OrganizedReview {
  parent: Review;
  replies: Review[];
}

// ==== Utility: Relative Time Function ====
const timeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp; // difference in milliseconds

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const years = Math.floor(days / 365);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  if (weeks < 52) return `${weeks} weeks ago`;
  return `${new Date(timestamp).toLocaleDateString()}`; // Nếu quá lâu, hiển thị ngày tháng cụ thể
};


// ==== Screen ====

export default function FoodDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const foodId = params.id;

  const [food, setFood] = useState<Food | null>(null);
  const [numberInCart, setNumberInCart] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false); // Vẫn dùng isAdmin để xác định role
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const userId = user?.uid ?? "";

  // Ref tới TextInput để focus
  const commentInputRef = React.useRef<TextInput>(null); 

  // Description (editable nếu admin)
  const [description, setDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  // Favourite
  const [isFavorite, setIsFavorite] = useState(false);

  // Review
  const [reviews, setReviews] = useState<Review[]>([]); // Danh sách reviews phẳng (để dễ tìm kiếm parent)
  const [organizedReviews, setOrganizedReviews] = useState<
    OrganizedReview[]
  >([]); // Danh sách reviews đã tổ chức (để render)
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [reviewImageUrl, setReviewImageUrl] = useState<string | null>(null);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID của review đang được reply

  // ==== Load food ====
  useEffect(() => {
    async function loadFood() {
      if (!foodId) return;

      try {
        const foodRef = ref(db, `Foods/${foodId}`);
        const snap = await get(foodRef);
        if (!snap.exists()) {
          Alert.alert("Không tìm thấy món ăn");
          router.back();
          return;
        }
        const value: any = snap.val();
        const f: Food = {
          id: value.Id,
          title: value.Title,
          price: value.Price,
          imagePath: value.ImagePath,
          description: value.Description ?? "",
          timeValue: value.TimeValue ?? 0,
          star: value.Star ?? 0,
          calorie: value.Calorie ?? 0,
          numberInCart: 1,
        };
        setFood(f);
        setDescription(f.description);
      } catch (e) {
        console.log("Error loading food:", e);
        Alert.alert("Lỗi", "Không tải được thông tin món ăn");
      } finally {
        setLoading(false);
      }
    }

    loadFood();
  }, [foodId]);

  // ==== Check admin (isPharmacist) ====
  useEffect(() => {
    if (!userId) return;
    const roleRef = ref(db, `users/${userId}/role`);
    const unsub = onValue(roleRef, (snap) => {
      const role = (snap.val() as string) ?? "";
      setIsAdmin(role === "admin" || role === "pharmacist"); // Coi admin và pharmacist là quyền reply
    });
    return () => unsub();
  }, [userId]);

  // ==== Check favourite (giữ nguyên) ====
  useEffect(() => {
    if (!userId || !foodId) return;
    const favRef = ref(db, `users/${userId}/favourites/${foodId}`);
    const unsub = onValue(favRef, (snap) => {
      setIsFavorite(snap.exists());
    });
    return () => unsub();
  }, [userId, foodId]);

  // ==== Load and organize reviews (giữ nguyên) ====
  useEffect(() => {
    if (!foodId) return;
    const reviewsRef = ref(db, `Reviews/${foodId}`);
    const unsub = onValue(
      reviewsRef,
      (snap) => {
        const list: Review[] = [];
        const parents: Review[] = [];
        const repliesMap = new Map<string, Review[]>();

        snap.forEach((child) => {
          const v: any = child.val();
          const review: Review = {
            reviewId: child.key as string, // Lấy key làm reviewId
            userName: v.userName ?? "User",
            uid: v.uid ?? null,
            rating: v.rating ?? 0,
            comment: v.comment ?? "",
            timestamp: v.timestamp ?? 0,
            imageUrl: v.imageUrl ?? null,
            isPharmacist: v.isPharmacist ?? false,
            parentReviewId: v.parentReviewId ?? null,
          };
          list.push(review);

          if (review.parentReviewId) {
            // Là một câu trả lời
            const parentId = review.parentReviewId;
            if (!repliesMap.has(parentId)) {
              repliesMap.set(parentId, []);
            }
            repliesMap.get(parentId)?.push(review);
          } else {
            // Là đánh giá gốc (parent review)
            parents.push(review);
          }
        });

        // Sắp xếp đánh giá gốc theo thời gian mới nhất
        parents.sort((a, b) => b.timestamp - a.timestamp);

        // Sắp xếp các câu trả lời theo thời gian cũ nhất (theo luồng chat)
        repliesMap.forEach((replies) => {
          replies.sort((a, b) => a.timestamp - b.timestamp);
        });

        const organized: OrganizedReview[] = parents.map((parent) => ({
          parent,
          replies: repliesMap.get(parent.reviewId!) || [],
        }));

        setReviews(list); // Lưu danh sách phẳng
        setOrganizedReviews(organized);
        setLoadingReviews(false);
      },
      (err) => {
        console.log("Error reviews:", err);
        setLoadingReviews(false);
      },
    );
    return () => unsub();
  }, [foodId]);

  // --- Thêm useEffect để tự động focus khi trạng thái reply thay đổi ---
  useEffect(() => {
    // Chỉ focus khi đang ở trạng thái Reply và input đã được điền @username
    if (replyingTo && newComment.startsWith('@')) {
        commentInputRef.current?.focus(); 
    }
  }, [replyingTo, newComment]);


  // ==== Add to cart (giữ nguyên) ====
  async function handleAddToCart() {
    if (!userId || !food) {
      Alert.alert("Thông báo", "Bạn cần đăng nhập để thêm vào giỏ hàng");
      router.push("/(auth)/login");
      return;
    }

    try {
      const cartRef = ref(db, `users/${userId}/cart/${food.id}`);
      const snap = await get(cartRef);
      const currentQty = (snap.child("numberInCart").val() as number) ?? 0;
      const newQty = currentQty + numberInCart;

      const data = {
        Id: food.id,
        Title: food.title,
        Price: food.price,
        ImagePath: food.imagePath,
        Description: food.description,
        TimeValue: food.timeValue,
        Star: food.star,
        Calorie: food.calorie,
        numberInCart: newQty,
      };

      await set(cartRef, data);
      Alert.alert("Thành công", "Đã thêm vào giỏ hàng");
    } catch (e: any) {
      console.log(e);
      Alert.alert("Lỗi", e.message ?? "Không thể thêm vào giỏ hàng");
    }
  }

  // ==== Toggle favourite (giữ nguyên) ====
  async function toggleFavorite() {
    if (!userId || !food) {
      Alert.alert("Thông báo", "Bạn cần đăng nhập để sử dụng yêu thích");
      return;
    }

    const favRef = ref(db, `users/${userId}/favourites/${food.id}`);

    try {
      if (isFavorite) {
        await remove(favRef);
      } else {
        const favData = {
          BestFood: false,
          CategoryId: "", // nếu bạn có, map thêm
          Description: food.description,
          Id: food.id,
          ImagePath: food.imagePath,
          LocationId: 0,
          Price: food.price,
          PriceId: 0,
          TimeId: 0,
          Title: food.title,
          Calorie: food.calorie,
          numberInCart: numberInCart,
          Star: food.star,
          TimeValue: food.timeValue,
        };
        await set(favRef, favData);
      }
    } catch (e) {
      console.log("Fav error:", e);
    }
  }

  // ==== Save description (admin) (giữ nguyên) ====
  async function saveDescription() {
    if (!foodId) return;
    if (!description.trim()) {
      Alert.alert("Lỗi", "Description không được rỗng");
      return;
    }
    try {
      setSavingDescription(true);
      const descRef = ref(db, `Foods/${foodId}/Description`);
      await set(descRef, description.trim());
      Alert.alert("Thành công", "Đã lưu mô tả");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Không lưu được mô tả");
    } finally {
      setSavingDescription(false);
    }
  }

  // ==== Pick & upload review image (giữ nguyên) ====
  async function pickReviewImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Cần quyền", "Vui lòng cấp quyền truy cập ảnh");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      const uri = result.assets[0].uri;
      setUploadingReviewImage(true);
      const res = await uploadToCloudinary(uri);
      setReviewImageUrl(res.secure_url);
    } catch (e: any) {
      console.log("Pick image error:", e);
      Alert.alert("Lỗi", e.message ?? "Upload ảnh thất bại");
    } finally {
      setUploadingReviewImage(false);
    }
  }

  // ==== Submit review/reply (giữ nguyên) ====
  async function submitReview() {
    if (!userId || !user) {
      Alert.alert("Thông báo", "Bạn cần đăng nhập để đánh giá");
      return;
    }
    if (!newComment.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung đánh giá/trả lời");
      return;
    }
    if (!foodId) return;

    try {
      let fullName: string;
      const isPharmacistReply = isAdmin; // Sử dụng isAdmin làm isPharmacist

      if (isPharmacistReply) {
        fullName = "Admin/Pharmacist"; // Tên hiển thị khi reply
      } else {
        const userRef = ref(db, `users/${userId}/fullName`);
        const uSnap = await get(userRef);
        fullName = (uSnap.val() as string) ?? "User";
      }

      const reviewsRef = ref(db, `Reviews/${foodId}`);
      const newRef = push(reviewsRef);

      const review: Omit<Review, "reviewId"> = {
        userName: fullName,
        uid: userId,
        // Rating chỉ áp dụng cho đánh giá gốc, không phải reply
        rating: replyingTo ? 0 : newRating,
        comment: newComment.trim(),
        timestamp: Date.now(),
        imageUrl: reviewImageUrl,
        isPharmacist: isPharmacistReply,
        parentReviewId: replyingTo, // Gán ID của review gốc nếu đang reply
      };

      await set(newRef, review);
      setNewComment("");
      setNewRating(5);
      setReviewImageUrl(null);
      setReplyingTo(null); // Reset trạng thái reply
      Alert.alert("Thành công", "Đã gửi đánh giá/trả lời");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Không gửi được đánh giá/trả lời");
    }
  }

  // Hàm xử lý khi nhấn Reply: điền @username và focus input
    const handleReply = (reviewId: string, userName: string) => {
        if (!userId) {
            Alert.alert("Thông báo", "Bạn cần đăng nhập để trả lời");
            return;
        }
        
        // 1. Gán ID của review đang được reply
        setReplyingTo(reviewId);
        
        // 2. Điền @username vào input (để trigger useEffect focus)
        setNewComment(`@${userName} `);
    };


  if (loading || !food) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const totalPrice = food.price * numberInCart;
  const reviewInputPlaceholder = replyingTo
    ? "Nội dung trả lời..."
    : "Nội dung đánh giá...";

  // Hàm tìm tên người dùng đang được reply
  const getParentUserName = (parentReviewId: string) => {
    const parent = reviews.find((r) => r.reviewId === parentReviewId);
    return parent ? parent.userName : "Reviewer";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Nội dung scroll */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header image + back + favorite + info (giữ nguyên) */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: food.imagePath }}
            style={styles.mainImage}
          />

          {/* Back */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Favourite */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color="red"
            />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>{food.title}</Text>

        {/* Row detail: time, star, calorie */}
        <RowDetailRN food={food} />

        {/* Number row (+/-) + price */}
        <NumberRowRN
          food={food}
          numberInCart={numberInCart}
          onIncrement={() => setNumberInCart((n) => n + 1)}
          onDecrement={() =>
            setNumberInCart((n) => (n > 1 ? n - 1 : 1))
          }
        />

        {/* DescriptionSection: admin editable (giữ nguyên) */}
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Details</Text>
          {isAdmin ? (
            <>
              <TextInput
                style={styles.descriptionInput}
                multiline
                value={description}
                onChangeText={setDescription}
              />
              <TouchableOpacity
                style={styles.saveDescButton}
                onPress={saveDescription}
                disabled={savingDescription}
              >
                <Text style={styles.saveDescText}>
                  {savingDescription ? "Saving..." : "Save Description"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.descriptionText}>{description}</Text>
          )}
        </View>

        {/* ReviewSection (with Reply) */}
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Reviews</Text>

          {loadingReviews ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : organizedReviews.length === 0 ? (
            <Text style={{ marginTop: 8 }}>Chưa có đánh giá nào.</Text>
          ) : (
            organizedReviews.map(({ parent, replies }) => (
              <View key={parent.reviewId} style={{ marginTop: 8 }}>
                {/* Đánh giá gốc (Parent Review) */}
                <ReviewCard
                  review={parent}
                  onReply={() => handleReply(parent.reviewId!, parent.userName)}
                  // ẨN nút REPLY nếu là review của mình
                  canReply={!!userId && parent.uid !== userId} 
                  isPharmacist={isAdmin} 
                />

                {/* Câu trả lời (Replies) */}
                {replies.map((reply) => (
                  <View
                    key={reply.reviewId}
                    style={styles.replyCardContainer} // Style cho reply
                  >
                    <ReviewCard
                      review={reply}
                      isReply={true}
                      // User reply về parent ID, nhưng @tên người reply (reply.userName)
                      onReply={() => handleReply(parent.reviewId!, reply.userName)} 
                      // ẨN nút REPLY nếu là reply của mình
                      canReply={!!userId && reply.uid !== userId} 
                      isPharmacist={isAdmin} 
                    />
                  </View>
                ))}
              </View>
            ))
          )}

          {/* Review input */}
          <View style={styles.reviewInputBox}>
            {replyingTo ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  Trả lời: **{getParentUserName(replyingTo)}**
                </Text>
                <TouchableOpacity onPress={() => {setReplyingTo(null); setNewComment('');}}>
                  <Ionicons name="close-circle-outline" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                Viết đánh giá của bạn
              </Text>
            )}

            {/* Rating chỉ hiển thị khi KHÔNG phải là reply */}
            {!replyingTo && (
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const val = i + 1;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setNewRating(val)}
                    >
                      <Ionicons
                        name={val <= newRating ? "star" : "star-outline"}
                        size={24}
                        color="gold"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            
            <TextInput
              ref={commentInputRef} // Gán ref
              style={styles.reviewInput}
              multiline
              placeholder={reviewInputPlaceholder}
              value={newComment}
              onChangeText={setNewComment}
            />
            
            {reviewImageUrl && (
              <Image
                source={{ uri: reviewImageUrl }}
                style={styles.reviewImagePreview}
              />
            )}
            
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickReviewImage}
                disabled={uploadingReviewImage}
              >
                <Text style={{ color: "white" }}>
                  {uploadingReviewImage
                    ? "Uploading..."
                    : "Chọn ảnh"}
                </Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={styles.submitReviewButton}
                onPress={submitReview}
                disabled={uploadingReviewImage}
              >
                <Text style={{ color: "white" }}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FooterSection: Total + Order (ẩn với admin) */}
      <View style={styles.footer}>
        <View>
          <Text style={{ color: "#4B0082", fontSize: 16 }}>
            Total Price
          </Text>
          <Text
            style={{
              color: "#4B0082",
              fontSize: 18,
              fontWeight: "700",
              marginTop: 4,
            }}
          >
            ${totalPrice.toFixed(2)}
          </Text>
        </View>
        {!isAdmin && (
          <TouchableOpacity
            style={styles.orderButton}
            onPress={handleAddToCart}
          >
            <Ionicons
              name="cart"
              size={18}
              color="white"
            />
            <Text style={styles.orderButtonText}>Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ==== Sub component: ReviewCard ====

function ReviewCard({
  review,
  isReply = false,
  onReply,
  canReply, // Có được hiển thị nút reply không
  isPharmacist // Người đang xem có phải là Admin/Pharmacist không
}: {
  review: Review;
  isReply?: boolean;
  onReply: () => void;
  canReply: boolean;
  isPharmacist: boolean;
}) {
  const isPharmacistReview = review.isPharmacist;
  // FIX LỖI TypeScript: Đảm bảo fontWeight là chuỗi literal '700'
  const nameStyle: TextStyle = { 
      fontWeight: '700', 
      color: isPharmacistReview ? "#4B0082" : "#333" 
  };
  
  // SỬ DỤNG HÀM timeAgo
  const relativeTime = timeAgo(review.timestamp);

  return (
    <View style={styles.reviewCard}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name="person-circle"
          size={32}
          color={isPharmacistReview ? "#4B0082" : "#999"} // Admin khác màu
        />
        <View style={{ marginLeft: 8, flex: 1 }}>
          {/* SỬ DỤNG nameStyle ĐÃ FIX */}
          <Text style={nameStyle}>{review.userName} 
            {isPharmacistReview && <Text style={{ color: "#4B0082", fontSize: 12 }}> (Pharmacist)</Text>}
          </Text>
          
          {review.rating > 0 && ( // Chỉ hiển thị rating cho đánh giá gốc
            <View style={{ flexDirection: "row" }}>
              {Array.from({ length: Math.round(review.rating) }).map((_, i) => (
                <Ionicons key={i} name="star" size={14} color="gold" />
              ))}
            </View>
          )}
        </View>
        
        {/* Nút Reply */}
        {canReply && ( // Chỉ hiển thị nếu logic cho phép
          <TouchableOpacity onPress={onReply}>
            <Text
              style={{
                color: "#FF7A00",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              Reply
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{ marginTop: 4 }}>
        {isReply && <Text style={{ fontWeight: "bold" }}>Re: </Text>}
        {review.comment}
      </Text>
      {review.imageUrl ? (
        <Image source={{ uri: review.imageUrl }} style={styles.reviewImage} />
      ) : null}
      {/* HIỂN THỊ THỜI GIAN TƯƠNG ĐỐI */}
      <Text style={styles.timestampText}>{relativeTime}</Text>
    </View>
  );
}


// ==== Sub components: RowDetail + NumberRow (React version) ====

function RowDetailRN({ food }: { food: Food }) {
  return (
    <View style={styles.rowDetail}>
      <View style={styles.rowDetailItem}>
        <Ionicons name="time-outline" size={18} color="#4B0082" />
        <Text style={styles.rowDetailText}>{food.timeValue} min</Text>
      </View>

      <View style={styles.rowDetailItem}>
        <Ionicons name="star" size={18} color="#FFD700" />
        <Text style={styles.rowDetailText}>{food.star}</Text>
      </View>

      <View style={styles.rowDetailItem}>
        <Ionicons name="flame-outline" size={18} color="#4B0082" />
        <Text style={styles.rowDetailText}>{food.calorie}</Text>
      </View>
    </View>
  );
}

function NumberRowRN({
  food,
  numberInCart,
  onIncrement,
  onDecrement,
}: {
  food: Food;
  numberInCart: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.numberRow}>
      <Text style={styles.priceText}>${food.price.toFixed(2)}</Text>
      <View style={styles.numberBox}>
        <TouchableOpacity onPress={onDecrement} style={styles.plusMinus}>
          <Text style={styles.plusMinusText}>-</Text>
        </TouchableOpacity>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>{numberInCart}</Text>
        </View>
        <TouchableOpacity onPress={onIncrement} style={styles.plusMinus}>
          <Text style={styles.plusMinusText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==== Styles ====

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: {
    width: "100%",
    height: 320,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    padding: 6,
    backgroundColor: "#00000066",
    borderRadius: 20,
  },
  favoriteButton: {
    position: "absolute",
    top: 40,
    right: 16,
    padding: 6,
    backgroundColor: "#00000033",
    borderRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4B0082",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  rowDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  rowDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowDetailText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#4B0082",
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    justifyContent: "space-between",
  },
  priceText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4B0082",
  },
  numberBox: {
    flexDirection: "row",
    backgroundColor: "#FF7A00",
    borderRadius: 50,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plusMinus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plusMinusText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  numberText: {
    color: "#4B0082",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B0082",
  },
  descriptionText: {
    marginTop: 8,
    fontSize: 14,
    color: "#333",
  },
  descriptionInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 8,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveDescButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#4B0082",
    alignItems: "center",
  },
  saveDescText: {
    color: "white",
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: "#EEE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orderButton: {
    flexDirection: "row",
    backgroundColor: "#FF7A00",
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  orderButtonText: {
    color: "white",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },
  reviewCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    borderLeftWidth: 3,
    borderLeftColor: '#4B0082', // Viền cho review gốc
  },
  reviewImage: {
    marginTop: 8,
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  // Style cho khung Reply
  replyCardContainer: {
    marginLeft: 20, // Đẩy vào để phân biệt
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#FF7A00', // Viền khác màu cho reply
    paddingLeft: 5,
  },
  timestampText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  reviewInputBox: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  reviewInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    textAlignVertical: "top",
  },
  reviewImagePreview: {
    marginTop: 8,
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imageButton: {
    flex: 1,
    backgroundColor: "#777",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  submitReviewButton: {
    flex: 1,
    backgroundColor: "#4B0082",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});