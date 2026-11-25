import { useAuthState } from '@/providers/auth-provider';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import type { DisplayBanner } from '@/data/mock';
import { ApiError } from '@/services/http';
import {
  getBanners,
  getCategories,
  getCoupons,
  getFeaturedCompanies,
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
  featuredCompanies: Company[];
  pharmacy: Company | null;
  error: string | null;
};

const INITIAL: HomeData = {
  loading: true,
  categories: [],
  banners: [],
  coupons: [],
  jobs: [],
  featuredCompanies: [],
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
export function useHomeData(city?: string, retryKey = 0) {
  const router = useRouter();
  const authState = useAuthState();

  const [state, setState] = useState<HomeData>(INITIAL);

  useEffect(() => {
    // Só tenta carregar dados quando o Clerk NÃO está em estado de loading.
    // Isso evita requisições antes do token estar disponível.
    if (authState.state === 'signedIn' || authState.state === 'guest') {
      let cancelled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      async function load() {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const [categories, banners, coupons, jobs, featuredCompanies, pharmacy] = await Promise.all(
            [
              getCategories(),
              getBanners(),
              getCoupons(),
              getJobs(),
              getFeaturedCompanies(city),
              getPharmacyOnDuty(city),
            ],
          );

          if (cancelled) return;
          setState({
            loading: false,
            categories,
            banners,
            coupons,
            jobs,
            featuredCompanies,
            pharmacy,
            error: null,
          });
        } catch (error) {
          if (cancelled) return;
          const status =
            error instanceof ApiError
              ? error.status
              : (error as { status?: number } | null)?.status;
          // Tratamento de erro 401/403: usuário não autenticado → redirecionar
          // para login com mensagem amigável, sem quebrar a UI.
          if (status === 401 || status === 403) {
            if (authState.state === 'signedIn') {
              // Sessão Clerk válida, mas o backend rejeitou o token (ex.: secret
              // key inválida). Não redirecionar em loop — exibe erro.
              setState((prev) => ({
                ...prev,
                loading: false,
                error: 'Não foi possível carregar os dados. Verifique a configuração do servidor.',
              }));
              return;
            }
            setState({
              ...INITIAL,
              error: 'Sessão expirada. Por favor, faça login novamente.',
            });
            // Redireciona após pequeno delay para mostrar a mensagem
            timeoutId = setTimeout(() => {
              if (!cancelled) router.replace('/(auth)/sign-in');
            }, 1500);
            return;
          }
          // Outros erros: manter estado de erro, mas não quebrar a UI.
          // Note: não espalhamos INITIAL aqui para não resetar loading para true.
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Erro ao carregar dados',
          }));
        }
      }

      void load();

      // Cleanup do timeout na desmontagem do efeito
      return () => {
        cancelled = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
    // Se authState.state for 'loading' ou 'signedOut', mantém o estado inicial
    // e não chama load(), evitando requisições sem token.
  }, [authState.state, router, city, retryKey]);

  return state;
}
