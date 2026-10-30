import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { OrderAddress, Product } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { CartService, FLAT_DELIVERY_FEE } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, FormsModule, XafPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent {
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  // Form Fields default to Buea
  fullName = 'Agbor Synthia';
  phone = '+237 6 51 26 95 53';
  email = 'agborsynthia5@gmail.com';
  street = 'Bakweri Town';
  city = 'Buea';
  neighbourhood = 'Beside Frankfill School';
  deliveryInstructions = 'Call on arrival.';
  paymentMethod: 'cash_on_delivery' = 'cash_on_delivery';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  private readonly cartAndProducts = toSignal(
    combineLatest([this.cartService.items$, this.productService.products$]),
    { initialValue: [[], []] },
  );

  readonly items = computed(() => {
    const [cartItems, products] = this.cartAndProducts();
    return cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = product?.price ?? 6000;
      return {
        id: item.id,
        productId: item.productId,
        name: product?.name ?? 'Football Jersey',
        imageUrl: product?.imageUrl ?? 'assets/jerseys/cameroon-home.svg',
        selectedSize: item.selectedSize,
        quantity: item.quantity,
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

  async onSubmitOrder(): Promise<void> {
    if (!this.fullName || !this.phone || !this.email || !this.street || !this.city || !this.neighbourhood) {
      this.errorMessage.set('Please fill in all required contact and delivery address fields.');
      return;
    }

    if (this.items().length === 0) {
      this.errorMessage.set('Your cart is empty. Please add items before placing an order.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const address: OrderAddress = {
      fullName: this.fullName,
      phone: this.phone,
      email: this.email,
      street: this.street,
      city: this.city,
      neighbourhood: this.neighbourhood,
      instructions: this.deliveryInstructions,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const order = await this.orderService.placeOrder(address, this.paymentMethod);
      this.router.navigate(['/order-confirmation', order.id]);
    } catch (error) {
      console.error('Could not complete order:', error);
      this.errorMessage.set('Could not save your order changes. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
