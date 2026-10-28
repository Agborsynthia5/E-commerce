import { ProductSize } from './product.model';

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  selectedSize: ProductSize;
  quantity: number;
}
