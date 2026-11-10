const API = process.env.EXPO_PUBLIC_API_URL;

/** Views já contadas nesta sessão: re-mount/StrictMode não conta 2× a visita. */
const viewsContadas = new Set<string>();

function post(path: string): void {
  if (!API) return;
  void fetch(`${API}${path}`, { method: 'POST' }).catch(() => {});
}

export function trackView(companyId: string): void {
  if (viewsContadas.has(companyId)) return;
  viewsContadas.add(companyId);
  post(`/companies/${companyId}/view`);
}

export function trackWhatsappClick(companyId: string): void {
  post(`/companies/${companyId}/whatsapp-click`);
}
