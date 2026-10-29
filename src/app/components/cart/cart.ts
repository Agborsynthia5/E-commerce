import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { Product } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { CartService, FLAT_DELIVERY_FEE } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

interface CartViewItem {
  id: string;
  productId: string;
  selectedSize: string;
  quantity: number;
  product?: Product;
  productName: string;
  categoryTag: string;
  imageUrl: string;
  unitPrice: number;
  lineTotal: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, XafPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent {
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  private readonly cartAndProducts = toSignal(
    combineLatest([this.cartService.items$, this.productService.products$]),
    { initialValue: [[], []] },
  );

  readonly items = computed<CartViewItem[]>(() => {
    const [cartItems, products] = this.cartAndProducts();
    return cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = product?.price ?? 6000;
      return {
        id: item.id,
        productId: item.productId,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        product,
        productName: product?.name ?? 'Football Jersey',
        categoryTag: (product?.categoryId === 'national-teams' ? 'National teams' : 'Clubs'),
        imageUrl: product?.imageUrl ?? '/assets/jerseys/cameroon%20home.jpg',
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });
  });

  readonly totalItemCount = computed(() => {
    return this.items().reduce((sum, item) => sum + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    return this.items().reduce((sum, item) => sum + item.lineTotal, 0);
  });

  readonly deliveryFee = computed(() => {
    return this.totalItemCount() > 0 ? FLAT_DELIVERY_FEE : 0;
  });

  readonly grandTotal = computed(() => {
    return this.subtotal() + this.deliveryFee();
  });

  updateQuantity(itemId: string, newQty: number): void {
    this.cartService.updateQuantity(itemId, newQty);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
