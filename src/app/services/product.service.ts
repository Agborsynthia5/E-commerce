import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../data/mock-data';
import { Category, Product, ProductSize } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly productsSubject = new BehaviorSubject<Product[]>([...MOCK_PRODUCTS]);
  readonly products$ = this.productsSubject.asObservable();

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([...MOCK_CATEGORIES]);
  readonly categories$ = this.categoriesSubject.asObservable();

  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  getSnapshot(): Product[] {
    return this.productsSubject.value;
  }

  getProductById(id: string): Observable<Product | undefined> {
    return this.products$.pipe(
      map((products) => products.find((product) => product.id === id)),
    );
  }

  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.products$.pipe(
      map((products) => {
        if (!categoryId || categoryId === 'all-jerseys') {
          return products;
        }
        return products.filter((product) => product.categoryId === categoryId);
      }),
    );
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  addProduct(newProduct: Omit<Product, 'id'> & { id?: string }): Product {
    const id = newProduct.id || `jersey-${newProduct.team.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const product: Product = {
      ...newProduct,
      id,
      status: newProduct.status ?? 'active',
      gallery: newProduct.gallery?.length ? newProduct.gallery : [{ label: 'Front', url: newProduct.imageUrl }],
    };

    const updated = [product, ...this.productsSubject.value];
    this.productsSubject.next(updated);
    this.refreshCategoryCounts();
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    const products = this.productsSubject.value.map((product) => {
      if (product.id !== id) {
        return product;
      }

      const updated = { ...product, ...updates };
      // Recalculate total stock from stockBySize if updated
      if (updates.stockBySize) {
        updated.stockQuantity = Object.values(updates.stockBySize).reduce((sum, qty) => sum + (qty || 0), 0);
      }
      return updated;
    });

    this.productsSubject.next(products);
    this.refreshCategoryCounts();
  }

  deleteProduct(id: string): void {
    const products = this.productsSubject.value.filter((p) => p.id !== id);
    this.productsSubject.next(products);
    this.refreshCategoryCounts();
  }

  updateStock(id: string, size: ProductSize, quantityDelta: number): void {
    const products = this.productsSubject.value.map((product) => {
      if (product.id !== id) {
        return product;
      }

      const stockBySize = { ...product.stockBySize };
      const current = stockBySize[size] || 0;
      stockBySize[size] = Math.max(0, current + quantityDelta);
      const totalStock = Object.values(stockBySize).reduce((sum, q) => sum + q, 0);

      return {
        ...product,
        stockBySize,
        stockQuantity: totalStock,
      };
    });

    this.productsSubject.next(products);
  }

  private refreshCategoryCounts(): void {
    const products = this.productsSubject.value;
    const categories = this.categoriesSubject.value.map((cat) => {
      if (cat.id === 'all-jerseys') {
        return { ...cat, count: products.length };
      }
      return {
        ...cat,
        count: products.filter((p) => p.categoryId === cat.id).length,
      };
    });
    this.categoriesSubject.next(categories);
  }
}
