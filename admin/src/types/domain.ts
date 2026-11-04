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
  /** Promoção/destaque atual do estabelecimento (editável pelo lojista). */
  promotion?: string;
  /** Clerk ID do dono/gerente da empresa (autorização de edição). */
  ownerClerkId?: string;
  /** Convidado recebe `null` (o backend redige o contato comercial). */
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | City;
  latitude?: number;
  longitude?: number;
  logo?: string;
  cover?: string;
  gallery?: string[];
  registry?: string;
  isFeatured?: boolean;
  rating?: number;
  ratingCount?: number;
  isVerified?: boolean;
  website?: string;
  instagram?: string;
  facebook?: string;
  openingHours?: string[];
  schedule?: { day: number; opens: number; closes: number }[];
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
  /** Convidado recebe `null` (o backend oculta o código de resgate). */
  code?: string | null;
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
  role: 'user' | 'admin';
  city?: string | City;
  lastSid?: string;
  lastSignInAt?: string;
  pushToken?: string;
  favorites?: string[];
  ownedCompanyIds?: string[];
  preferences?: { notifications?: boolean };
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  company: string | Company;
  clerkId: string;
  authorName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}
/** Profissional autônomo (prestador de serviço sem estabelecimento físico). */
export interface AutonomousProfessional {
  _id: string;
  name: string;
  slug: string;
  specialty: string;
  description?: string;
  phone?: string | null;
  whatsapp?: string | null;
  photo?: string;
  city?: string | City;
  rating?: number;
  ratingCount?: number;
  ownerClerkId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Categorias de utilidade pública (emergência, saúde, segurança, saneamento). */
export type PublicUtilityCategory = 'emergency' | 'health' | 'civil' | 'sanitation';

/** Serviço de utilidade pública exibido na Home (polícia, hospital, coleta...). */
export interface PublicUtility {
  _id: string;
  name: string;
  description: string;
  category: PublicUtilityCategory;
  /** Telefone de disque direto. Ausente quando o card abre apenas detalhes. */
  phone?: string | null;
  details?: string[];
  /** Nome do ícone (MaterialCommunityIcons) — a cor vem do tema, não do dado. */
  icon?: string | null;
  /** `null` quando o serviço atende todas as cidades. */
  city?: string | City | null;
  order?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Aviso/comunicado local exibido no Mural da Home. */
export interface Notice {
  _id: string;
  title: string;
  body: string;
  type: 'general' | 'alert' | 'health';
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Cidade suportada pelo guia. */
export interface City {
  _id: string;
  name: string;
  slug: string;
  state: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
