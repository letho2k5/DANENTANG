// services/mainRepository.ts
import {
  equalTo,
  get,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  set,
  update
} from "firebase/database";
import { db } from "../services/firebase"; // đổi path cho đúng chỗ bạn đặt firebase.ts

import type { Banner } from "../models/Banner";
import type { Category } from "../models/Category";
import type { Food } from "../models/Food";

// Kiểu hàm huỷ đăng ký listener
export type Unsubscribe = () => void;

/* ---------------------- CATEGORY ---------------------- */

// Lắng nghe realtime Category (tương đương LiveData trong Kotlin)
export function subscribeCategories(callback: (categories: Category[]) => void): Unsubscribe {
  const categoriesRef = ref(db, "Category");

  const unsubscribe = onValue(categoriesRef, (snapshot) => {
    const list: Category[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (value) {
        list.push({
          id: value.Id,
          imagePath: value.ImagePath,
          name: value.Name,
        });
      }
    });
    callback(list);
  });

  return unsubscribe;
}

// Đọc 1 lần (nếu không cần realtime)
export async function getCategoriesOnce(): Promise<Category[]> {
  const snapshot = await get(ref(db, "Category"));
  const list: Category[] = [];
  snapshot.forEach((child) => {
    const value = child.val();
    if (value) {
      list.push({
        id: value.Id,
        imagePath: value.ImagePath,
        name: value.Name,
      });
    }
  });
  return list;
}

/* ----------------------- BANNER ----------------------- */

export function subscribeBanners(callback: (banners: Banner[]) => void): Unsubscribe {
  const bannersRef = ref(db, "Banners");

  const unsubscribe = onValue(bannersRef, (snapshot) => {
    const list: Banner[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (value) {
        list.push({ image: value.image });
      }
    });
    callback(list);
  });

  return unsubscribe;
}

export async function getBannersOnce(): Promise<Banner[]> {
  const snapshot = await get(ref(db, "Banners"));
  const list: Banner[] = [];
  snapshot.forEach((child) => {
    const value = child.val();
    if (value) {
      list.push({ image: value.image });
    }
  });
  return list;
}

/* -------------------- FOODS by CATEGORY -------------------- */

// Lắng nghe realtime food theo CategoryId (loadFiltered bên Kotlin)
export function subscribeFoodsByCategory(
  categoryId: string,
  callback: (foods: Food[]) => void,
): Unsubscribe {
  const foodsRef = ref(db, "Foods");
  const q = query(foodsRef, orderByChild("CategoryId"), equalTo(categoryId));

  const unsubscribe = onValue(q, (snapshot) => {
    const list: Food[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (value && value.CategoryId === categoryId) {
        const idFromKey = parseInt(child.key ?? "0", 10);

        const item: Food = {
          bestFood: value.BestFood,
          categoryId: value.CategoryId,
          description: value.Description,
          id: !isNaN(idFromKey) ? idFromKey : value.Id,
          imagePath: value.ImagePath,
          locationId: value.LocationId,
          price: value.Price,
          priceId: value.PriceId,
          timeId: value.TimeId,
          title: value.Title,
          calorie: value.Calorie,
          numberInCart: value.numberInCart ?? 0,
          star: value.Star,
          timeValue: value.TimeValue,
        };

        list.push(item);
      }
    });
    console.log("Filtered items for CategoryId", categoryId, list);
    callback(list);
  });

  return unsubscribe;
}

/* ----------------------- CRUD FOOD ----------------------- */

// Hàm tạo id mới kiểu số cho Food (thay thế hashCode trong Kotlin)
function generateNumericId(): number {
  // đơn giản: timestamp + random
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Thêm product mới
export async function addProduct(food: Omit<Food, "id">): Promise<void> {
  if (!food.title || !food.categoryId || food.price <= 0) {
    console.error("Invalid product data:", food);
    return;
  }

  const newId = generateNumericId();
  const newFood: Food = {
    ...food,
    id: newId,
  };

  const refFood = ref(db, `Foods/${newId}`);
  await set(refFood, {
    // giữ đúng key giống Firebase cũ
    CategoryId: newFood.categoryId,
    Title: newFood.title,
    Price: newFood.price,
    ImagePath: newFood.imagePath,
    Description: newFood.description,
    BestFood: newFood.bestFood,
    LocationId: newFood.locationId,
    PriceId: newFood.priceId,
    TimeId: newFood.timeId,
    Calorie: newFood.calorie,
    Star: newFood.star,
    TimeValue: newFood.timeValue,
    numberInCart: newFood.numberInCart ?? 0,
    Id: newFood.id,
  });
  console.log("Product added successfully with ID:", newId);
}

// Cập nhật product
export async function updateProduct(food: Food): Promise<void> {
  if (!food.id || !food.categoryId || !food.title || food.price <= 0) {
    console.error("Invalid product data:", food);
    return;
  }

  const updates = {
    CategoryId: food.categoryId,
    Title: food.title,
    Price: food.price,
    ImagePath: food.imagePath,
    Description: food.description,
    BestFood: food.bestFood,
    LocationId: food.locationId,
    PriceId: food.priceId,
    TimeId: food.timeId,
    Calorie: food.calorie,
    Star: food.star,
    TimeValue: food.timeValue,
    // không update numberInCart giống Kotlin
  };

  const refFood = ref(db, `Foods/${food.id}`);
  await update(refFood, updates);
  console.log("Cập nhật sản phẩm thành công:", food.id);
}

// Xoá product
export async function deleteProduct(foodId: number): Promise<void> {
  const refFood = ref(db, `Foods/${foodId}`);
  await remove(refFood);
  console.log("Product deleted successfully:", foodId);
}
