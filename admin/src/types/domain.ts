// fontes da verdade: ../shared/domain.ts (cópia fiel para o build Vite/tsc
// resolver sem path hacks entre projetos). Ao alterar o original, reflita aqui.

/**
 * Tipos de domínio compartilhados (ONDA 1).
 *
 * Este arquivo contém APENAS tipos TypeScript — sem runtime e sem imports.
 *
 * Convenção bidirecional: os campos de ID e datas são tipados como `string`
 * porque JSON não tem ObjectId nem Date. Serializers em cada app convertem:
 *  - `_id`, `category`, `company` (quando referência) → string (ObjectId hex)
 *  - `createdAt`, `updatedAt`, `expiresAt` → string (ISO 8601)
 * Campos de referência usam união `string | Entidade` (populate do Mongoose).
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
  openingHours?: string[];
  services?: string[];
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

/** Conta administrativa (admin/editor), anterior à autenticação via Clerk. */
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  createdAt?: string;
}

/** Usuário do app, espelhado do Clerk no backend. */
export interface User {
  _id: string;
  clerkId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  imageUrl?: string;
  role: 'user';
  lastSid?: string;
  lastSignInAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Resultado paginado padrão das listagens da API. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
