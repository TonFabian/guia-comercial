import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';

import { CompanyRating } from './company-rating';

/** Cabeçalho da empresa: capa, logo, nome, categoria, selo e nota. */
export function CompanyHero({ company }: { company: Company }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View>
      <View style={styles.cover}>
        {company.cover ? (
          <Image
            source={{ uri: company.cover }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.coverFallback}>
            <MaterialCommunityIcons name="storefront" size={56} color={Overlays.whiteSoft} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.logoBox}>
          {company.logo ? (
            <Image
              source={{ uri: company.logo }}
              style={styles.logoImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <MaterialCommunityIcons name="storefront" size={28} color={colors.primary} />
          )}
        </View>

        <Text style={styles.name}>{company.name}</Text>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.category}>{categoryLabel(company.category)}</Text>
          {company.isVerified && (
            <View style={styles.verified}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={colors.primary} />
              <Text style={styles.verifiedText}>Verificada</Text>
            </View>
          )}
        </View>

        <CompanyRating rating={company.rating} ratingCount={company.ratingCount} size="title" />
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    cover: {
      height: 180,
      backgroundColor: colors.coverPlaceholder,
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.three,
      gap: 6,
      paddingBottom: Spacing.three,
    },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: Radius.iconBox,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 4,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    name: {
      color: colors.text,
      fontSize: Type.headline,
      fontWeight: '800',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    category: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: Overlays.amberTag,
      borderRadius: Radius.chip,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    verifiedText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
  });
}
