import { useAuthState } from '@/providers/auth-provider';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import type { DisplayBanner } from '@/data/mock';
import {
  getBanners,
  getCategories,
  getCoupons,
  getFeaturedCompany,
  getJobs,
  getPharmacyOnDuty,
} from '@/services/api';
import type { Category, Company, Coupon, Job } from '@/types/domain';

export type HomeData = {
  loading: boolean;
  categories: Category[];
  banners: DisplayBanner[];
  coupons: Coupon[];
  jobs: Job[];
  featuredCompany: Company | null;
  pharmacy: Company | null;
  error: string | null;
};

const INITIAL: HomeData = {
  loading: true,
  categories: [],
  banners: [],
  coupons: [],
  jobs: [],
  featuredCompany: null,
  pharmacy: null,
  error: null,
};

/**
 * Carrega todos os dados da Home via src/services/api.ts (com fallback para
 * os mocks quando o backend não responde). Só começa a carregar depois que
 * o Clerk terminar de estabelecer a sessão (authState.state !== 'loading').
 *
 * Em caso de 401/403 (token expirado/inválido), exibe mensagem e redireciona
 * para a página de login. Não quebra a aplicação.
 */
export function useHomeData() {
  const router = useRouter();
  const authState = useAuthState();

  const [state, setState] = useState<HomeData>(INITIAL);

  useEffect(() => {
    // Só tenta carregar dados quando o Clerk NÃO está em estado de loading.
    // Isso evita requisições antes do token estar disponível.
    if (authState.state === 'signedIn' || authState.state === 'guest') {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      async function load() {
        try {
          const [categories, banners, coupons, jobs, featuredCompany, pharmacy] = await Promise.all(
            [
              getCategories(),
              getBanners(),
              getCoupons(),
              getJobs(),
              getFeaturedCompany(),
              getPharmacyOnDuty(),
            ],
          );

          setState({
            loading: false,
            categories,
            banners,
            coupons,
            jobs,
            featuredCompany,
            pharmacy,
            error: null,
          });
        } catch (error: any) {
          // Tratamento de erro 401/403: usuário não autenticado → redirecionar
          // para login com mensagem amigável, sem quebrar a UI.
          if (error.status === 401 || error.status === 403) {
            setState({
              ...INITIAL,
              error: 'Sessão expirada. Por favor, faça login novamente.',
            });
            // Redireciona após pequeno delay para mostrar a mensagem
            timeoutId = setTimeout(() => {
              router.replace('/(auth)/sign-in');
            }, 1500);
          }
          // Outros erros: manter estado de erro, mas não quebrar a UI.
          // Note: não espalhamos INITIAL aqui para não resetar loading para true.
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Erro ao carregar dados',
          }));
        }
      }

      void load();

      // Cleanup do timeout na desmontagem do efeito
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
    // Se authState.state for 'loading' ou 'signedOut', mantém o estado inicial
    // e não chama load(), evitando requisições sem token.
  }, [authState.state, router]);

  return state;
}
