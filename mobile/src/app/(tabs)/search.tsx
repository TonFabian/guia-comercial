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
  const routeCategory = (params.category ?? '').trim();

  // Texto digitado manualmente prevalece sobre o parâmetro da rota.
  const [manualTerm, setManualTerm] = useState<string | null>(null);
  const term = (manualTerm ?? routeTerm).trim();

  const [manualCategory, setManualCategory] = useState<string | null>(null);
  const categorySlug = (manualCategory ?? routeCategory).trim();

  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setPage(1);
      async function load() {
        const allCategories = await getCategories();

        let pageResult: { items: Company[]; total: number };
        if (term && categorySlug) {
          const [byTerm, byCategory] = await Promise.all([
            searchCompanies(term, 1, pageSize),
            getCompaniesByCategory(categorySlug, 1, pageSize),
          ]);
          const categoryIds = new Set(byCategory.items.map((company) => company._id));
          const items = byTerm.items.filter((company) => categoryIds.has(company._id));
          pageResult = { items, total: items.length };
        } else if (term) {
          const r = await searchCompanies(term, 1, pageSize);
          pageResult = { items: r.items, total: r.total };
        } else if (categorySlug) {
          const r = await getCompaniesByCategory(categorySlug, 1, pageSize);
          pageResult = { items: r.items, total: r.total };
        } else {
          const r = await getCompanies(1, pageSize);
          pageResult = { items: r.items, total: r.total };
        }

        if (cancelled) return;
        setCategories(allCategories);
        setCompanies(pageResult.items);
        setTotal(pageResult.total);
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

  const loadMore = async () => {
    if (loadingMore || companies.length >= total) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      let items: Company[] = [];
      if (term && categorySlug) {
        const [byTerm, byCategory] = await Promise.all([
          searchCompanies(term, nextPage, pageSize),
          getCompaniesByCategory(categorySlug, nextPage, pageSize),
        ]);
        const categoryIds = new Set(byCategory.items.map((c) => c._id));
        items = byTerm.items.filter((c) => categoryIds.has(c._id));
      } else if (term) {
        items = (await searchCompanies(term, nextPage, pageSize)).items;
      } else if (categorySlug) {
        items = (await getCompaniesByCategory(categorySlug, nextPage, pageSize)).items;
      } else {
        items = (await getCompanies(nextPage, pageSize)).items;
      }
      setCompanies((prev) => [...prev, ...items]);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
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
            <TouchableOpacity
              onPress={() => setManualCategory('')}
              hitSlop={8}
              accessibilityLabel={`Remover filtro ${selectedCategory.name}`}
            >
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
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
                  <TouchableOpacity
                    key={category._id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => setManualCategory(category.slug)}
                  >
                    <Ionicons name="grid-outline" size={18} color={colors.primary} />
                    <Text style={styles.rowTitle}>{category.name}</Text>
                  </TouchableOpacity>
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

            {companies.length > 0 && companies.length < total && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
              >
                <Text style={styles.loadMoreText}>
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </Text>
              </TouchableOpacity>
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
    loadMoreButton: {
      alignSelf: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: Radius.chip,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: Spacing.two,
    },
    loadMoreText: {
      color: colors.primary,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: Type.base,
      textAlign: 'center',
      marginTop: Spacing.four,
    },
  });
}
