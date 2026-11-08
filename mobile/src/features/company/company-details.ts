import { categoryLabel } from '@/types/domain';
import { cityName } from '@/utils/city';
import type { Company } from '@/types/domain';
import { formatMinutes } from '@/features/company/opening-hours';

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
  promotion?: string;
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

/** Monta a linha de horário para o bucket a partir das faixas de schedule dele. */
/**
 * Link do Google Maps da empresa: coordenadas geocodificadas têm prioridade
 * (a busca por texto livre costuma falhar sem cidade; com pin exato não falha).
 */
function mapLinkFor(company: Company): string | undefined {
  if (!company.address) return undefined;
  const city = typeof company.city === 'string' ? null : company.city;
  const cityNameValue = cityName(company.city);
  const state = city && typeof city === 'object' ? (city as { state?: string }).state : undefined;
  const query = [company.address, cityNameValue, state].filter(Boolean).join(', ');
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function scheduleHoursText(
  schedule: { day: number; opens: number; closes: number }[],
  days: number[],
): string {
  const faixas = schedule.filter((item) => days.includes(item.day));
  if (faixas.length === 0) return 'Fechado';
  // Não inferir: listar apenas os dias que de fato têm entrada no schedule.
  // Agrupar dias adjacentes (na ordem do bucket) com faixa idêntica.
  const porDia = new Map<number, string>();
  for (const f of faixas) {
    porDia.set(f.day, `${formatMinutes(f.opens)} às ${formatMinutes(f.closes)}`);
  }
  const grupos: { dias: number[]; texto: string }[] = [];
  for (const d of days) {
    const texto = porDia.get(d);
    if (!texto) continue;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === texto && ultimo.dias[ultimo.dias.length - 1] === d - 1) {
      ultimo.dias.push(d);
    } else {
      grupos.push({ dias: [d], texto });
    }
  }
  // Se todos os dias do bucket estão presentes com a mesma faixa, mostrar
  // apenas a faixa (sem prefixo de dia) — caso clássico "Seg a Sex: 08h às 18h".
  const todosPresentes = days.every((d) => porDia.has(d));
  const faixaUnica = grupos.length === 1 && grupos[0].dias.length === days.length;
  if (todosPresentes && faixaUnica) {
    return grupos[0].texto;
  }
  return grupos
    .map((g) =>
      g.dias.length === 1
        ? `${DIAS_SEMANA[g.dias[0]]} ${g.texto}`
        : `${DIAS_SEMANA[g.dias[0]]} a ${DIAS_SEMANA[g.dias[g.dias.length - 1]]}: ${g.texto}`,
    )
    .join('; ');
}

function buildWorkingHours(company: Company): WorkingHours {
  const schedule = company.schedule ?? [];
  if (schedule.length > 0) {
    return {
      weekdays: scheduleHoursText(schedule, [1, 2, 3, 4, 5]),
      saturday: scheduleHoursText(schedule, [6]),
      sunday: scheduleHoursText(schedule, [0]),
    };
  }

  return {
    weekdays: CONSULT_HOURS,
    saturday: CONSULT_HOURS,
    sunday: CONSULT_HOURS,
  };
}

/** Prepara os dados da empresa para a tela, com fallbacks para campos opcionais. */
export function buildCompanyDetails(company: Company): CompanyDetails {
  return {
    id: company._id,
    name: company.name,
    category: categoryLabel(company.category),
    registry: company.registry,
    isFeatured: company.isFeatured === true,
    logoUrl: company.logo,
    coverUrl: company.cover,
    media: buildMedia(company),
    city: cityName(company.city),
    address: company.address ?? undefined,
    promotion: company.promotion,
    mapLink: mapLinkFor(company),
    about: {
      title: ABOUT_TITLE,
      text: company.description || EMPTY_DESCRIPTION,
    },
    servicesList: buildServices(company.services),
    workingHours: buildWorkingHours(company),
    phone: company.phone ?? undefined,
    whatsapp: company.whatsapp ?? undefined,
  };
}
