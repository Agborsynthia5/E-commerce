import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../data/mock-data';
import { Category, Product, ProductSize } from '../models';

const STORAGE_KEY_PRODUCTS = 'leedstore_products';
const DATABASE_NAME_PRODUCTS = 'leedstore';
const DATABASE_VERSION_PRODUCTS = 1;
const DATABASE_STORE_PRODUCTS = 'products';
const DATABASE_RECORD_PRODUCTS = 'inventory';
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
  private readonly storedProducts = this.readStoredProducts();
  private readonly productsSubject = new BehaviorSubject<Product[]>(
    this.storedProducts ?? [...MOCK_PRODUCTS],
  );
  readonly products$ = this.productsSubject.asObservable();

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([...MOCK_CATEGORIES]);
  readonly categories$ = this.categoriesSubject.asObservable();
  private readonly persistenceReady = this.initializePersistence();
  private pendingWrite: Promise<void> = Promise.resolve();
  private productsRevision = 0;

  constructor() {
    void this.persistenceReady.catch((error) =>
      console.error('Could not initialize product storage:', error),
    );
    this.refreshCategoryCounts();
  }

  private readStoredProducts(): Product[] | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_PRODUCTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return this.normalizeProducts(parsed);
          }
        }
      } catch (err) {
        console.warn('Could not read products from localStorage:', err);
      }
    }
    return null;
  }

  private normalizeProducts(products: Product[]): Product[] {
    return products.map((product) => ({
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

  private async initializePersistence(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!window.indexedDB) {
      return null;
    }

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME_PRODUCTS, DATABASE_VERSION_PRODUCTS);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DATABASE_STORE_PRODUCTS);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open product storage.'));
      request.onblocked = () => reject(new Error('Product storage is blocked by another browser tab.'));
    });

    const savedProducts = await this.readFromDatabase(database);
    if (savedProducts !== null) {
      if (this.productsRevision === 0) {
        this.productsSubject.next(this.normalizeProducts(savedProducts));
        this.refreshCategoryCounts();
      }
    } else if (this.storedProducts !== null || this.productsRevision > 0) {
      await this.writeToDatabase(database, this.productsSubject.value);
    }

    return database;
  }

  private readFromDatabase(database: IDBDatabase): Promise<Product[] | null> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DATABASE_STORE_PRODUCTS, 'readonly');
      const request = transaction.objectStore(DATABASE_STORE_PRODUCTS).get(DATABASE_RECORD_PRODUCTS);
      let products: Product[] | null = null;
      request.onsuccess = () => {
        if (Array.isArray(request.result)) {
          products = request.result as Product[];
        }
      };
      transaction.oncomplete = () => resolve(products);
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not read saved products.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Reading saved products was interrupted.'));
    });
  }

  private writeToDatabase(database: IDBDatabase, products: Product[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DATABASE_STORE_PRODUCTS, 'readwrite', {
        durability: 'strict',
      });
      transaction.objectStore(DATABASE_STORE_PRODUCTS).put(products, DATABASE_RECORD_PRODUCTS);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not save products.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Saving products was interrupted.'));
    });
  }

  private persistProducts(products: Product[]): Promise<void> {
    const write = this.pendingWrite.then(async () => {
      const database = await this.persistenceReady;
      if (database) {
        await this.writeToDatabase(database, products);
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
      }
    });
    this.pendingWrite = write.catch(() => undefined);
    return write;
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

  async addProduct(newProduct: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    await this.persistenceReady;
    const id = newProduct.id || `jersey-${newProduct.team.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const product: Product = {
      ...newProduct,
      id,
      status: newProduct.status ?? 'active',
      gallery: newProduct.gallery?.length ? newProduct.gallery : [{ label: 'Front · Cover', url: newProduct.imageUrl }],
    };

    const updated = [product, ...this.productsSubject.value];
    await this.persistProducts(updated);
    this.productsSubject.next(updated);
    this.productsRevision++;
    this.refreshCategoryCounts();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    await this.persistenceReady;
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

    await this.persistProducts(products);
    this.productsSubject.next(products);
    this.productsRevision++;
    this.refreshCategoryCounts();
  }

  async deleteProduct(id: string): Promise<void> {
    await this.persistenceReady;
    const products = this.productsSubject.value.filter((p) => p.id !== id);
    await this.persistProducts(products);
    this.productsSubject.next(products);
    this.productsRevision++;
    this.refreshCategoryCounts();
  }

  async updateStock(id: string, size: ProductSize, quantityDelta: number): Promise<void> {
    await this.persistenceReady;
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
    this.productsRevision++;
    await this.persistProducts(products);
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
