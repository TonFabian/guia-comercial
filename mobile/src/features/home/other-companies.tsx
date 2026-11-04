import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { SectionHeader } from './section-header';

export function OtherCompanies({ companies }: { companies: Company[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (companies.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <SectionHeader title="Outras Empresas & Serviços Locais" />
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>Ver todas ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.list}>
        {companies.map((c) => (
          <TouchableOpacity
            key={c._id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/company/${c._id}` as any)}
          >
            <View style={styles.thumb}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {categoryLabel(c.category)}
                {c.address ? ` · ${c.address}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: Spacing.four },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: Spacing.two },
    seeAll: { color: colors.primary, fontSize: Type.small, fontWeight: '700' },
    list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    name: { color: colors.text, fontSize: 14, fontWeight: '700' },
    meta: { color: colors.textSecondary, fontSize: 12 },
  });
}