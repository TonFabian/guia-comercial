import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface CompanyRatingProps {
  rating?: number;
  ratingCount?: number;
  size?: 'body' | 'title';
}

/** Nota da empresa com a contagem de avaliações (quando existe). */
export function CompanyRating({ rating, ratingCount, size = 'body' }: CompanyRatingProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  if (rating === undefined) return null;

  const isTitle = size === 'title';

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons
        name="star"
        size={isTitle ? 18 : 14}
        color={colors.primary}
      />
      <Text style={[styles.value, isTitle && styles.valueTitle]}>{rating.toFixed(1)}</Text>
      {ratingCount !== undefined && (
        <Text style={[styles.count, isTitle && styles.countTitle]}>
          ({ratingCount} {ratingCount === 1 ? 'avaliação' : 'avaliações'})
        </Text>
      )}
      {ratingCount === undefined && <Text style={styles.count}>sem avaliações</Text>}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    value: {
      color: colors.text,
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    valueTitle: {
      ...Typography.h5,
    },
    count: {
      color: colors.textSecondary,
      ...Typography.caption,
    },
    countTitle: {
      ...Typography.body,
    },
  });
}
