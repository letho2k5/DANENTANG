// FOODAPP/models/BankPaymentInfo.ts

/**
 * Định nghĩa cấu trúc dữ liệu cho thông tin thanh toán qua ngân hàng.
 * Thông tin này sẽ được lưu trữ nếu người dùng chọn phương thức 'Bank Payment'.
 */
export interface BankPaymentInfo {
  /** Tên ngân hàng của người dùng đã thực hiện thanh toán */
  bankName: string;
  /** Tên chủ tài khoản đã thực hiện thanh toán */
  accountHolderName: string;
  /** Số tài khoản hoặc mã giao dịch (tuỳ thuộc vào luồng thanh toán) */
  accountNumber: string;
  /** Số tiền đã được chuyển (để đối chiếu) */
  amount: number;
  /** Thời gian giao dịch được ghi nhận (ví dụ: timestamp) */
  transactionTime: number; 
  /** (Tùy chọn) Ảnh chụp màn hình hoặc mã tham chiếu giao dịch */
  transactionRef?: string;
}