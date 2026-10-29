import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MOCK_ORDERS } from '../data/mock-data';
import { Order, OrderAddress, OrderItem, OrderStatus, Product } from '../models';
import { CartService, FLAT_DELIVERY_FEE } from './cart.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);

  private readonly ordersSubject = new BehaviorSubject<Order[]>([...MOCK_ORDERS]);
  readonly orders$ = this.ordersSubject.asObservable();

  getOrders(): Observable<Order[]> {
    return this.orders$;
  }

  getOrderById(id: string): Observable<Order | undefined> {
    return this.orders$.pipe(
      map((orders) => orders.find((o) => o.id === id || o.referenceNumber === id)),
    );
  }

  placeOrder(address: OrderAddress, paymentMethod: 'cash_on_delivery' | 'online' = 'cash_on_delivery'): Order {
    const cartItems = this.cartService.getCurrentItems();
    const products = this.productService.getSnapshot();

    const orderItems: OrderItem[] = cartItems.map((cartItem) => {
      const prod = products.find((p) => p.id === cartItem.productId);
      const unitPrice = prod?.price ?? 6000;
      return {
        id: `oi-${crypto.randomUUID().slice(0, 6)}`,
        productId: cartItem.productId,
        productName: prod?.name ?? 'Football Jersey',
        productImageUrl: prod?.imageUrl ?? '/assets/jerseys/cameroon%20home.jpg',
        categoryName: prod?.categoryId === 'national-teams' ? 'National teams' : 'Clubs',
        selectedSize: cartItem.selectedSize,
        quantity: cartItem.quantity,
        unitPrice,
        lineTotal: unitPrice * cartItem.quantity,
      };
    });

    const subtotal = orderItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const deliveryFee = orderItems.length > 0 ? FLAT_DELIVERY_FEE : 0;
    const totalAmount = subtotal + deliveryFee;

    const refNumber = `KH-${Math.floor(1043 + Math.random() * 8000)}`;

    const newOrder: Order = {
      id: refNumber,
      referenceNumber: refNumber,
      userId: 'alex-nsom',
      customerName: address.fullName,
      customerPhone: address.phone,
      customerEmail: address.email,
      address,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      status: 'pending',
      statusLabel: 'Pending confirmation',
      createdAt: new Date(),
    };

    // Deduct stock
    orderItems.forEach((item) => {
      this.productService.updateStock(item.productId, item.selectedSize, -item.quantity);
    });

    // Clear cart
    this.cartService.clearCart();

    // Prepend new order
    this.ordersSubject.next([newOrder, ...this.ordersSubject.value]);

    return newOrder;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    const statusLabels: Record<OrderStatus, string> = {
      pending: 'Pending confirmation',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    const orders = this.ordersSubject.value.map((o) => {
      if (o.id === orderId || o.referenceNumber === orderId) {
        return {
          ...o,
          status,
          statusLabel: statusLabels[status],
        };
      }
      return o;
    });

    this.ordersSubject.next(orders);
  }
}
