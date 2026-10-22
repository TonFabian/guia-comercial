import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import type { User } from '@/types/domain';

import { registerTokenGetter } from '@/services/http';

export type AuthStatus = 'loading' | 'signedIn' | 'guest' | 'signedOut';

export interface AuthState {
  state: AuthStatus;
  user: User | null;
  enterAsGuest: () => void;
  exitGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Usuário fake do modo dev: sem `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, o app
 * se comporta como autenticado e os dados vêm dos mocks (sempre funcionou
 * assim sem backend).
 */
const DEV_FAKE_USER: User = {
  _id: 'dev-usuario',
  clerkId: 'dev-usuario',
  firstName: 'Dev',
  email: 'dev@guia.local',
  role: 'user',
};

const DEV_FALLBACK_STATE: AuthState = {
  state: 'signedIn',
  user: DEV_FAKE_USER,
  enterAsGuest: () => undefined,
  exitGuest: () => undefined,
  signOut: async () => undefined,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AuthContext.Provider value={DEV_FALLBACK_STATE}>{children}</AuthContext.Provider>;
  }

  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const [guest, setGuest] = useState(false);

  // Fecha o gap entre o token de sessão do Clerk e a fachada http.ts
  // (limpeza no unmount evita getter órfão de um provider desmontado).
  useEffect(() => {
    registerTokenGetter(async () => (await getToken()) ?? null);
    return () => registerTokenGetter(null);
  }, [getToken]);

  const value = useMemo<AuthState>(
    () => ({
      state: !isLoaded ? 'loading' : isSignedIn ? 'signedIn' : guest ? 'guest' : 'signedOut',
      user: isSignedIn ? toDomainUser(user) : null,
      enterAsGuest: () => setGuest(true),
      exitGuest: () => setGuest(false),
      signOut,
    }),
    [isLoaded, isSignedIn, guest, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Dados de exibição vêm do recurso do Clerk; o espelho (`/me`) é opcional. */
function toDomainUser(resource: ReturnType<typeof useUser>['user']): User | null {
  if (!resource) {
    return null;
  }

  return {
    _id: resource.id,
    clerkId: resource.id,
    firstName: resource.firstName ?? undefined,
    lastName: resource.lastName ?? undefined,
    email: resource.primaryEmailAddress?.emailAddress ?? '',
    phone: resource.primaryPhoneNumber?.phoneNumber ?? undefined,
    imageUrl: resource.imageUrl ?? undefined,
    role: 'user',
  };
}

export function useAuthState(): AuthState {
  const state = useContext(AuthContext);

  if (!state) {
    throw new Error('useAuthState deve ser usado dentro de <AuthProvider>');
  }

  return state;
}
