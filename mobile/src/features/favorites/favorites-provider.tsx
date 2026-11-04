/**
 * Favoritos da empresa, persistidos no dispositivo.
 *
 * Não há autenticação no app, então o favorites fica em AsyncStorage: cada
 * instalação guarda a sua própria lista.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getCompanyById, getMe, updateMe } from '@/services/api';
import { useAuthState } from '@/providers/auth-provider';
import type { Company } from '@/types/domain';

const STORAGE_KEY_BASE = '@guia-comercial/favorites';

interface FavoritesContextValue {
  /** Empresas favoritas, da mais recente para a mais antiga. */
  favorites: Company[];
  /** `true` quando a lista já foi lida do armazenamento. */
  ready: boolean;
  isFavorite: (companyId: string) => boolean;
  toggleFavorite: (company: Company) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function favoritesStorageKey(clerkId: string | undefined): string {
  return `${STORAGE_KEY_BASE}:${clerkId ?? 'guest'}`;
}

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
  const [loadedFor, setLoadedFor] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const key = favoritesStorageKey(auth.user?.clerkId);

    async function load() {
      setReady(false);
      setFavorites([]);
      try {
        const stored = await AsyncStorage.getItem(key);
        if (cancelled) return;
        setFavorites(readFavorites(stored));
      } catch {
        // Sem acesso ao armazenamento: segue com a lista vazia.
      } finally {
        if (!cancelled) {
          setReady(true);
          setLoadedFor(auth.user?.clerkId);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.clerkId, auth.state]);

  // Sincroniza com o backend quando logado.
  useEffect(() => {
    if (auth.state !== 'signedIn') return;
    let cancelled = false;
    (async () => {
      const me = await getMe();
      if (cancelled || !me?.favorites) return;
      const remoteIds = me.favorites;
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
  }, [auth.state, auth.user?.clerkId]);

  useEffect(() => {
    if (!ready) return;
    if (loadedFor !== auth.user?.clerkId) return;
    const key = favoritesStorageKey(auth.user?.clerkId);
    void AsyncStorage.setItem(key, JSON.stringify(favorites)).catch(() => {
      // Falha ao gravar não impede o uso do app; a lista segue em memória.
    });
    // Persiste no backend se logado.
    if (auth.state === 'signedIn') {
      const ids = favorites.map((c) => c._id);
      void (async () => {
        await updateMe({ favorites: ids }).catch(() => undefined);
      })();
    }
  }, [favorites, ready, auth.state, auth.user?.clerkId, loadedFor]);

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
