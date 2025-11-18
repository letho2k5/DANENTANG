// hooks/useMainViewModel.ts
import { useEffect, useState } from "react";
import type { Banner } from "../models/Banner";
import type { Category } from "../models/Category";
import type { Food } from "../models/Food";
import {
    addProduct as addProductService,
    deleteProduct as deleteProductService,
    subscribeBanners,
    subscribeCategories,
    subscribeFoodsByCategory,
    Unsubscribe,
    updateProduct as updateProductService,
} from "../services/mainRepository";

type UseMainViewModelOptions = {
  categoryId?: string; // id Category muốn filter, giống loadFiltered(id)
};

export function useMainViewModel(options: UseMainViewModelOptions = {}) {
  const { categoryId } = options;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loadingBanner, setLoadingBanner] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==== loadBanner() tương đương LiveData<BannerModel> ====
  useEffect(() => {
    setLoadingBanner(true);
    let unsub: Unsubscribe | undefined;

    try {
      unsub = subscribeBanners((list) => {
        setBanners(list);
        setLoadingBanner(false);
      });
    } catch (e: any) {
      console.log("Error subscribeBanners", e);
      setError(e.message ?? "Error loading banners");
      setLoadingBanner(false);
    }

    return () => {
      unsub && unsub();
    };
  }, []);

  // ==== loadCategory() ====
  useEffect(() => {
    setLoadingCategory(true);
    let unsub: Unsubscribe | undefined;

    try {
      unsub = subscribeCategories((list) => {
        setCategories(list);
        setLoadingCategory(false);
      });
    } catch (e: any) {
      console.log("Error subscribeCategories", e);
      setError(e.message ?? "Error loading categories");
      setLoadingCategory(false);
    }

    return () => {
      unsub && unsub();
    };
  }, []);

  // ==== loadFiltered(id: String) ====
  useEffect(() => {
    if (!categoryId) {
      setFoods([]);
      setLoadingFoods(false);
      return;
    }

    setLoadingFoods(true);
    let unsub: Unsubscribe | undefined;

    try {
      unsub = subscribeFoodsByCategory(categoryId, (list) => {
        setFoods(list);
        setLoadingFoods(false);
      });
    } catch (e: any) {
      console.log("Error subscribeFoodsByCategory", e);
      setError(e.message ?? "Error loading foods");
      setLoadingFoods(false);
    }

    return () => {
      unsub && unsub();
    };
  }, [categoryId]);

  // ==== addProduct / updateProduct / deleteProduct ====

  async function addProduct(food: Omit<Food, "id">) {
    // giống repository.addProduct(food) nhưng dùng service React
    await addProductService(food);
  }

  async function updateProduct(food: Food) {
    await updateProductService(food);
  }

  async function deleteProduct(foodId: number) {
    await deleteProductService(foodId);
  }

  return {
    // data
    banners,
    categories,
    foods,

    // loading & error
    loadingBanner,
    loadingCategory,
    loadingFoods,
    error,

    // actions
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
