import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { CompanyRating } from './company-rating';

interface CompanyReviewsProps {
  rating?: number;
  ratingCount?: number;
}

/**
 * Resumo das avaliações. Ainda não existe modelo de avaliação na API, então
 * a lista fica vazia — mas a nota e a contagem reais aparecem quando existem.
 */
export function CompanyReviews({ rating, ratingCount }: CompanyReviewsProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <>
      {rating !== undefined && (
        <View style={styles.summary}>
          <CompanyRating rating={rating} ratingCount={ratingCount} size="title" />
        </View>
      )}

      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>Ainda sem avaliações detalhadas</Text>
        <Text style={styles.emptyText}>
          As opiniões dos clientes aparecerão aqui assim que forem publicadas.
        </Text>
      </View>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    empty: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: Spacing.three,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: Type.body,
      textAlign: 'center',
    },
  });
}
