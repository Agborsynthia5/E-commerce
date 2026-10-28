export type ProductSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface GalleryImage {
  label: string;
  url: string;
}

export interface Product {
  id: string;
  categoryId: string;
  team: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  gallery: GalleryImage[];
  sizes: ProductSize[];
  stockQuantity: number;
  stockBySize: Record<ProductSize, number>;
  features?: string[];
  status?: 'active' | 'inactive';
}
