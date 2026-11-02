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
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { isOpenNow, parseOpeningHours } from '@/features/company/opening-hours';
import { openCompanyDetails } from '@/features/company/open-company';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  getCategories,
  getCompanies,
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

  const [manualCategories, setManualCategories] = useState<string[] | null>(null);
  const selectedSlugs: string[] = useMemo(
    () => manualCategories ?? (routeCategory ? [routeCategory] : []),
    [manualCategories, routeCategory],
  );

  const [nearMeCity, setNearMeCity] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);

  function normalizeCity(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  async function toggleNearMe() {
    if (nearMeCity) {
      setNearMeCity(null);
      return;
    }
    setNearMeLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearMeCity(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const city = place?.city ?? place?.subregion ?? null;
      setNearMeCity(city);
    } catch {
      setNearMeCity(null);
    } finally {
      setNearMeLoading(false);
    }
  }

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
        const filtering = selectedSlugs.length > 0 || openNowOnly || !!nearMeCity;

        if (filtering) {
          // Múltiplas categorias: carrega tudo e filtra no cliente.
          const r = term
            ? await searchCompanies(term, 1, 100)
            : await getCompanies(1, 100);
          const slugSet = new Set(selectedSlugs);
          const items = r.items.filter((c) => {
            const cat = typeof c.category === 'string' ? c.category : c.category?._id ?? c.category?.slug;
            // category may be slug or id; match by slug via categories lookup
            const catSlug = categories.find((x) => x._id === cat)?.slug ?? (typeof c.category === 'string' ? c.category : c.category?.slug);
            return slugSet.has(catSlug ?? '');
          });
          pageResult = { items, total: items.length };
        } else if (term) {
          const r = await searchCompanies(term, 1, pageSize);
          pageResult = { items: r.items, total: r.total };
        } else {
          const r = await getCompanies(1, pageSize);
          pageResult = { items: r.items, total: r.total };
        }

        if (cancelled) return;
        setCategories(allCategories);
        let finalItems = pageResult.items;
        if (nearMeCity) {
          const target = normalizeCity(nearMeCity);
          finalItems = finalItems.filter((c) => normalizeCity(c.city) === target);
        }
        if (openNowOnly) {
          const now = new Date();
          finalItems = finalItems.filter((c) => {
            const status = isOpenNow(parseOpeningHours(c.openingHours ?? []), now);
            return status === true;
          });
        }
        setCompanies(finalItems);
        setTotal(finalItems.length);
        setLoading(false);
      }

      void load();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, selectedSlugs, nearMeCity, openNowOnly]);

  const selectedCategories = useMemo(
    () => categories.filter((category) => selectedSlugs.includes(category.slug)),
    [categories, selectedSlugs],
  );

  const filteredCategories = useMemo(() => {
    let result = categories;
    if (term) {
      result = result.filter((category) =>
        category.name.toLowerCase().includes(term.toLowerCase()),
      );
    }
    if (selectedSlugs.length > 0) {
      result = result.filter((category) => !selectedSlugs.includes(category.slug));
    }
    return result;
  }, [categories, term, selectedSlugs]);

  const clearSearch = () => {
    setManualTerm('');
  };

  const loadMore = async () => {
    if (loadingMore || companies.length >= total || selectedSlugs.length > 0 || openNowOnly || !!nearMeCity) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      let items: Company[] = [];
      if (term) {
        items = (await searchCompanies(term, nextPage, pageSize)).items;
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

        {selectedCategories.length > 0 && (
          <View style={styles.chipsRow}>
            {selectedCategories.map((cat) => (
              <View key={cat._id} style={styles.chip}>
                <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                <Text style={styles.chipText}>{cat.name}</Text>
                <TouchableOpacity
                  onPress={() => setManualCategories(selectedSlugs.filter((s) => s !== cat.slug))}
                  hitSlop={8}
                  accessibilityLabel={`Remover filtro ${cat.name}`}
                >
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
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
            {nearMeCity && (
              <View style={styles.chip}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.chipText}>Perto de mim: {nearMeCity}</Text>
                <TouchableOpacity onPress={() => setNearMeCity(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.nearMeButton, nearMeCity && styles.nearMeButtonActive]}
              onPress={toggleNearMe}
              disabled={nearMeLoading}
            >
              <Ionicons name="navigate" size={16} color={nearMeCity ? colors.background : colors.primary} />
              <Text style={[styles.nearMeText, nearMeCity && styles.nearMeTextActive]}>
                {nearMeLoading ? 'Localizando…' : nearMeCity ? 'Perto de mim ✓' : 'Perto de mim'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nearMeButton, openNowOnly && styles.nearMeButtonActive]}
              onPress={() => setOpenNowOnly((v) => !v)}
            >
              <Ionicons name="time" size={16} color={openNowOnly ? colors.background : colors.primary} />
              <Text style={[styles.nearMeText, openNowOnly && styles.nearMeTextActive]}>
                {openNowOnly ? 'Aberto agora ✓' : 'Aberto agora'}
              </Text>
            </TouchableOpacity>

            {filteredCategories.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Categorias</Text>
                {filteredCategories.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (selectedSlugs.includes(category.slug)) {
                        setManualCategories(selectedSlugs.filter((s) => s !== category.slug));
                      } else {
                        setManualCategories([...selectedSlugs, category.slug]);
                      }
                    }}
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
            {companies.length === 0 && !loading && (
              <Text style={styles.emptyText}>
                {nearMeCity
                  ? `Nenhuma empresa encontrada perto de ${nearMeCity}.`
                  : openNowOnly
                  ? 'Nenhuma empresa aberta agora.'
                  : term
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
    nearMeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: Radius.tag,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginBottom: Spacing.two,
    },
    nearMeButtonActive: {
      backgroundColor: colors.primary,
    },
    nearMeText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    nearMeTextActive: {
      color: colors.background,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.two,
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
