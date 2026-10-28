import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Order, OrderStatus, Product, ProductSize } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-admin-product-management',
  standalone: true,
  imports: [FormsModule, DatePipe, XafPipe],
  templateUrl: './admin-product-management.component.html',
  styleUrl: './admin-product-management.component.css',
})
export class AdminProductManagementComponent {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);

  readonly allProducts = toSignal(this.productService.getProducts(), { initialValue: [] });
  readonly allOrders = toSignal(this.orderService.getOrders(), { initialValue: [] });

  // Tab: 'products' | 'orders'
  readonly activeTab = signal<'products' | 'orders'>('products');

  // Filters
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<string>('all');
  readonly selectedStatusFilter = signal<string>('all');

  // Add / Edit Modal State
  readonly isModalOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);

  // Form Fields for Add/Edit
  formName = '';
  formTeam = '';
  formCategoryId = 'national-teams';
  formPrice = 6000;
  formImageUrl = 'assets/jerseys/cameroon-home.svg';
  formDescription = '';
  formStockS = 4;
  formStockM = 5;
  formStockL = 5;
  formStockXL = 4;
  formStockXXL = 2;
  formStatus: 'active' | 'inactive' = 'active';

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

  // Size breakdown text: "S 4 · M 8 · L 7 · XL 5 · XXL 0"
  formatStockBreakdown(product: Product): string {
    const s = product.stockBySize;
    if (!s) return `${product.stockQuantity} units`;
    return `S ${s.S ?? 0} · M ${s.M ?? 0} · L ${s.L ?? 0} · XL ${s.XL ?? 0} · XXL ${s.XXL ?? 0}`;
  }

  openAddModal(): void {
    this.editingProduct.set(null);
    this.formName = '';
    this.formTeam = '';
    this.formCategoryId = 'national-teams';
    this.formPrice = 6000;
    this.formImageUrl = 'assets/jerseys/cameroon-home.svg';
    this.formDescription = 'High-performance national pride team kit.';
    this.formStockS = 3;
    this.formStockM = 5;
    this.formStockL = 5;
    this.formStockXL = 4;
    this.formStockXXL = 2;
    this.formStatus = 'active';
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.formName = product.name;
    this.formTeam = product.team;
    this.formCategoryId = product.categoryId;
    this.formPrice = product.price;
    this.formImageUrl = product.imageUrl;
    this.formDescription = product.description;
    this.formStockS = product.stockBySize?.S ?? 0;
    this.formStockM = product.stockBySize?.M ?? 0;
    this.formStockL = product.stockBySize?.L ?? 0;
    this.formStockXL = product.stockBySize?.XL ?? 0;
    this.formStockXXL = product.stockBySize?.XXL ?? 0;
    this.formStatus = product.status ?? 'active';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingProduct.set(null);
  }

  saveProduct(): void {
    const stockBySize: Record<ProductSize, number> = {
      S: Number(this.formStockS) || 0,
      M: Number(this.formStockM) || 0,
      L: Number(this.formStockL) || 0,
      XL: Number(this.formStockXL) || 0,
      XXL: Number(this.formStockXXL) || 0,
    };

    const totalStock = Object.values(stockBySize).reduce((sum, q) => sum + q, 0);

    const sizes: ProductSize[] = [];
    if (stockBySize.S > 0) sizes.push('S');
    if (stockBySize.M > 0) sizes.push('M');
    if (stockBySize.L > 0) sizes.push('L');
    if (stockBySize.XL > 0) sizes.push('XL');
    if (stockBySize.XXL > 0) sizes.push('XXL');

    const editing = this.editingProduct();
    if (editing) {
      this.productService.updateProduct(editing.id, {
        name: this.formName,
        team: this.formTeam,
        categoryId: this.formCategoryId,
        price: Number(this.formPrice),
        imageUrl: this.formImageUrl,
        description: this.formDescription,
        stockBySize,
        stockQuantity: totalStock,
        sizes: sizes.length ? sizes : ['M'],
        status: this.formStatus,
      });
    } else {
      this.productService.addProduct({
        name: this.formName,
        team: this.formTeam,
        categoryId: this.formCategoryId,
        price: Number(this.formPrice),
        imageUrl: this.formImageUrl,
        description: this.formDescription,
        stockBySize,
        stockQuantity: totalStock,
        sizes: sizes.length ? sizes : ['M'],
        gallery: [{ label: 'Front', url: this.formImageUrl }],
        status: this.formStatus,
      });
    }

    this.closeModal();
  }

  deleteProduct(id: string): void {
    if (confirm('Are you sure you want to remove this jersey listing?')) {
      this.productService.deleteProduct(id);
      this.closeModal();
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
