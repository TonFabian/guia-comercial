import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/use-theme-colors';

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Favoritos</Text>
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            Suas empresas favoritas aparecerão aqui.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    emptyBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}