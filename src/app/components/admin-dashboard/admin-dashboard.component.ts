import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, XafPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);

  readonly products = toSignal(this.productService.getProducts(), { initialValue: [] });
  readonly orders = toSignal(this.orderService.getOrders(), { initialValue: [] });

  readonly totalRevenue = computed(() => {
    return this.orders().reduce((sum, o) => sum + o.totalAmount, 0);
  });

  readonly activeOrdersCount = computed(() => {
    return this.orders().filter((o) => o.status === 'pending' || o.status === 'out_for_delivery').length;
  });

  readonly totalStockUnits = computed(() => {
    return this.products().reduce((sum, p) => sum + p.stockQuantity, 0);
  });

  readonly lowStockAlerts = computed(() => {
    const alerts: { product: string; size: string; count: number; isOut: boolean }[] = [];
    this.products().forEach((p) => {
      Object.entries(p.stockBySize || {}).forEach(([size, qty]) => {
        if (qty === 0) {
          alerts.push({ product: p.name, size, count: 0, isOut: true });
        } else if (qty <= 2) {
          alerts.push({ product: p.name, size, count: qty, isOut: false });
        }
      });
    });
    return alerts;
  });

  readonly recentOrders = computed(() => {
    return this.orders().slice(0, 5);
  });
}
