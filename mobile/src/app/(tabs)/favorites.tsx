import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { CompanyRating } from '@/features/company/company-rating';
import { openCompanyDetails } from '@/features/company/open-company';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { categoryLabel } from '@/types/domain';

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Favoritos</Text>

        {favorites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="heart-outline" size={48} color={GuiaColors.textSecondary} />
            <Text style={styles.emptyText}>
              Nenhum favorito ainda. Toque no ícone de coração na tela da empresa para adicioná-la.
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
                  onPress={() => openCompanyDetails(company._id)}
                >
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
                  onPress={() => toggleFavorite(company)}
                >
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      paddingHorizontal: Spacing.three,
      paddingTop: 12,
    },
    title: {
      color: colors.text,
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
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
    },
    cardBody: {
      flex: 1,
      gap: 3,
    },
    name: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '700',
    },
    category: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    address: {
      color: colors.textSecondary,
      fontSize: Type.small,
    },
    removeButton: {
      width: 38,
      height: 38,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
