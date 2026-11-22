import type { NotificationResponse } from 'expo-notifications';
import {
  useNavigationContainerRef,
  useRouter,
  useRootNavigationState,
  type Href,
} from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { notificacoesNativasDisponiveis } from '@/features/notifications/platform-support';
import { ehDeepLinkValido } from '@/utils/deep-link';

const NOTIFICACOES_DISPONIVEIS = notificacoesNativasDisponiveis(Platform.OS);

function extrairUrl(
  response: NotificationResponse | null | undefined,
): string | null {
  const url = response?.notification?.request?.content?.data?.url;
  return typeof url === 'string' ? url : null;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const rootState = useRootNavigationState();
  const isReady = !!rootState;

  const handledIds = useRef<Set<string>>(new Set());
  const pendingUrl = useRef<string | null>(null);

  const tratarResposta = (
    response: NotificationResponse | null | undefined,
  ) => {
    const url = extrairUrl(response);
    if (!url) return;
    const id =
      response?.notification?.request?.identifier ?? url;
    if (handledIds.current.has(id)) return;

    if (!ehDeepLinkValido(url)) {
      if (__DEV__) console.warn('[push] deep link fora da whitelist:', url);
      handledIds.current.add(id);
      return;
    }

    handledIds.current.add(id);
    const pronto = navigationRef?.isReady?.() ?? isReady;
    if (pronto) {
      router.push(url as Href);
    } else {
      pendingUrl.current = url;
    }
  };

  // O import dinâmico evita carregar expo-notifications no web: o módulo
  // registra um listener de push token no escopo de import e avisa que não
  // há suporte, mesmo quando nenhuma API nativa é chamada.
  useEffect(() => {
    if (!NOTIFICACOES_DISPONIVEIS) return;
    let cancelled = false;
    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      const response = await Notifications.getLastNotificationResponseAsync();
      if (cancelled) return;
      tratarResposta(response);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener para taps enquanto o app está rodando.
  useEffect(() => {
    if (!NOTIFICACOES_DISPONIVEIS) return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      subscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          tratarResposta(response);
        });
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush do deep link pendente quando o navegador fica pronto.
  useEffect(() => {
    if (isReady && pendingUrl.current) {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      if (ehDeepLinkValido(url)) {
        router.push(url as Href);
      }
    }
  }, [isReady, router]);

  return <>{children}</>;
}