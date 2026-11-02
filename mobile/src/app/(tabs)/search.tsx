import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { openCompanyDetails } from '@/features/company/open-company';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  getCategories,
  getCompanies,
  getCompaniesByCategory,
  searchCompanies,
} from '@/services/api';
import { isApiConfigured } from '@/services/http';
import type { Category, Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';

/** Tempo de espera antes de consultar a API a cada tecla digitada. */
const DEBOUNCE_MS = 250;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const routeTerm = (params.q ?? '').trim();
  const categorySlug = (params.category ?? '').trim();

  // Texto digitado manualmente prevalece sobre o parâmetro da rota.
  const [manualTerm, setManualTerm] = useState<string | null>(null);
  const term = (manualTerm ?? routeTerm).trim();

  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      async function load() {
        const allCategories = await getCategories();

        let results: Company[];
        if (term && categorySlug) {
          const [byTerm, byCategory] = await Promise.all([
            searchCompanies(term),
            getCompaniesByCategory(categorySlug),
          ]);
          const categoryIds = new Set(byCategory.map((company) => company._id));
          results = byTerm.filter((company) => categoryIds.has(company._id));
        } else if (term) {
          results = await searchCompanies(term);
        } else if (categorySlug) {
          results = await getCompaniesByCategory(categorySlug);
        } else {
          results = await getCompanies();
        }

        if (cancelled) return;
        setCategories(allCategories);
        setCompanies(results);
        setLoading(false);
      }

      void load();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, categorySlug]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  const filteredCategories = useMemo(() => {
    if (!term) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(term.toLowerCase()),
    );
  }, [categories, term]);

  const clearSearch = () => {
    setManualTerm('');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Buscar</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Empresa, produto ou serviço"
            placeholderTextColor={colors.textSecondary}
            value={term}
            onChangeText={setManualTerm}
            autoCorrect={false}
            returnKeyType="search"
          />
          {term.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {selectedCategory && (
          <View style={styles.chip}>
            <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
            <Text style={styles.chipText}>{selectedCategory.name}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 110 + Math.max(insets.bottom, 10),
            }}
          >
            {filteredCategories.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Categorias</Text>
                {filteredCategories.map((category) => (
                  <View key={category._id} style={styles.row}>
                    <Ionicons name="grid-outline" size={18} color={colors.primary} />
                    <Text style={styles.rowTitle}>{category.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {companies.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Empresas</Text>
                {companies.map((company) => (
                  <TouchableOpacity
                    key={company._id}
                    style={styles.row}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver detalhes de ${company.name}`}
                    onPress={() => openCompanyDetails(company._id)}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{company.name}</Text>
                      <Text style={styles.rowSubtitle}>
                        {categoryLabel(company.category)}
                        {company.address ? ` — ${company.address}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {filteredCategories.length === 0 && companies.length === 0 && (
              <Text style={styles.emptyText}>
                {term
                  ? `Nada encontrado para "${term}".`
                  : 'Pesquise por empresas, produtos ou serviços da cidade.'}
              </Text>
            )}
          </ScrollView>
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
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: Spacing.three,
    },
    title: {
      color: colors.text,
      fontSize: Type.headline,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: Radius.search,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      height: 50,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: Type.subtitle,
      paddingVertical: 0,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.tag,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    chipText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    spinner: {
      marginTop: Spacing.four,
    },
    group: {
      marginBottom: Spacing.four,
    },
    groupTitle: {
      color: colors.textSecondary,
      fontSize: Type.small,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: Spacing.two,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: Radius.iconBox,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: Spacing.two,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
    rowSubtitle: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: Type.base,
      textAlign: 'center',
      marginTop: Spacing.four,
    },
  });
}
