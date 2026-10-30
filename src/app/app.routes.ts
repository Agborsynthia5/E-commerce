import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { AdminProductManagementComponent } from './components/admin-product-management/admin-product-management.component';
import { CartComponent } from './components/cart/cart';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation';
import { ProductDetailComponent } from './components/product-detail/product-detail';
import { ProductEditComponent } from './components/product-edit/product-edit';
import { ProductListComponent } from './components/product-list/product-list';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // ── Public routes (anyone can visit) ──────────────────────────────────────
  { path: '',                    component: ProductListComponent,    title: 'LEEDSTORE | Find Your Colours' },
  { path: 'products/:id',        component: ProductDetailComponent,  title: 'LEEDSTORE | Product Details' },
  { path: 'cart',                component: CartComponent,           title: 'LEEDSTORE | Your Cart' },
  { path: 'checkout',            component: CheckoutComponent,       title: 'LEEDSTORE | Checkout' },
  { path: 'order-confirmation/:id', component: OrderConfirmationComponent, title: 'LEEDSTORE | Order Confirmed' },

  // ── Admin login page (public — so you can reach it to log in) ─────────────
  { path: 'admin/login',         component: AdminLoginComponent,     title: 'LEEDSTORE | Store Owner Login' },

  // ── Protected admin routes (owner login required) ─────────────────────────
  {
    path: 'admin',
    component: AdminDashboardComponent,
    title: 'LEEDSTORE | Store Owner Overview',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/products',
    component: AdminProductManagementComponent,
    title: 'LEEDSTORE | Store Management',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/products/new',
    component: ProductEditComponent,
    title: 'LEEDSTORE | Add Product',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/products/:id/edit',
    component: ProductEditComponent,
    title: 'LEEDSTORE | Edit Product',
    canActivate: [adminGuard],
  },
  {
    path: 'admin/orders',
    component: AdminProductManagementComponent,
    title: 'LEEDSTORE | Order Management',
    canActivate: [adminGuard],
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
