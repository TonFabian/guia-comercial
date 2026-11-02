import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { openCompanyDetails } from '@/features/company/open-company';
import { EmergencyPhonesModal } from '@/features/home/emergency-phones-modal';
import type { PublicUtility } from '@/features/home/public-utility';
import { PUBLIC_UTILITIES, resolveUtilityDestination } from '@/features/home/public-utility';
import { SectionHeader } from '@/features/home/section-header';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';

export function PublicUtilitySection({ pharmacy }: { pharmacy: Company | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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
      <SectionHeader title="Dicas & Utilidade Pública" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {PUBLIC_UTILITIES.map((utility) => (
          <TouchableOpacity
            key={utility.id}
            style={styles.card}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${utility.title}. ${utility.description}`}
            onPress={() => handlePress(utility)}
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={utility.icon} size={24} color={colors.primary} />
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontSize: Type.body,
      fontWeight: '700',
    },
    cardDescription: {
      color: colors.textSecondary,
      fontSize: Type.small,
      lineHeight: 16,
    },
  });
}
