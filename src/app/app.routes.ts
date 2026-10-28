import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminProductManagementComponent } from './components/admin-product-management/admin-product-management.component';
import { CartComponent } from './components/cart/cart';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation';
import { ProductDetailComponent } from './components/product-detail/product-detail';
import { ProductListComponent } from './components/product-list/product-list';

export const routes: Routes = [
  { path: '', component: ProductListComponent, title: 'LEEDSTORE | Find Your Colours' },
  { path: 'products/:id', component: ProductDetailComponent, title: 'LEEDSTORE | Product Details' },
  { path: 'cart', component: CartComponent, title: 'LEEDSTORE | Your Cart' },
  { path: 'checkout', component: CheckoutComponent, title: 'LEEDSTORE | Checkout' },
  { path: 'order-confirmation/:id', component: OrderConfirmationComponent, title: 'LEEDSTORE | Order Confirmed' },
  { path: 'admin', component: AdminDashboardComponent, title: 'LEEDSTORE | Store Owner Overview' },
  { path: 'admin/products', component: AdminProductManagementComponent, title: 'LEEDSTORE | Store Management' },
  { path: 'admin/orders', component: AdminProductManagementComponent, title: 'LEEDSTORE | Order Management' },
  { path: '**', redirectTo: '' },
];
