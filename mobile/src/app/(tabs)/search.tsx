import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { openCompanyDetails } from '@/features/company/open-company';
import {
  deriveSearchView,
  loadFirstPage,
  loadNextPage,
  SEARCH_PAGE_SIZE,
} from '@/features/search/search-pagination';
import type {
  CompanyPageFetcher,
  SearchFilters,
  SearchState,
} from '@/features/search/search-pagination';
import { useVoiceSearch } from '@/features/search/use-voice-search';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getCategories, searchCompanies } from '@/services/api';
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState<Company[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [exhausted, setExhausted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filters = useMemo<SearchFilters>(
    () => ({ term, categorySlugs: selectedSlugs, openNowOnly, nearMeCity }),
    [term, selectedSlugs, openNowOnly, nearMeCity],
  );

  /** O filtro de categoria vai para o servidor (vários slugs na mesma requisição). */
  const fetcher = useCallback<CompanyPageFetcher>(
    (currentFilters, pageNumber, pageSize) =>
      searchCompanies({
        q: currentFilters.term,
        categories: currentFilters.categorySlugs,
        page: pageNumber,
        pageSize,
      }),
    [],
  );

  // Categorias: carregadas uma vez, sem depender dos filtros da busca.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCategories();
        if (!cancelled) setCategories(list);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Busca: recomeça do zero quando qualquer filtro muda.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await loadFirstPage(filters, fetcher, SEARCH_PAGE_SIZE);
          if (cancelled) return;
          setLoaded(result.loaded);
          setServerTotal(result.serverTotal);
          setPage(result.page);
          setExhausted(result.exhausted);
        } catch (caught) {
          if (cancelled) return;
          setLoaded([]);
          setServerTotal(0);
          setPage(0);
          setExhausted(true);
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar as empresas.',
          );
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, fetcher, reloadToken]);

  const state = useMemo<SearchState>(
    () => ({ loaded, serverTotal, page, exhausted }),
    [loaded, serverTotal, page, exhausted],
  );

  const view = useMemo(
    () => deriveSearchView(state, filters, new Date()),
    [state, filters],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !view.hasMore) return;
    setLoadingMore(true);
    try {
      const next = await loadNextPage(state, filters, fetcher, SEARCH_PAGE_SIZE);
      setLoaded(next.loaded);
      setServerTotal(next.serverTotal);
      setPage(next.page);
      setExhausted(next.exhausted);
    } catch {
      setError('Não foi possível carregar mais empresas.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, view.hasMore, state, filters, fetcher]);

  const { listening, error: voiceError, start: startVoice } = useVoiceSearch((transcript) => {
    setManualTerm(transcript);
  });

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

  const clearAllFilters = () => {
    setManualCategories([]);
    setNearMeCity(null);
    setOpenNowOnly(false);
  };

  const retry = () => {
    setReloadToken((token) => token + 1);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Buscar</Text>
          <TouchableOpacity onPress={() => router.push('/map')} style={styles.mapButton}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={styles.mapButtonText}>Mapa</Text>
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity
            style={styles.micButton}
            activeOpacity={0.7}
            onPress={startVoice}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Ouvindo, fale agora' : 'Buscar por voz'}
          >
            <Ionicons
              name={listening ? 'mic' : 'mic-outline'}
              size={18}
              color={listening ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          {term.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retry}
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar as empresas novamente"
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : (
          <FlatList
            data={view.items}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              void loadMore();
            }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              paddingBottom: 110 + Math.max(insets.bottom, 10),
            }}
            ListHeaderComponent={
              <>
                {selectedCategories.length > 0 && (
                  <View style={styles.selectedChipsRow}>
                    {selectedCategories.map((cat) => (
                      <View key={cat._id} style={styles.chip}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                        <Text style={styles.chipText}>{cat.name}</Text>
                        <TouchableOpacity
                          onPress={() => setManualCategories(selectedSlugs.filter((s) => s !== cat.slug))}
                          hitSlop={8}
                          accessibilityLabel={`Remover filtro ${cat.name}`}
                        >
                          <Ionicons name="close-circle" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
                      <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.clearAllText}>Limpar tudo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {nearMeCity && (
                  <View style={styles.chip}>
                    <Ionicons name="location" size={14} color={colors.primary} />
                    <Text style={styles.chipText}>Perto de mim: {nearMeCity}</Text>
                    <TouchableOpacity onPress={() => setNearMeCity(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  <TouchableOpacity
                    style={[styles.categoryChip, nearMeCity && styles.categoryChipSelected]}
                    activeOpacity={0.7}
                    onPress={toggleNearMe}
                    disabled={nearMeLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar empresas perto de mim"
                  >
                    <Ionicons name="navigate" size={14} color={nearMeCity ? colors.background : colors.primary} />
                    <Text style={[styles.categoryChipText, nearMeCity && styles.categoryChipTextSelected]}>
                      {nearMeLoading ? 'Localizando…' : 'Perto de mim'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryChip, openNowOnly && styles.categoryChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setOpenNowOnly((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar empresas abertas agora"
                  >
                    <Ionicons name="time" size={14} color={openNowOnly ? colors.background : colors.primary} />
                    <Text style={[styles.categoryChipText, openNowOnly && styles.categoryChipTextSelected]}>
                      Aberto agora
                    </Text>
                  </TouchableOpacity>

                  {filteredCategories.map((category) => {
                    const selected = selectedSlugs.includes(category.slug);
                    return (
                      <TouchableOpacity
                        key={category._id}
                        style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (selected) {
                            setManualCategories(selectedSlugs.filter((s) => s !== category.slug));
                          } else {
                            setManualCategories([...selectedSlugs, category.slug]);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Filtrar por ${category.name}`}
                      >
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {(nearMeCity || openNowOnly) && selectedCategories.length === 0 && (
                  <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
                    <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.clearAllText}>Limpar todos os filtros</Text>
                  </TouchableOpacity>
                )}

                {view.items.length > 0 && (
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>Empresas</Text>
                    <Text style={styles.groupCount}>
                      {view.total > view.items.length
                        ? `${view.items.length} de ${view.total}`
                        : `${view.items.length}`}
                    </Text>
                  </View>
                )}
              </>
            }
            renderItem={({ item: company }) => (
              <TouchableOpacity
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
            )}
            ListFooterComponent={
              <>
                {view.hasMore && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMore}
                    disabled={loadingMore}
                    accessibilityRole="button"
                    accessibilityLabel="Carregar mais empresas"
                  >
                    <Text style={styles.loadMoreText}>
                      {loadingMore ? 'Carregando…' : 'Carregar mais'}
                    </Text>
                  </TouchableOpacity>
                )}
                {view.items.length === 0 && !loading && !error && (
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
              </>
            }
          />
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: colors.text,
      fontSize: Type.headline,
      fontWeight: '700',
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: Radius.chip,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapButtonText: {
      color: colors.primary,
      fontSize: Type.small,
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
    micButton: {
      padding: 4,
    },
    voiceError: {
      color: colors.error,
      fontSize: Type.small,
    },
    errorBox: {
      gap: Spacing.two,
      alignItems: 'flex-start',
    },
    errorText: {
      color: colors.error,
      fontSize: Type.body,
    },
    retryButton: {
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.chip,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    retryText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    selectedChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.two,
      marginBottom: Spacing.two,
    },
    chipsScroll: {
      gap: Spacing.three,
      paddingVertical: Spacing.two,
      marginBottom: Spacing.two,
    },
    categoryChip: {
      backgroundColor: colors.surface,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 18,
      marginRight: Spacing.two,
    },
    categoryChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.textSecondary,
      fontSize: Type.small,
      fontWeight: '600',
    },
    categoryChipTextSelected: {
      color: colors.background,
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
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: Spacing.two,
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
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.two,
    },
    groupTitle: {
      color: colors.textSecondary,
      fontSize: Type.small,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    groupCount: {
      color: colors.textSecondary,
      fontSize: Type.small,
      fontWeight: '600',
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
    clearAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginBottom: Spacing.two,
    },
    clearAllText: {
      color: colors.textSecondary,
      fontSize: Type.small,
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
