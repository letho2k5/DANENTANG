// models/Order.ts
import type { BankPaymentInfo } from "./BankPaymentInfo";
import type { Food } from "./Food";

export interface Order {
  id: string;
  items: Food[];
  total: number;
  tax: number;
  deliveryFee: number;
  status: string; // "Wait Confirmed", "Shipping", "Received", ...
  userId?: string;
  userName?: string | null;
  address: string;
  paymentMethod: string; // "Cash on Delivery" | "Bank Payment"
  bankPaymentInfo?: BankPaymentInfo | null;
  // THÊM DÒNG NÀY – QUAN TRỌNG!
  createdAt?: number; // thời gian tạo đơn hàng (timestamp)
}
