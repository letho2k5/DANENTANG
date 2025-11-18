// models/Food.ts
export interface Food {
  bestFood: boolean;
  categoryId: string;
  description: string;
  id: number;
  imagePath: string;
  locationId: number;
  price: number;
  priceId: number;
  timeId: number;
  title: string;
  calorie: number;
  numberInCart: number;
  star: number;
  timeValue: number;
}
