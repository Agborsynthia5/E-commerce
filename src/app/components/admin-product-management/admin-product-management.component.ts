import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Order, OrderStatus, Product, ProductSize } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-admin-product-management',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, XafPipe],
  templateUrl: './admin-product-management.component.html',
  styleUrl: './admin-product-management.component.css',
})
export class AdminProductManagementComponent {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  readonly allProducts = toSignal(this.productService.getProducts(), { initialValue: [] });
  readonly allOrders = toSignal(this.orderService.getOrders(), { initialValue: [] });

  // Tab: 'products' | 'orders'
  readonly activeTab = signal<'products' | 'orders'>('products');
  readonly operationError = signal<string | null>(null);

  // Filters
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<string>('all');
  readonly selectedStatusFilter = signal<string>('all');

  // Order Details Modal
  readonly isOrderModalOpen = signal(false);
  readonly selectedOrder = signal<Order | null>(null);

  readonly filteredProducts = computed(() => {
    let items = [...this.allProducts()];

    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          p.team.toLowerCase().includes(query),
      );
    }

    const cat = this.selectedCategory();
    if (cat !== 'all') {
      items = items.filter((p) => p.categoryId === cat);
    }

    const st = this.selectedStatusFilter();
    if (st !== 'all') {
      items = items.filter((p) => (p.status ?? 'active') === st);
    }

    return items;
  });

  readonly filteredOrders = computed(() => {
    let list = [...this.allOrders()];
    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (o) =>
          o.referenceNumber.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query),
      );
    }
    return list;
  });

  formatStockBreakdown(product: Product): string {
    const s = product.stockBySize;
    if (!s) return `${product.stockQuantity} units`;
    return `S ${s.S ?? 0} · M ${s.M ?? 0} · L ${s.L ?? 0} · XL ${s.XL ?? 0} · XXL ${s.XXL ?? 0}`;
  }

  goToAddProduct(): void {
    this.router.navigate(['/admin/products/new']);
  }

  goToEditProduct(product: Product): void {
    this.router.navigate(['/admin/products', product.id, 'edit']);
  }

  async deleteProduct(id: string): Promise<void> {
    if (confirm('Are you sure you want to remove this jersey listing?')) {
      this.operationError.set(null);
      try {
        await this.productService.deleteProduct(id);
      } catch (error) {
        console.error('Could not delete product:', error);
        this.operationError.set('Could not save this change on this device. Please try again.');
      }
    }
  }

  openOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.isOrderModalOpen.set(true);
  }

  closeOrderModal(): void {
    this.isOrderModalOpen.set(false);
    this.selectedOrder.set(null);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    this.orderService.updateOrderStatus(orderId, status);
    if (this.selectedOrder()?.id === orderId) {
      this.selectedOrder.update((o) => (o ? { ...o, status } : null));
    }
  }
}
