import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MOCK_CART_ITEMS, MOCK_USER_ID } from '../data/mock-data';
import { CartItem, Product, ProductSize } from '../models';

export interface CartLine {
  item: CartItem;
  product: Product | undefined;
  lineTotal: number;
}

export const FLAT_DELIVERY_FEE = 500;
const STORAGE_KEY_CART = 'leedstore_cart';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.loadStoredCart());
  readonly items$ = this.itemsSubject.asObservable();

  private loadStoredCart(): CartItem[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_CART);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Could not read cart from localStorage:', err);
      }
    }
    return [...MOCK_CART_ITEMS];
  }

  private persistCart(items: CartItem[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(items));
      } catch (err) {
        console.warn('Could not save cart to localStorage:', err);
      }
    }
  }

  addItem(productId: string, selectedSize: ProductSize, quantity = 1): void {
    if (quantity < 1) {
      return;
    }

    const items = [...this.itemsSubject.value];
    const existing = items.find(
      (item) => item.productId === productId && item.selectedSize === selectedSize,
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        id: `cart-${crypto.randomUUID().slice(0, 8)}`,
        userId: MOCK_USER_ID,
        productId,
        selectedSize,
        quantity,
      });
    }

    this.itemsSubject.next(items);
    this.persistCart(items);
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity < 1) {
      this.removeItem(itemId);
      return;
    }

    const items = this.itemsSubject.value.map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    );
    this.itemsSubject.next(items);
    this.persistCart(items);
  }

  removeItem(itemId: string): void {
    const updated = this.itemsSubject.value.filter((item) => item.id !== itemId);
    this.itemsSubject.next(updated);
    this.persistCart(updated);
  }

  clearCart(): void {
    this.itemsSubject.next([]);
    this.persistCart([]);
  }

  getCurrentItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getItemCount(): Observable<number> {
    return this.items$.pipe(
      map((items) => items.reduce((total, item) => total + item.quantity, 0)),
    );
  }

  getCartLines(products: Product[]): CartLine[] {
    return this.itemsSubject.value.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return {
        item,
        product,
        lineTotal: (product?.price ?? 0) * item.quantity,
      };
    });
  }

  getSubtotal(products: Product[]): number {
    return this.getCartLines(products).reduce((sum, line) => sum + line.lineTotal, 0);
  }

  calculateTotal(products: Product[]): { subtotal: number; deliveryFee: number; total: number } {
    const count = this.itemsSubject.value.reduce((total, item) => total + item.quantity, 0);
    const subtotal = this.getSubtotal(products);
    const deliveryFee = count > 0 ? FLAT_DELIVERY_FEE : 0;
    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    };
  }
}
