import { useEffect, useState } from 'react';

import { useAuthState } from '@/providers/auth-provider';
import { getMe, getOwnedCompanies } from '@/services/api';
import type { User } from '@/types/domain';

interface ProfileData {
  profile: User | null;
  /** `null` enquanto a posse de empresa é desconhecida (carregando/erro). */
  hasOwnedCompany: boolean | null;
  loading: boolean;
}

interface LoadedProfile {
  clerkId: string;
  me: User | null;
  hasOwnedCompany: boolean | null;
}

/** Carrega o espelho `/me` e a posse de empresa do usuário logado. */
export function useProfile(): ProfileData {
  const { state, user } = useAuthState();
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);

  const clerkId = user?.clerkId;
  const isSignedIn = state === 'signedIn' && Boolean(clerkId);

  useEffect(() => {
    if (!isSignedIn || !clerkId) return;

    let cancelled = false;

    void (async () => {
      const [loadedMe, ownedCompanies] = await Promise.all([
        getMe(),
        getOwnedCompanies(clerkId),
      ]);

      if (cancelled) return;

      setLoaded({
        clerkId,
        me: loadedMe,
        hasOwnedCompany: ownedCompanies === null ? null : ownedCompanies.length > 0,
      });
    })().catch(() => {
      if (cancelled) return;
      setLoaded({ clerkId, me: null, hasOwnedCompany: null });
    });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, clerkId]);

  const current = loaded?.clerkId === clerkId ? loaded : null;

  return {
    profile: isSignedIn ? (current?.me ?? user ?? null) : null,
    hasOwnedCompany: current?.hasOwnedCompany ?? null,
    loading: isSignedIn && current === null,
  };
}
