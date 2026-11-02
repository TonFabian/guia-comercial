import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Type } from '@/constants/theme';

interface CompanyRatingProps {
  rating?: number;
  ratingCount?: number;
  size?: 'body' | 'title';
}

/** Nota da empresa com a contagem de avaliações (quando existe). */
export function CompanyRating({ rating, ratingCount, size = 'body' }: CompanyRatingProps) {
  if (rating === undefined) return null;

  const isTitle = size === 'title';

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons
        name="star"
        size={isTitle ? 18 : 14}
        color={GuiaColors.primary}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    color: GuiaColors.text,
    fontSize: Type.body,
    fontWeight: '700',
  },
  valueTitle: {
    fontSize: Type.section,
  },
  count: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
  countTitle: {
    fontSize: Type.body,
  },
});
