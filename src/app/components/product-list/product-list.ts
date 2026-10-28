import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product, ProductSize } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, XafPipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent {
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  readonly allProducts = toSignal(this.productService.getProducts(), { initialValue: [] });
  readonly categories = toSignal(this.productService.getCategories(), { initialValue: [] });

  // Filters state
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<string>('all'); // 'all' | 'national-teams' | 'clubs'
  readonly selectedTeams = signal<string[]>([]);
  readonly selectedSize = signal<ProductSize | null>(null);
  readonly maxPrice = signal<number | null>(null);
  readonly sortBy = signal<'featured' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');

  readonly teamsList = ['Cameroon', 'Nigeria', 'France', 'Argentina', 'Madrid', 'Barcelona'];
  readonly availableSizes: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      if (params['focusSearch']) {
        setTimeout(() => this.searchInputElement?.nativeElement.focus(), 100);
      }
    });
  }

  // Filtered & Sorted Products
  readonly filteredProducts = computed(() => {
    let items = [...this.allProducts()];

    // Category filter
    const cat = this.selectedCategory();
    if (cat && cat !== 'all' && cat !== 'all-jerseys') {
      items = items.filter((p) => p.categoryId === cat);
    }

    // Team filter
    const teams = this.selectedTeams();
    if (teams.length > 0) {
      items = items.filter((p) => teams.includes(p.team));
    }

    // Size filter
    const size = this.selectedSize();
    if (size) {
      items = items.filter((p) => (p.stockBySize?.[size] ?? 0) > 0 || p.sizes.includes(size));
    }

    // Price filter
    const maxP = this.maxPrice();
    if (maxP != null) {
      items = items.filter((p) => p.price <= maxP);
    }

    // Search query filter
    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.team.toLowerCase().includes(query) ||
          p.categoryId.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      );
    }

    // Sorting
    const sort = this.sortBy();
    if (sort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === 'name-asc') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  });

  readonly currentCategoryTitle = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'national-teams') return 'National teams';
    if (cat === 'clubs') return 'Clubs';
    return 'All jerseys';
  });

  // Category counts
  readonly allCount = computed(() => this.allProducts().length);
  readonly nationalCount = computed(
    () => this.allProducts().filter((p) => p.categoryId === 'national-teams').length,
  );
  readonly clubsCount = computed(
    () => this.allProducts().filter((p) => p.categoryId === 'clubs').length,
  );

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  toggleTeam(team: string): void {
    const current = this.selectedTeams();
    if (current.includes(team)) {
      this.selectedTeams.set(current.filter((t) => t !== team));
    } else {
      this.selectedTeams.set([...current, team]);
    }
  }

  isTeamSelected(team: string): boolean {
    return this.selectedTeams().includes(team);
  }

  toggleSize(size: ProductSize): void {
    if (this.selectedSize() === size) {
      this.selectedSize.set(null);
    } else {
      this.selectedSize.set(size);
    }
  }

  setSort(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as any;
    this.sortBy.set(val);
  }

  resetFilters(): void {
    this.selectedCategory.set('all');
    this.selectedTeams.set([]);
    this.selectedSize.set(null);
    this.maxPrice.set(null);
    this.searchTerm.set('');
    this.sortBy.set('featured');
  }

  formatSizesList(product: Product): string {
    return product.sizes.join(' · ');
  }
}
