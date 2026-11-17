import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { TopBackButton } from '@/components/top-back-button';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AppNotification, Notice } from '@/types/domain';
import { ehDeepLinkValido } from '@/utils/deep-link';
import { getNotifications, markNotificationsRead, markNotificationsUnread, getNotices } from '@/services/api';
import { NotificationItem } from '@/features/notifications/notification-item';
import { tempoRelativo } from '@/features/notifications/tempo-relativo';
import { alternarSelecao, aplicarLeitura } from '@/features/notifications/estado-lista';
import { useAuthState } from '@/providers/auth-provider';

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { state } = useAuthState();

  // Estado autenticado
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const [processandoIds, setProcessandoIds] = useState<string[]>([]);

  // Estado convidado (avisos públicos)
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  const sairDaSelecao = useCallback(() => {
    setModoSelecao(false);
    setSelecionados([]);
  }, []);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const p = reset ? 1 : page;
    try {
      const data = await getNotifications(p, 20);
      setItems((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === 20);
      setPage(p + 1);
    } catch {
      setError('Falha ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [loading, page]);

  const handlePress = useCallback(async (item: AppNotification) => {
    if (!item._id) return;
    await markNotificationsRead([item._id]);
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    if (item.deepLink && ehDeepLinkValido(item.deepLink)) router.push(item.deepLink as never);
  }, [router]);

  /** Marca como lidas todas as selecionadas; "não lida" reabre. */
  const selecionarTudo = useCallback(() => {
    setSelecionados(items.map((n) => n._id).filter((id): id is string => typeof id === 'string'));
  }, [items]);

  /** Alternar lido/não lido das selecionadas (ou da individual via swipe).
   *  Otimista: aplica o estado visual e sai do modo seleção antes da
   *  requisição; os dots loaders por item permanecem até a conclusão. */
  const aplicarEstadoLeitura = useCallback(async (ids: string[], lido: boolean) => {
    if (ids.length === 0) return;
    setProcessandoIds((prev) => [...prev, ...ids]);
    setItems((prev) => aplicarLeitura(prev, ids, lido));
    // Remove os efeitos do modo seleção já no início, não no final.
    sairDaSelecao();
    try {
      if (lido) {
        await markNotificationsRead(ids);
      } else {
        await markNotificationsUnread(ids);
      }
    } finally {
      setProcessandoIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  }, [sairDaSelecao]);

  const handleSwipeToggle = useCallback((item: AppNotification) => {
    if (!item._id) return;
    void aplicarEstadoLeitura([item._id], !item.readAt);
  }, [aplicarEstadoLeitura]);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <NotificationItem
      item={item}
      onPress={handlePress}
      modoSelecao={modoSelecao}
      selecionado={selecionados.includes(item._id ?? '')}
      processando={item._id ? processandoIds.includes(item._id) : false}
      onToggleSelecionado={(n) => {
        if (!n._id) return;
        setSelecionados((prev) => alternarSelecao(prev, n._id as string));
      }}
      onToggleLido={handleSwipeToggle}
    />
  ), [handlePress, handleSwipeToggle, modoSelecao, processandoIds, selecionados]);

  // Carga inicial (somente autenticado)
  useEffect(() => {
    if (state !== 'signedIn') return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Carga de avisos públicos (convidado)
  useEffect(() => {
    if (state === 'signedIn') return;
    let cancelled = false;
    (async () => {
      setNoticesLoading(true);
      try {
        const list = await getNotices();
        if (!cancelled) setNotices(list);
      } finally {
        if (!cancelled) setNoticesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  const titulo = <Text style={[styles.title, { color: colors.text }]}>Notificações</Text>;

  // Branch convidado
  if (state !== 'signedIn') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.topBar}>
            <TopBackButton onPress={() => router.back()} />
            {titulo}
          </View>
        </SafeAreaView>
        <TouchableOpacity
          style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="Entre para ver novidades das suas favoritas"
        >
          <Text style={[styles.guestCardText, { color: colors.text }]}>Entre para ver novidades das suas favoritas</Text>
          <Text style={[styles.guestCardCta, { color: colors.primary }]}>Entrar</Text>
        </TouchableOpacity>

        {noticesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : notices.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Sem avisos no momento</Text>
        ) : (
          <FlatList
            data={notices}
            keyExtractor={(n) => n._id}
            renderItem={({ item }) => (
              <View style={[styles.noticeRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.noticeTitle, { color: colors.text }]}>{item.title}</Text>
                {item.body ? <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>{item.body}</Text> : null}
                {item.createdAt ? <Text style={[styles.noticeTime, { color: colors.textSecondary }]}>{tempoRelativo(item.createdAt)}</Text> : null}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          {modoSelecao ? (
            <TouchableOpacity
              style={styles.topAction}
              onPress={sairDaSelecao}
              hitSlop={24}
              accessibilityRole="button"
              accessibilityLabel="Cancelar seleção"
            >
              <Text style={[styles.topActionText, { color: colors.primary }]}>Cancelar</Text>
            </TouchableOpacity>
          ) : (
            <TopBackButton onPress={() => router.back()} />
          )}
          {titulo}
          {!modoSelecao ? (
            <TouchableOpacity
              style={styles.topActionRight}
              onPress={() => setModoSelecao(true)}
              hitSlop={24}
              accessibilityRole="button"
              accessibilityLabel="Selecionar notificações"
            >
              <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id ?? i.refId}
        renderItem={renderItem}
        onEndReached={() => { if (hasMore && !loading) void load(); }}
        onEndReachedThreshold={0.4}
        onRefresh={() => { sairDaSelecao(); void load(true); }}
        refreshing={loading && items.length === 0}
        ListEmptyComponent={!loading ? (error ? (
          <TouchableOpacity onPress={() => void load(true)} style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.textSecondary }}>{error}</Text>
            <Text style={{ color: colors.primary, marginTop: 8 }}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Sem novidades por aqui</Text>
        )) : undefined}
        contentContainerStyle={modoSelecao ? styles.listComBarra : undefined}
      />

      {modoSelecao ? (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={selecionarTudo}
            disabled={items.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Selecionar todas"
          >
            <Ionicons name="checkbox-outline" size={20} color={items.length === 0 ? colors.textSecondary : colors.primary} />
            <Text style={[styles.actionText, { color: items.length === 0 ? colors.textSecondary : colors.primary }]}>Tudo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => void aplicarEstadoLeitura(selecionados, true)}
            disabled={selecionados.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Marcar selecionadas como lidas"
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={selecionados.length === 0 ? colors.textSecondary : colors.primary} />
            <Text style={[styles.actionText, { color: selecionados.length === 0 ? colors.textSecondary : colors.primary }]}>Marcar lida</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => void aplicarEstadoLeitura(selecionados, false)}
            disabled={selecionados.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Marcar selecionadas como não lidas"
          >
            <Ionicons name="mail-open-outline" size={20} color={selecionados.length === 0 ? colors.textSecondary : colors.primary} />
            <Text style={[styles.actionText, { color: selecionados.length === 0 ? colors.textSecondary : colors.primary }]}>Marcar não lida</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flexShrink: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    ...Typography.h4,
    fontFamily: FontFamily.heading700,
    fontWeight: FontWeight.bold,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  topAction: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-start', zIndex: 10, elevation: 10 },
  topActionRight: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    // Espelhado ao TopBackButton: canto direito, acima do título absoluto
    position: 'absolute',
    right: 8,
    zIndex: 10,
    elevation: 10,
  },
  topActionText: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  listComBarra: { paddingBottom: 72 },
  actionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.two,
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 10,
    elevation: 10,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  actionText: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  guestCard: { margin: Spacing.three, padding: Spacing.three, borderRadius: 12, borderWidth: 1, gap: Spacing.one },
  guestCardText: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  guestCardCta: { ...Typography.body, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  empty: { textAlign: 'center', marginTop: 40, ...Typography.body },
  noticeRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  noticeTitle: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  noticeBody: { ...Typography.caption },
  noticeTime: { ...Typography.caption, marginTop: 2 },
});
