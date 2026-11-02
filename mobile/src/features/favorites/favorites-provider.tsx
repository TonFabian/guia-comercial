/**
 * Favoritos da empresa, persistidos no dispositivo.
 *
 * Não há autenticação no app, então o favorites fica em AsyncStorage: cada
 * instalação guarda a sua própria lista.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuthState } from '@/providers/auth-provider';
import type { Company } from '@/types/domain';

const STORAGE_KEY = '@guia-comercial/favorites';

interface FavoritesContextValue {
  /** Empresas favoritas, da mais recente para a mais antiga. */
  favorites: Company[];
  /** `true` quando a lista já foi lida do armazenamento. */
  ready: boolean;
  isFavorite: (companyId: string) => boolean;
  toggleFavorite: (company: Company) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readFavorites(stored: string | null): Company[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Company => typeof item === 'object' && item !== null);
  } catch {
    // Conteúdo corrompido: começa com a lista vazia em vez de quebrar o app.
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  const [favorites, setFavorites] = useState<Company[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        setFavorites(readFavorites(stored));
      } catch {
        // Sem acesso ao armazenamento: segue com a lista vazia.
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sincroniza com o backend quando logado.
  useEffect(() => {
    if (auth.state !== 'signedIn') return;
    let cancelled = false;
    (async () => {
      const me = await (await import('@/services/api')).getMe();
      if (cancelled || !me?.favorites) return;
      const remoteIds = me.favorites;
      const { getCompanyById } = await import('@/services/api');
      const hydrated: Company[] = [];
      for (const id of remoteIds) {
        if (cancelled) return;
        const company = await getCompanyById(id);
        if (company) hydrated.push(company);
      }
      if (cancelled) return;
      setFavorites((current) => {
        const merged = [...current];
        for (const c of hydrated) {
          if (!merged.some((x) => x._id === c._id)) merged.push(c);
        }
        return merged;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.state]);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {
      // Falha ao gravar não impede o uso do app; a lista segue em memória.
    });
    // Persiste no backend se logado.
    if (auth.state === 'signedIn') {
      const ids = favorites.map((c) => c._id);
      void (async () => {
        const { updateMe } = await import('@/services/api');
        await updateMe({ favorites: ids }).catch(() => undefined);
      })();
    }
  }, [favorites, ready, auth.state]);

  const isFavorite = useCallback(
    (companyId: string) => favorites.some((company) => company._id === companyId),
    [favorites],
  );

  const toggleFavorite = useCallback((company: Company) => {
    setFavorites((current) => {
      const exists = current.some((item) => item._id === company._id);
      if (exists) return current.filter((item) => item._id !== company._id);
      return [company, ...current];
    });
  }, []);

  const value = useMemo(
    () => ({ favorites, ready, isFavorite, toggleFavorite }),
    [favorites, ready, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>.');
  }
  return context;
}
