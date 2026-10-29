import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { GalleryImage, Product, ProductSize } from '../../models';
import { XafPipe } from '../../pipes/xaf-currency.pipe';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [RouterLink, FormsModule, XafPipe],
  templateUrl: './product-edit.html',
  styleUrl: './product-edit.css',
})
export class ProductEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  readonly isNew = signal(false);
  readonly productId = signal<string>('');

  // Form Fields
  name = signal('');
  categoryId = signal('national-teams');
  price = signal(6000);
  team = signal('');
  description = signal('');
  materialFitCare = signal('Regular fit. Breathable polyester mesh. Embroidered crest. Machine wash cold; do not tumble dry.');
  isActive = signal(true);

  // Images
  galleryImages = signal<GalleryImage[]>([]);
  readonly isUploadingImages = signal(false);
  readonly isDraggingImages = signal(false);
  readonly imageUploadError = signal<string | null>(null);
  readonly imageUploadMessage = signal<string | null>(null);

  @ViewChild('imageFileInput') private imageFileInput?: ElementRef<HTMLInputElement>;

  // Sizes & Stock
  stockS = signal(4);
  stockM = signal(8);
  stockL = signal(7);
  stockXL = signal(5);
  stockXXL = signal(0);

  readonly totalStock = computed(() => {
    return (
      Number(this.stockS()) +
      Number(this.stockM()) +
      Number(this.stockL()) +
      Number(this.stockXL()) +
      Number(this.stockXXL())
    );
  });

  readonly availableSizesSummary = computed(() => {
    const list: string[] = [];
    if (this.stockS() > 0) list.push('S');
    if (this.stockM() > 0) list.push('M');
    if (this.stockL() > 0) list.push('L');
    if (this.stockXL() > 0) list.push('XL');
    if (this.stockXXL() > 0) list.push('XXL');
    return list.length > 0 ? `${list.join(' · ')} available` : 'All sizes sold out';
  });

  readonly coverImage = computed(() => {
    return this.galleryImages()[0]?.url || '/assets/jerseys/cameroon%20home.jpg';
  });

  openImagePicker(): void {
    this.imageFileInput?.nativeElement.click();
  }

  handleImageInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void this.addImageFiles(files);
  }

  handleImageDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingImages.set(true);
  }

  handleImageDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingImages.set(false);
  }

  handleImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingImages.set(false);
    void this.addImageFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private async addImageFiles(files: File[]): Promise<void> {
    if (files.length === 0 || this.isUploadingImages()) {
      return;
    }

    this.imageUploadError.set(null);
    this.imageUploadMessage.set(null);
    this.isUploadingImages.set(true);
    let added = 0;
    const errors: string[] = [];

    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name}: file exceeds 5 MB.`);
          continue;
        }

        const supportedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!supportedType && !supportedExtension) {
          errors.push(`${file.name}: choose a JPG, PNG, or WebP image.`);
          continue;
        }

        try {
          const image = await this.createGalleryImage(file);
          const gallery = [...this.galleryImages(), image];
          this.relabelImages(gallery);
          added++;
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'the image could not be read';
          errors.push(`${file.name}: ${reason}`);
        }
      }

      if (added > 0) {
        this.imageUploadMessage.set(`${added} image${added === 1 ? '' : 's'} added.`);
      }
      if (errors.length > 0) {
        this.imageUploadError.set(errors.join(' '));
      }
    } finally {
      this.isUploadingImages.set(false);
    }
  }

  private async createGalleryImage(file: File): Promise<GalleryImage> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / bitmap.width, 1200 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('Could not prepare image preview.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const label = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    return {
      label: label || 'Product image',
      url: canvas.toDataURL('image/jpeg', 0.78),
    };
  }

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id || id === 'new') {
        this.isNew.set(true);
        this.productId.set('');
        this.galleryImages.set([]);
        this.name.set('New Football Jersey');
        this.team.set('Cameroon');
        this.description.set('National pride jersey with premium finish.');
      } else {
        this.isNew.set(false);
        this.productId.set(id);
        const existing = this.productService.getSnapshot().find((p) => p.id === id);
        if (existing) {
          this.loadProduct(existing);
        } else {
          this.productService.getProductById(id).subscribe((p) => {
            if (p) this.loadProduct(p);
          });
        }
      }
    });
  }

  private loadProduct(p: Product): void {
    this.name.set(p.name);
    this.categoryId.set(p.categoryId);
    this.price.set(p.price);
    this.team.set(p.team);
    this.description.set(p.description);
    this.isActive.set(p.status !== 'inactive');
    if (p.gallery && p.gallery.length) {
      this.galleryImages.set([...p.gallery]);
    } else {
      this.galleryImages.set([{ label: 'Front · Cover', url: p.imageUrl }]);
    }
    const s = p.stockBySize || { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    this.stockS.set(s.S ?? 0);
    this.stockM.set(s.M ?? 0);
    this.stockL.set(s.L ?? 0);
    this.stockXL.set(s.XL ?? 0);
    this.stockXXL.set(s.XXL ?? 0);
  }

  moveImageLeft(index: number): void {
    if (index > 0) {
      const list = [...this.galleryImages()];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      this.relabelImages(list);
    }
  }

  moveImageRight(index: number): void {
    if (index < this.galleryImages().length - 1) {
      const list = [...this.galleryImages()];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      this.relabelImages(list);
    }
  }

  removeImage(index: number): void {
    const list = this.galleryImages().filter((_, i) => i !== index);
    this.relabelImages(list);
  }

  private relabelImages(list: GalleryImage[]): void {
    if (list.length > 0) {
      list[0].label = 'Front · Cover';
    }
    this.galleryImages.set(list);
  }

  toggleVisibility(): void {
    this.isActive.update((v) => !v);
  }

  saveProduct(): void {
    const stockBySize: Record<ProductSize, number> = {
      S: Number(this.stockS()) || 0,
      M: Number(this.stockM()) || 0,
      L: Number(this.stockL()) || 0,
      XL: Number(this.stockXL()) || 0,
      XXL: Number(this.stockXXL()) || 0,
    };

    const sizes: ProductSize[] = [];
    if (stockBySize.S > 0) sizes.push('S');
    if (stockBySize.M > 0) sizes.push('M');
    if (stockBySize.L > 0) sizes.push('L');
    if (stockBySize.XL > 0) sizes.push('XL');
    if (stockBySize.XXL > 0) sizes.push('XXL');

    const total = Object.values(stockBySize).reduce((a, b) => a + b, 0);

    const gallery = this.galleryImages();
    const coverUrl = gallery[0]?.url || '/assets/jerseys/cameroon%20home.jpg';

    if (this.isNew()) {
      this.productService.addProduct({
        name: this.name(),
        team: this.team(),
        categoryId: this.categoryId(),
        price: Number(this.price()),
        imageUrl: coverUrl,
        gallery,
        description: this.description(),
        stockBySize,
        stockQuantity: total,
        sizes: sizes.length ? sizes : ['M'],
        status: this.isActive() ? 'active' : 'inactive',
      });
    } else {
      this.productService.updateProduct(this.productId(), {
        name: this.name(),
        team: this.team(),
        categoryId: this.categoryId(),
        price: Number(this.price()),
        imageUrl: coverUrl,
        gallery,
        description: this.description(),
        stockBySize,
        stockQuantity: total,
        sizes: sizes.length ? sizes : ['M'],
        status: this.isActive() ? 'active' : 'inactive',
      });
    }

    this.router.navigate(['/admin/products']);
  }
}
