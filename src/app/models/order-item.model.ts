import { ProductSize } from './product.model';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  selectedSize: ProductSize;
  quantity: number;
  priceAtPurchase: number;
}
