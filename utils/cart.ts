// utils/cart.ts
import type { Food } from "../models/Food";

export function calculateSelectedTotal(
  cartItems: Food[],
  selectedItems: Record<string, boolean>,
): number {
  return cartItems
    .filter((item) => selectedItems[item.title] === true)
    .reduce((sum, item) => sum + item.price * item.numberInCart, 0);
}

export function calculateTax(selectedTotal: number): number {
  const percentTax = 0.02;
  return Math.round(selectedTotal * percentTax * 100) / 100;
}
