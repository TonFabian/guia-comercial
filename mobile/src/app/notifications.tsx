import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AppNotification, Notice } from '@/types/domain';
import { ehDeepLinkValido } from '@/utils/deep-link';
import { getNotifications, markNotificationsRead, getNotices } from '@/services/api';
import { NotificationItem } from '@/features/notifications/notification-item';
import { tempoRelativo } from '@/features/notifications/tempo-relativo';
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

  // Estado convidado (avisos públicos)
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

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
    if (item._id) await markNotificationsRead([item._id]);
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, readAt: new Date().toISOString() } : n)));
    if (item.deepLink && ehDeepLinkValido(item.deepLink)) router.push(item.deepLink as any);
  }, [router]);

  const handleMarkAll = useCallback(async () => {
    await markNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }, []);

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

  // Branch convidado
  if (state !== 'signedIn') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
        </View>
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
        <TouchableOpacity onPress={() => void handleMarkAll()} accessibilityRole="button" accessibilityLabel="Marcar todas como lidas">
          <Text style={[styles.markAll, { color: colors.primary }]}>Marcar todas</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i._id ?? i.refId}
        renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
        onEndReached={() => { if (hasMore && !loading) void load(); }}
        onEndReachedThreshold={0.4}
        onRefresh={() => void load(true)}
        refreshing={loading && items.length === 0}
        ListEmptyComponent={!loading ? (error ? (
          <TouchableOpacity onPress={() => void load(true)} style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.textSecondary }}>{error}</Text>
            <Text style={{ color: colors.primary, marginTop: 8 }}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Sem novidades por aqui</Text>
        )) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  headerTitle: { ...Typography.h4, fontFamily: FontFamily.heading700, fontWeight: FontWeight.bold },
  markAll: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
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