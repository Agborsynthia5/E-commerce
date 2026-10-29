import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { combineLatest } from 'rxjs';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { CartService, FLAT_DELIVERY_FEE } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, XafPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  private readonly cartService = inject(CartService);
  private readonly productService    = inject(ProductService);
  private readonly router = inject(Router);

  readonly cartCount = toSignal(this.cartService.getItemCount(), {
    initialValue: 0,
  });

  private readonly cartAndProducts = toSignal(
    combineLatest([this.cartService.items$, this.productService.products$]),
    { initialValue: [[], []] },
  );

  readonly cartTotalWithDelivery = computed(() => {
    const [items, products] = this.cartAndProducts();
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    if (count === 0) {
      return 0;
    }

    const subtotal = items.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return sum + (prod?.price ?? 6000) * item.quantity;
    }, 0);

    return subtotal + FLAT_DELIVERY_FEE;
  });

  readonly isOwnerRoute = computed(() => {
    return this.router.url.startsWith('/admin');
  });

}
