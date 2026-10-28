import { ProductSize } from './product.model';

export type OrderStatus = 'pending' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderAddress {
  fullName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  neighbourhood: string;
  instructions?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  categoryName?: string;
  selectedSize: ProductSize;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  referenceNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'cash_on_delivery' | 'online';
  status: OrderStatus;
  statusLabel: string;
  createdAt: Date;
}
