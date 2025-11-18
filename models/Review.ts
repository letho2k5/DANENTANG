// models/Review.ts
export interface Review {
  userName: string;          // tên hiển thị
  rating: number;            // 0..5
  comment: string;
  isPharmacist: boolean;
  parentReviewId?: string | null;
  reviewId?: string | null;
  uid?: string | null;
  timestamp: number;         // millis
  imageUrl?: string | null;  // link Cloudinary
}
