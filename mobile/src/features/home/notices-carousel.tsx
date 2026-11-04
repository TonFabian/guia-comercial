import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Notice } from '@/types/domain';
import { SectionHeader } from './section-header';

interface Props {
  notices: Notice[];
  loading?: boolean;
  error?: string | null;
}

const TYPE_COLORS: Record<Notice['type'], string> = {
  general: '#FFC107',
  alert: '#EF4444',
  health: '#22C55E',
};

export function NoticesCarousel({ notices, loading = false, error = null }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [selected, setSelected] = useState<Notice | null>(null);

  return (
    <View style={styles.section}>
      <SectionHeader title="📢 Avisos & Comunicados" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : notices.length === 0 ? (
        <Text style={styles.empty}>Sem avisos no momento</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {notices.map((n) => (
            <TouchableOpacity
              key={n._id}
              style={styles.card}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Aviso: ${n.title}`}
              onPress={() => setSelected(n)}
            >
              <View style={[styles.bar, { backgroundColor: TYPE_COLORS[n.type] ?? TYPE_COLORS.general }]} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                <Text style={styles.preview} numberOfLines={2}>{n.body}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && (
            <View style={styles.modalCard}>
              <View style={[styles.modalBar, { backgroundColor: TYPE_COLORS[selected.type] ?? TYPE_COLORS.general }]} />
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <Text style={styles.modalBody}>{selected.body}</Text>
              <TouchableOpacity style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: 20 },
    carousel: { paddingHorizontal: 16, gap: 12 },
    card: {
      width: 220,
      minHeight: 96,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    bar: { width: 4 },
    body: { flex: 1, padding: 12, gap: 4 },
    title: { color: colors.text, fontSize: Type.body, fontWeight: '700' },
    preview: { color: colors.textSecondary, fontSize: Type.small, lineHeight: 16 },
    center: { paddingVertical: 20, alignItems: 'center' },
    empty: { color: colors.textSecondary, fontSize: Type.small, paddingHorizontal: 16, paddingVertical: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: colors.surface, borderRadius: Radius.card, padding: 20, gap: 12 },
    modalBar: { width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
    modalTitle: { color: colors.text, fontSize: Type.subtitle, fontWeight: '700' },
    modalBody: { color: colors.textSecondary, fontSize: Type.base, lineHeight: 20 },
    closeBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.chip, backgroundColor: colors.surfaceAlt },
    closeBtnText: { color: colors.text, fontSize: Type.base, fontWeight: '600' },
  });
}