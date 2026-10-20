import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';

export default function FavoritesScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Favoritos</Text>
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={48} color={GuiaColors.textSecondary} />
          <Text style={styles.emptyText}>
            Suas empresas favoritas aparecerão aqui.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    color: GuiaColors.text,
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
    color: GuiaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
