import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';

export default function SearchScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Buscar</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={GuiaColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Empresa, produto ou serviço"
            placeholderTextColor={GuiaColors.textSecondary}
          />
        </View>
        <Text style={styles.emptyText}>Pesquise por empresas, produtos ou serviços da cidade.</Text>
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
    gap: 16,
  },
  title: {
    color: GuiaColors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GuiaColors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  emptyText: {
    color: GuiaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
});
