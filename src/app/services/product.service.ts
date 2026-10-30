import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../data/mock-data';
import { Category, Product, ProductSize } from '../models';

const STORAGE_KEY_PRODUCTS = 'leedstore_products';
const LEGACY_IMAGE_URLS: Record<string, string> = {
  'assets/jerseys/cameroon-home.svg': '/assets/jerseys/cameroon%20home.jpg',
  'assets/jerseys/cameroon-back.svg': '/assets/jerseys/backview%20cameroon%20home.jpg',
  'assets/jerseys/cameroon-detail.svg': '/assets/jerseys/neckview%20cameroon%20home.jpg',
  'assets/jerseys/france-home.svg': '/assets/jerseys/france-home.svg',
  'assets/jerseys/nigeria-home.svg': '/assets/jerseys/Nigeria%20home.jpg',
  'assets/jerseys/argentina-home.svg': '/assets/jerseys/argentina.jpeg',
  'assets/jerseys/madrid-home.svg': '/assets/jerseys/real%20white.jpg',
  'assets/jerseys/barcelona-home.svg': '/assets/jerseys/barca%20new%20home.jpg',
  'assets/jerseys/city-home.svg': '/assets/jerseys/city-home.svg',
};

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly productsSubject = new BehaviorSubject<Product[]>(this.loadStoredProducts());
  readonly products$ = this.productsSubject.asObservable();

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([...MOCK_CATEGORIES]);
  readonly categories$ = this.categoriesSubject.asObservable();

  constructor() {
    this.refreshCategoryCounts();
  }

  private loadStoredProducts(): Product[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_PRODUCTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((product: Product) => ({
              ...product,
              imageUrl: LEGACY_IMAGE_URLS[product.imageUrl] ?? product.imageUrl,
              gallery: Array.isArray(product.gallery)
                ? product.gallery.map((image) => ({
                    ...image,
                    url: LEGACY_IMAGE_URLS[image.url] ?? image.url,
                  }))
                : product.gallery,
            }));
          }
        }
      } catch (err) {
        console.warn('Could not read products from localStorage:', err);
      }
    }
    return [...MOCK_PRODUCTS];
  }

  private persistProducts(products: Product[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
      } catch (err) {
        console.warn('Could not save products to localStorage:', err);
      }
    }
  }

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
        if (!categoryId || categoryId === 'all-jerseys' || categoryId === 'all') {
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
    const id = newProduct.id || `jersey-${newProduct.team.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const product: Product = {
      ...newProduct,
      id,
      status: newProduct.status ?? 'active',
      gallery: newProduct.gallery?.length ? newProduct.gallery : [{ label: 'Front · Cover', url: newProduct.imageUrl }],
    };

    const updated = [product, ...this.productsSubject.value];
    this.productsSubject.next(updated);
    this.persistProducts(updated);
    this.refreshCategoryCounts();
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    const products = this.productsSubject.value.map((product) => {
      if (product.id !== id) {
        return product;
      }

      const updated = { ...product, ...updates };
      if (updates.stockBySize) {
        updated.stockQuantity = Object.values(updates.stockBySize).reduce((sum, qty) => sum + (qty || 0), 0);
      }
      return updated;
    });

    this.productsSubject.next(products);
    this.persistProducts(products);
    this.refreshCategoryCounts();
  }

  deleteProduct(id: string): void {
    const products = this.productsSubject.value.filter((p) => p.id !== id);
    this.productsSubject.next(products);
    this.persistProducts(products);
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
    this.persistProducts(products);
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
