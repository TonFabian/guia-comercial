/**
 * fonte da verdade: ../shared/domain.ts (raiz do monorepo).
 */
export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Produto ou serviço comercializado pela empresa. */
export interface CompanyProduct {
  name: string;
  description?: string;
  price?: number;
  image?: string;
}

export interface Company {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string | Category;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  logo?: string;
  cover?: string;
  isFeatured?: boolean;
  rating?: number;
  ratingCount?: number;
  isVerified?: boolean;
  website?: string;
  instagram?: string;
  facebook?: string;
  openingHours?: string[];
  services?: string[];
  products?: CompanyProduct[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  order?: number;
  active?: boolean;
  createdAt?: string;
}

export interface Coupon {
  _id: string;
  title: string;
  company: string | Company;
  code: string;
  discount?: string;
  description?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string | Company;
  description?: string;
  location?: string;
  type?: string;
  createdAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  createdAt?: string;
}

/** Resultado paginado padrão das listagens da API. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CouponCompany = Coupon['company'];
export type JobCompany = Job['company'];
export type CompanyCategory = Company['category'];

export function isCategory(cat: CompanyCategory): cat is Category {
  return typeof cat !== 'string';
}

export function companyLabel(entity: CouponCompany | JobCompany): string {
  return typeof entity === 'string' ? entity : entity.name;
}

/** Id da empresa ligada a um cupom/vaga. `null` quando a API devolve só o nome. */
export function companyId(entity: CouponCompany | JobCompany): string | null {
  return typeof entity === 'string' ? null : entity._id;
}

export function categoryLabel(cat: CompanyCategory): string {
  return isCategory(cat) ? cat.name : cat;
}
