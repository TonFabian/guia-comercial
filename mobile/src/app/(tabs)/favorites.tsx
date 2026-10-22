import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { CompanyRating } from '@/features/company/company-rating';
import { openCompanyDetails } from '@/features/company/open-company';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { categoryLabel } from '@/types/domain';

export default function FavoritesScreen() {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Favoritos</Text>

        {favorites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="heart-outline" size={48} color={GuiaColors.textSecondary} />
            <Text style={styles.emptyText}>
              Toque no coração na tela da empresa para salvar aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((company) => (
              <View key={company._id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardBody}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes de ${company.name}`}
                  onPress={() => openCompanyDetails(company._id)}>
                  <Text style={styles.name}>{company.name}</Text>
                  <Text style={styles.category}>{categoryLabel(company.category)}</Text>
                  {company.address && <Text style={styles.address}>{company.address}</Text>}
                  <CompanyRating rating={company.rating} ratingCount={company.ratingCount} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${company.name} dos favoritos`}
                  onPress={() => toggleFavorite(company)}>
                  <Ionicons name="heart" size={20} color={GuiaColors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
  },
  title: {
    color: GuiaColors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '700',
  },
  category: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  address: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
  removeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: GuiaColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
