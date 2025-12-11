// update-all-reviews-avatar.js
// CẬP NHẬT TOÀN BỘ REVIEW CŨ ĐỂ CÓ ẢNH ĐẠI DIỆN (profilePictureUrl → avatarUrl)

// Firebase config lấy từ app.json của bạn
const firebaseConfig = {
  apiKey: "AIzaSyD1lTp860WFStCO05NSXbFqE2R5BBWdYgw",
  authDomain: "doancuoiky-bf19d.firebaseapp.com",
  databaseURL: "https://doancuoiky-bf19d-default-rtdb.firebaseio.com",
  projectId: "doancuoiky-bf19d",
  storageBucket: "doancuoiky-bf19d.appspot.com",
  messagingSenderId: "440136984740",
  appId: "1:440136984740:web:96b0246883f1a7ad785e31"
};

// Khởi tạo Firebase
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, update } = require("firebase/database");

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function updateAllReviewsAvatar() {
  console.log("Bắt đầu cập nhật avatar cho tất cả review cũ...");

  try {
    // 1. Lấy tất cả users để map uid → profilePictureUrl
    const usersSnap = await get(ref(db, "users"));
    if (!usersSnap.exists()) {
      console.log("Không có user nào.");
      return;
    }

    const users = usersSnap.val();
    const avatarMap = {};

    Object.keys(users).forEach(uid => {
      const user = users[uid];
      if (user.profilePictureUrl) {
        avatarMap[uid] = user.profilePictureUrl;
      }
    });

    console.log(`Tìm thấy ${Object.keys(avatarMap).length} user có ảnh đại diện`);

    // 2. Lấy tất cả review
    const reviewsSnap = await get(ref(db, "Reviews"));
    if (!reviewsSnap.exists()) {
      console.log("Không có review nào để cập nhật.");
      return;
    }

    const foods = reviewsSnap.val();
    let totalUpdated = 0;

    for (const foodId in foods) {
      const reviews = foods[foodId];

      for (const reviewId in reviews) {
        const review = reviews[reviewId];
        const uid = review.uid;

        // Chỉ update nếu:
        // - Có uid
        // - User đó có profilePictureUrl
        // - Review chưa có avatarUrl
        if (uid && avatarMap[uid] && !review.avatarUrl && !review.profilePictureUrl) {
          const reviewRef = ref(db, `Reviews/${foodId}/${reviewId}`);
          await update(reviewRef, {
            avatarUrl: avatarMap[uid]
          });
          totalUpdated++;
          console.log(`Đã cập nhật: Review ${reviewId} (user: ${uid})`);
        }
      }
    }

    console.log("HOÀN TẤT!");
    console.log(`Đã cập nhật avatar cho ${totalUpdated} review cũ`);
    console.log("Giờ vào app → tất cả review đều có ảnh đại diện rồi đó!");
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

// Chạy luôn
updateAllReviewsAvatar();