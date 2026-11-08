import type { User } from '@/types/domain';
import { useAuth, useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { updatePushToken } from '@/services/api';
import { registerTokenGetter } from '@/services/http';

const GUEST_KEY = 'guia:guest';

export type AuthStatus = 'loading' | 'signedIn' | 'guest' | 'signedOut';

export interface AuthState {
  state: AuthStatus;
  user: User | null;
  enterAsGuest: () => void;
  exitGuest: () => void;
  signOut: () => Promise<void>;
  signOutToGuest: () => Promise<void>;
  /** Atualiza nome/sobrenome no Clerk; no-op no modo dev sem Clerk. */
  updateProfileName: (firstName: string, lastName: string) => Promise<void>;
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
  signOutToGuest: async () => undefined,
  updateProfileName: async () => undefined,
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

  // Registra o getter de token de forma SÍNCRONA (durante o render), antes de
  // os filhos montarem seus effects — caso contrário a primeira requisição
  // autenticada (ex.: /me, /companies?owner=) sai sem Authorization e vira
  // 401/403 mesmo com sessão válida.
  const tokenGetter = useMemo(
    () => async (options?: { skipCache?: boolean }) => (await getToken(options)) ?? null,
    [getToken],
  );
  registerTokenGetter(tokenGetter);

  useEffect(() => {
    return () => registerTokenGetter(null);
  }, []);

  // Restaura modo convidado persistido (sobrevive a reload).
  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY).then((value) => {
      if (value === '1') setGuest(true);
    });
  }, []);

  // Registra push token no backend (funciona para convidados e logados).
  // Pulo no web: expo-notifications exige VAPID e o registro é inócuo aqui.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS === 'web') return;
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted' || cancelled) {
          if (__DEV__) console.warn('[push] permissao nao concedida:', status);
          return;
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (cancelled || !token) {
          if (__DEV__) console.warn('[push] token vazio');
          return;
        }
        if (!process.env.EXPO_PUBLIC_API_URL) {
          if (__DEV__) console.warn('[push] EXPO_PUBLIC_API_URL nao definida');
          return;
        }
        await updatePushToken(token);
      } catch (e) {
        if (__DEV__) console.warn('[push] erro:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const value = useMemo<AuthState>(
    () => ({
      state: !isLoaded ? 'loading' : isSignedIn ? 'signedIn' : guest ? 'guest' : 'signedOut',
      user: isSignedIn ? toDomainUser(user) : null,
      enterAsGuest: () => {
        setGuest(true);
        AsyncStorage.setItem(GUEST_KEY, '1');
      },
      exitGuest: () => {
        setGuest(false);
        AsyncStorage.removeItem(GUEST_KEY);
      },
      signOut: async () => {
        setGuest(false);
        AsyncStorage.removeItem(GUEST_KEY);
        await signOut();
      },
      signOutToGuest: async () => {
        setGuest(true);
        try {
          await signOut();
        } catch (error) {
          setGuest(false);
          throw error;
        }
        await AsyncStorage.setItem(GUEST_KEY, '1').catch(() => undefined);
      },
      updateProfileName: async (firstName, lastName) => {
        if (!user) return;

        const name: { firstName?: string; lastName?: string } = {};
        if (firstName) name.firstName = firstName;
        if (lastName) name.lastName = lastName;
        if (!name.firstName && !name.lastName) return;

        await user.update(name).catch(() => undefined);
      },
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
