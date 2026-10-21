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
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { getCategories, getCompanies, getCompaniesByCategory, searchCompanies } from '@/services/api';
import { categoryLabel } from '@/types/domain';
import type { Category, Company } from '@/types/domain';

/** Tempo de espera antes de consultar a API a cada tecla digitada. */
const DEBOUNCE_MS = 250;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
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
    return categories.filter((category) => category.name.toLowerCase().includes(term.toLowerCase()));
  }, [categories, term]);

  const clearSearch = () => {
    setManualTerm('');
  };

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
            value={term}
            onChangeText={setManualTerm}
            autoCorrect={false}
            returnKeyType="search"
          />
          {term.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={GuiaColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {selectedCategory && (
          <View style={styles.chip}>
            <Ionicons name="pricetag-outline" size={14} color={GuiaColors.primary} />
            <Text style={styles.chipText}>{selectedCategory.name}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.spinner} color={GuiaColors.primary} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredCategories.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Categorias</Text>
                {filteredCategories.map((category) => (
                  <View key={category._id} style={styles.row}>
                    <Ionicons name="grid-outline" size={18} color={GuiaColors.primary} />
                    <Text style={styles.rowTitle}>{category.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {companies.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Empresas</Text>
                {companies.map((company) => (
                  <View key={company._id} style={styles.row}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{company.name}</Text>
                      <Text style={styles.rowSubtitle}>
                        {categoryLabel(company.category)}
                        {company.address ? ` — ${company.address}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={GuiaColors.textSecondary} />
                  </View>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: Spacing.three,
  },
  title: {
    color: GuiaColors.text,
    fontSize: Type.headline,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.search,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    paddingVertical: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.tag,
    borderWidth: 1,
    borderColor: GuiaColors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    color: GuiaColors.primary,
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
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.iconBox,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: 14,
    marginBottom: Spacing.two,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  emptyText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
