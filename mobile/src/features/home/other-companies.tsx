import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { openWhatsApp } from '@/utils/links';
import { SectionHeader } from './section-header';

interface Props {
  companies: Company[];
  loading?: boolean;
  error?: string | null;
}

export function OtherCompanies({ companies, loading = false, error = null }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Outras Empresas & Serviços Locais"
        actionLabel="Ver todas"
        onAction={() => router.push('/search')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : companies.length === 0 ? (
        <Text style={styles.empty}>Nenhuma empresa cadastrada</Text>
      ) : (
        <View style={styles.list}>
          {companies.map((c) => (
            <View key={c._id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Empresa ${c.name}, ${categoryLabel(c.category)}`}
                onPress={() => router.push({ pathname: '/company/[id]', params: { id: c._id } })}
              >
                <View style={styles.thumb}>
                  <Ionicons name="storefront-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {categoryLabel(c.category)}
                    {c.address ? ` · ${c.address}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              {(c.whatsapp || c.phone) ? (
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`WhatsApp ${c.name}`}
                  onPress={() => openWhatsApp((c.whatsapp ?? c.phone) as string)}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: Spacing.four },
    list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    whatsappBtn: { padding: 6, borderRadius: Radius.chip, backgroundColor: colors.surfaceAlt },
    name: { color: colors.text, fontSize: Type.cardTitle, fontWeight: '600' },
    meta: { color: colors.textSecondary, fontSize: Type.body },
    center: { paddingVertical: 20, alignItems: 'center' },
    empty: { color: colors.textSecondary, fontSize: Type.small, paddingHorizontal: 16, paddingVertical: 12 },
  });
}