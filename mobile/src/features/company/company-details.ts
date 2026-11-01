import { categoryLabel } from '@/types/domain';
import type { Company } from '@/types/domain';

export type WorkingHours = {
  weekdays: string;
  saturday: string;
  sunday: string;
};

export type ServiceIcon =
  | 'office-building'
  | 'hammer-wrench'
  | 'clipboard-text-outline'
  | 'account-tie-outline'
  | 'truck-outline'
  | 'content-cut'
  | 'car-wrench'
  | 'medical-bag'
  | 'silverware-fork-knife'
  | 'storefront-outline'
  | 'tools';

export type CompanyService = {
  icon: ServiceIcon;
  name: string;
};

export type CompanyMedia = {
  key: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
};

export type CompanyAbout = {
  title: string;
  text: string;
};

export type CompanyDetails = {
  id: string;
  name: string;
  category: string;
  registry?: string;
  isFeatured: boolean;
  logoUrl?: string;
  coverUrl?: string;
  media: CompanyMedia[];
  city?: string;
  address?: string;
  mapLink?: string;
  about: CompanyAbout;
  servicesList: CompanyService[];
  workingHours: WorkingHours;
  phone?: string;
  whatsapp?: string;
};

const CONSULT_HOURS = 'Consulte a empresa';
const EMPTY_DESCRIPTION = 'Informações em breve.';
const ABOUT_TITLE = 'A Nossa História';

const SERVICE_ICON_RULES: { pattern: RegExp; icon: ServiceIcon }[] = [
  {
    pattern: /consult|assessor|projeto|planejamento|regulariza|aprova|treinamento/i,
    icon: 'clipboard-text-outline',
  },
  {
    pattern: /constru|reforma|alvenaria|pintura|hidráulica|hidraulica|acabamento|telhado|elétric|eletric|instala|brita|areia|cimento/i,
    icon: 'hammer-wrench',
  },
  {
    pattern: /fiscal|contábil|contabil|tributár|tributar|financeir|auditoria/i,
    icon: 'account-tie-outline',
  },
  {
    pattern: /jurídic|juridic|advocacia|legal/i,
    icon: 'account-tie-outline',
  },
  {
    pattern: /entrega|frete|transporte|logística|logistica|mudança|mudanca/i,
    icon: 'truck-outline',
  },
  {
    pattern: /cabelo|barba|estética|estetica|beleza|unha|maquiagem|corte|capilar|pigmenta/i,
    icon: 'content-cut',
  },
  {
    pattern: /automotiv|veículo|veiculo|carro|moto|pneu|revisão|revisao|mecânic|mecanic|óleo|oleo|suspens|freio/i,
    icon: 'car-wrench',
  },
  {
    pattern: /farmác|farmac|saúde|saude|medic|clínic|clinic|exame|veterin|plantão|plantao|pressão|pressao/i,
    icon: 'medical-bag',
  },
  {
    pattern: /almoço|almoco|pizza|restaurante|cozinha|marmitex|salão|salao/i,
    icon: 'silverware-fork-knife',
  },
  {
    pattern: /venda|atacado|varejo|loja|comércio|comercio|mercado/i,
    icon: 'storefront-outline',
  },
];

function iconForService(serviceName: string): ServiceIcon {
  return SERVICE_ICON_RULES.find(({ pattern }) => pattern.test(serviceName))?.icon ?? 'tools';
}

function buildServices(services: string[] | undefined): CompanyService[] {
  return (services ?? [])
    .map((service) => service.trim())
    .filter(Boolean)
    .map((name) => ({ icon: iconForService(name), name }));
}

function buildMedia(company: Company): CompanyMedia[] {
  const urls = [company.cover, ...(company.gallery ?? [])].filter(
    (image): image is string => Boolean(image),
  );

  return Array.from(new Set(urls)).map((url, index) => ({
    key: `media-${index}`,
    type: 'image',
    url,
  }));
}

/** Prepara os dados da empresa para a tela, com fallbacks para campos opcionais. */
export function buildCompanyDetails(company: Company): CompanyDetails {
  const [weekdays, saturday, sunday] = company.openingHours ?? [];

  return {
    id: company._id,
    name: company.name,
    category: categoryLabel(company.category),
    registry: company.registry,
    isFeatured: company.isFeatured === true,
    logoUrl: company.logo,
    coverUrl: company.cover,
    media: buildMedia(company),
    city: company.city,
    address: company.address ?? undefined,
    mapLink: company.address
      ? `https://maps.google.com/?q=${encodeURIComponent(company.address)}`
      : undefined,
    about: {
      title: ABOUT_TITLE,
      text: company.description || EMPTY_DESCRIPTION,
    },
    servicesList: buildServices(company.services),
    workingHours: {
      weekdays: weekdays ?? CONSULT_HOURS,
      saturday: saturday ?? CONSULT_HOURS,
      sunday: sunday ?? CONSULT_HOURS,
    },
    phone: company.phone ?? undefined,
    whatsapp: company.whatsapp ?? undefined,
  };
}
