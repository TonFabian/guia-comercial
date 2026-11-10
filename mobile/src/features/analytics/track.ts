const API = process.env.EXPO_PUBLIC_API_URL;

function post(path: string): void {
  if (!API) return;
  void fetch(`${API}${path}`, { method: 'POST' }).catch(() => {});
}

export function trackView(companyId: string): void {
  post(`/companies/${companyId}/view`);
}

export function trackWhatsappClick(companyId: string): void {
  post(`/companies/${companyId}/whatsapp-click`);
}