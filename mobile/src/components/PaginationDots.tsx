import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { buildPaginationDots } from '@/utils/pagination-dots';

const DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 20;
const DOT_GAP = 6;
const DOT_MARGIN_TOP = 10;

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
}

export function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const dots = buildPaginationDots(total, activeIndex);

  if (dots.length === 0) return null;

  const currentPage = dots.findIndex((dot) => dot.active) + 1;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Página ${currentPage} de ${dots.length}`}
    >
      {dots.map((dot) => (
        <View
          key={dot.index}
          style={[styles.dot, dot.active ? styles.activeDot : styles.inactiveDot]}
        />
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: DOT_GAP,
      marginTop: DOT_MARGIN_TOP,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
    },
    activeDot: {
      width: ACTIVE_DOT_WIDTH,
      backgroundColor: colors.primary,
    },
    inactiveDot: {
      backgroundColor: colors.paginationInactive,
    },
  });
}
