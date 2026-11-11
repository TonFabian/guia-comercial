import { trackWhatsappClick } from '@/features/analytics/track';
import { openWhatsApp } from '@/utils/links';

const SERVICE_WHATSAPP_PREFIX = 'Olá, tenho interesse no serviço de';

/**
 * Clique em um serviço da lista: abre o WhatsApp com o nome do serviço na
 * mensagem E registra o evento de engajamento (analytics do plano premium).
 * O clique vende métrica para o lojista — não abrir sem contar.
 */
export function falarSobreServicoNoWhatsApp({
  companyId,
  whatsapp,
  serviceName,
}: {
  companyId?: string;
  whatsapp?: string;
  serviceName: string;
}): void {
  if (companyId) trackWhatsappClick(companyId);
  if (whatsapp) void openWhatsApp(whatsapp, `${SERVICE_WHATSAPP_PREFIX} ${serviceName}`);
}
