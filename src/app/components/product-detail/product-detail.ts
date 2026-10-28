import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { Product, ProductSize } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { CartService, FLAT_DELIVERY_FEE } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, XafPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  readonly allSizes: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  readonly selectedSize = signal<ProductSize>('M');
  readonly currentImageIndex = signal<number>(0);
  readonly quantity = signal<number>(1);
  readonly addedNotification = signal<string | null>(null);

  readonly productSignal = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => this.productService.getProductById(id)),
    ),
    { initialValue: undefined },
  );

  readonly product = computed(() => this.productSignal());

  readonly galleryImages = computed(() => {
    const prod = this.product();
    if (!prod) return [];
    if (prod.gallery && prod.gallery.length > 0) {
      return prod.gallery;
    }
    return [
      { label: 'Front', url: prod.imageUrl },
      { label: 'Back', url: prod.imageUrl },
      { label: 'Fabric & crest', url: prod.imageUrl },
    ];
  });

  readonly activeImage = computed(() => {
    const images = this.galleryImages();
    const idx = this.currentImageIndex();
    return images[idx] || images[0] || { label: 'Front', url: this.product()?.imageUrl ?? '' };
  });

  readonly availableStockInSelectedSize = computed(() => {
    const prod = this.product();
    const size = this.selectedSize();
    if (!prod) return 0;
    return prod.stockBySize?.[size] ?? (prod.sizes.includes(size) ? 5 : 0);
  });

  readonly isSelectedSizeSoldOut = computed(() => {
    return this.availableStockInSelectedSize() <= 0;
  });

  readonly stockStatusNotice = computed(() => {
    const prod = this.product();
    const size = this.selectedSize();
    const available = this.availableStockInSelectedSize();
    if (!prod) return '';

    const hasSoldOut = Object.entries(prod.stockBySize || {}).find(([sz, qty]) => qty === 0);
    const soldOutText = hasSoldOut ? ` ${hasSoldOut[0]} sold out.` : '';

    if (available <= 0) {
      return `Size ${size} is currently sold out.${soldOutText}`;
    }

    return `In stock · ${available} available in ${size}.${soldOutText}`;
  });

  readonly singleJerseyTotalWithDelivery = computed(() => {
    const prod = this.product();
    const price = prod?.price ?? 6000;
    return (price * this.quantity()) + FLAT_DELIVERY_FEE;
  });

  setImage(index: number): void {
    if (index >= 0 && index < this.galleryImages().length) {
      this.currentImageIndex.set(index);
    }
  }

  prevImage(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.currentImageIndex.set((this.currentImageIndex() - 1 + total) % total);
  }

  nextImage(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.currentImageIndex.set((this.currentImageIndex() + 1) % total);
  }

  selectSize(size: ProductSize): void {
    this.selectedSize.set(size);
    this.addedNotification.set(null);
  }

  isSizeSoldOut(product: Product, size: ProductSize): boolean {
    return (product.stockBySize?.[size] ?? 0) <= 0;
  }

  incrementQty(): void {
    const max = this.availableStockInSelectedSize();
    if (this.quantity() < max) {
      this.quantity.update((q) => q + 1);
    }
  }

  decrementQty(): void {
    if (this.quantity() > 1) {
      this.quantity.update((q) => q - 1);
    }
  }

  addToCart(): void {
    const prod = this.product();
    const size = this.selectedSize();
    const qty = this.quantity();

    if (!prod || this.isSelectedSizeSoldOut()) {
      return;
    }

    this.cartService.addItem(prod.id, size, qty);
    this.addedNotification.set(`Added ${qty}x ${prod.name} (Size ${size}) to cart.`);
    setTimeout(() => this.addedNotification.set(null), 4000);
  }
}
