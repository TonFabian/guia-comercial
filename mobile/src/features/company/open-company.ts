import { router } from 'expo-router';

/** Abre a tela de detalhes da empresa pelo id. */
export function openCompanyDetails(companyId: string): void {
  router.push({ pathname: '/company/[id]', params: { id: companyId } });
}
