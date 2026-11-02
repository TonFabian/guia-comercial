import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { SectionHeader } from '@/features/home/section-header';
import { EmergencyPhonesModal } from '@/features/home/emergency-phones-modal';
import { PUBLIC_UTILITIES, resolveUtilityDestination } from '@/features/home/public-utility';
import type { PublicUtility } from '@/features/home/public-utility';
import { openCompanyDetails } from '@/features/company/open-company';
import type { Company } from '@/types/domain';

export function PublicUtilitySection({ pharmacy }: { pharmacy: Company | null }) {
  const [phonesVisible, setPhonesVisible] = useState(false);

  function handlePress(utility: PublicUtility) {
    const destination = resolveUtilityDestination(utility, pharmacy?._id ?? null);

    if (destination.kind === 'company') {
      openCompanyDetails(destination.companyId);
      return;
    }
    if (destination.kind === 'search') {
      router.push({ pathname: '/search', params: { q: destination.term } });
      return;
    }
    setPhonesVisible(true);
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Dicas & Utilidade Pública" icon="megaphone-outline" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}>
        {PUBLIC_UTILITIES.map((utility) => (
          <TouchableOpacity
            key={utility.id}
            style={styles.card}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${utility.title}. ${utility.description}`}
            onPress={() => handlePress(utility)}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={utility.icon} size={24} color={GuiaColors.primary} />
            </View>
            <Text style={styles.cardTitle}>{utility.title}</Text>
            <Text style={styles.cardDescription}>{utility.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <EmergencyPhonesModal visible={phonesVisible} onClose={() => setPhonesVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 152,
    minHeight: 128,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: Spacing.three,
    gap: Spacing.two,
    marginRight: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconBox,
    backgroundColor: Overlays.amberTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: GuiaColors.text,
    fontSize: Type.body,
    fontWeight: '700',
  },
  cardDescription: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    lineHeight: 16,
  },
});
