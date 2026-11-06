import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
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
import {
  buildSearchSections,
  resultadoObsoleto,
  temMaisPagina,
} from '@/features/search/tourism-search';
import type { SearchItem, SearchSection } from '@/features/search/tourism-search';
import {
  classificarEvento,
  formatarPeriodoEvento,
  hojeISO,
  labelCategoriaAtracao,
} from '@/features/tourism/event-meta';
import type { EstadoEvento } from '@/features/tourism/event-meta';
import { useThemeColors } from '@/hooks/use-theme-colors';
import {
  getCategories,
  getEvents,
  getTouristSpots,
  searchCompanies,
} from '@/services/api';
import type { TourismPage } from '@/services/api';
import type { Category, Company, TourEvent, TouristSpot } from '@/types/domain';
import { categoryLabel } from '@/types/domain';

/** Tempo de espera antes de consultar a API a cada tecla digitada. */
const DEBOUNCE_MS = 250;

/** Quantidade de atrações/eventos pedida ao servidor por página na busca. */
const TURISMO_PAGE_SIZE = 20;

/** Badge de estado do evento para exibição. */
const BADGE_EVENTO: Record<EstadoEvento, string> = {
  'em-breve': 'Em breve',
  agora: 'Hoje',
  encerrado: 'Encerrado',
};

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

  // Chips fixos de turismo ("Atrações" / "Eventos"): não vêm de /categories.
  const [showSpots, setShowSpots] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [events, setEvents] = useState<TourEvent[]>([]);
  // Estado de paginação por coleção: spots e events têm página/total
  // independentes (o total do servidor decide se há mais páginas).
  const [spotsPage, setSpotsPage] = useState(1);
  const [spotsTotal, setSpotsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [loadingTurismo, setLoadingTurismo] = useState(false);
  const [turismoError, setTurismoError] = useState<string | null>(null);
  // Geração da busca de turismo: incrementa a cada reset (termo, chip ou
  // reload). Um `loadMore` em voo compara sua geração capturada com esta
  // ref e descarta a resposta quando ela divergiu (race do termo antigo).
  const geracaoTurismo = useRef(0);

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

  // Turismo: buscado quando algum chip está ativo, com o mesmo debounce do
  // termo. O termo vai ao servidor (`q`) e cada mudança de termo/chips
  // recomeça em página 1. Erro de turismo tem try/catch próprio — não pode
  // derrubar as empresas, que seguem visíveis. O filtro local por termo
  // permanece no helper puro para cobrir o fallback mock (sem backend).
  useEffect(() => {
    let cancelled = false;
    // Qualquer mudança de termo/chip/reload reinicia a paginação: antes de
    // recomeçar as páginas, invalida respostas de `loadMore` ainda em voo.
    geracaoTurismo.current += 1;
    const timer = setTimeout(() => {
      void (async () => {
        if (!showSpots && !showEvents) {
          setTurismoError(null);
          setSpots([]);
          setEvents([]);
          setSpotsPage(1);
          setSpotsTotal(0);
          setEventsPage(1);
          setEventsTotal(0);
          return;
        }
        setLoadingTurismo(true);
        setTurismoError(null);
        try {
          const [spotsQueChegaram, eventsQueChegaram] = await Promise.all([
            showSpots
              ? getTouristSpots({ active: true, q: term, pageSize: TURISMO_PAGE_SIZE })
              : Promise.resolve<TourismPage<TouristSpot>>({ items: [], total: 0 }),
            showEvents
              ? getEvents({ active: true, q: term, pageSize: TURISMO_PAGE_SIZE })
              : Promise.resolve<TourismPage<TourEvent>>({ items: [], total: 0 }),
          ]);
          if (cancelled) return;
          setSpots(spotsQueChegaram.items);
          setEvents(eventsQueChegaram.items);
          setSpotsPage(1);
          setSpotsTotal(spotsQueChegaram.total);
          setEventsPage(1);
          setEventsTotal(eventsQueChegaram.total);
        } catch {
          if (cancelled) return;
          setSpots([]);
          setEvents([]);
          setSpotsPage(1);
          setSpotsTotal(0);
          setEventsPage(1);
          setEventsTotal(0);
          setTurismoError('Não foi possível carregar atrações e eventos.');
        } finally {
          if (!cancelled) setLoadingTurismo(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showSpots, showEvents, term, reloadToken]);

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

  // Cada coleção de turismo decide sozinha quando há mais páginas (o `total`
  // do servidor é a fonte da verdade — helper puro `temMaisPagina`).
  const spotsTemMais = temMaisPagina(spots.length, spotsTotal);
  const eventsTemMais = temMaisPagina(events.length, eventsTotal);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (!view.hasMore && !spotsTemMais && !eventsTemMais) return;
    setLoadingMore(true);
    try {
      if (view.hasMore) {
        try {
          const next = await loadNextPage(state, filters, fetcher, SEARCH_PAGE_SIZE);
          setLoaded(next.loaded);
          setServerTotal(next.serverTotal);
          setPage(next.page);
          setExhausted(next.exhausted);
        } catch {
          // Falha de empresas não vira erro de turismo nem apaga o carregado.
          // Mensagem fixa: o `caught.message` é cru e não vai ao usuário.
          setError('Não foi possível carregar mais empresas.');
        }
      }

      // Turismo: cada coleção com chip ativo e páginas restantes recebe a
      // própria requisição; sem requisição quando a coleção já esgotou.
      // Falha anexa erro de turismo sem tocar empresas nem itens carregados.
      let turismoFalhou = false;
      if (!loadingTurismo) {
        const geracaoTurismoDoFetch = geracaoTurismo.current;
        if (showSpots && spotsTemMais) {
          try {
            const pagina = await getTouristSpots({
              active: true,
              q: term,
              page: spotsPage + 1,
              pageSize: TURISMO_PAGE_SIZE,
            });
            if (resultadoObsoleto(geracaoTurismoDoFetch, geracaoTurismo.current)) return;
            setSpots((carregados) => [...carregados, ...pagina.items]);
            setSpotsTotal(pagina.total);
            setSpotsPage(spotsPage + 1);
          } catch {
            turismoFalhou = true;
          }
        }
        if (showEvents && eventsTemMais) {
          try {
            const pagina = await getEvents({
              active: true,
              q: term,
              page: eventsPage + 1,
              pageSize: TURISMO_PAGE_SIZE,
            });
            if (resultadoObsoleto(geracaoTurismoDoFetch, geracaoTurismo.current)) return;
            setEvents((carregados) => [...carregados, ...pagina.items]);
            setEventsTotal(pagina.total);
            setEventsPage(eventsPage + 1);
          } catch {
            turismoFalhou = true;
          }
        }
      }
      if (turismoFalhou) {
        setTurismoError('Não foi possível carregar atrações e eventos.');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    loadingTurismo,
    view,
    state,
    filters,
    fetcher,
    showSpots,
    showEvents,
    spotsTemMais,
    eventsTemMais,
    spotsPage,
    eventsPage,
    term,
  ]);

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

  const hoje = hojeISO();

  // Seções mescladas: empresas (vindas do deriveSearchView) + turismo.
  const rawSections = useMemo(
    () =>
      buildSearchSections({
        companies: view.items,
        spots,
        events,
        showSpots,
        showEvents,
        term,
      }),
    [view, spots, events, showSpots, showEvents, term],
  );

  // O SectionList espera `data`; `items` é o contrato do helper puro.
  const sections = useMemo<(SearchSection & { data: SearchItem[] })[]>(
    () => rawSections.map((section) => ({ ...section, data: section.items })),
    [rawSections],
  );

  const listaVazia = sections.length === 0 && !loading && !loadingTurismo && !error;
  const mensagemVazio = showSpots || showEvents
    ? 'Nada encontrado para os filtros selecionados.'
    : nearMeCity
    ? `Nenhuma empresa encontrada perto de ${nearMeCity}.`
    : openNowOnly
    ? 'Nenhuma empresa aberta agora.'
    : term
    ? `Nada encontrado para "${term}".`
    : 'Pesquise por empresas, produtos ou serviços da cidade.';

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
    setShowSpots(false);
    setShowEvents(false);
  };

  const retry = () => {
    setReloadToken((token) => token + 1);
  };

  /** Linha por item: empresa, atração ou evento (navegação tipada por kind). */
  function renderRow({ item }: { item: SearchItem }) {
    if (item.kind === 'company') {
      const { company } = item;
      return (
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
      );
    }

    if (item.kind === 'spot') {
      const { spot } = item;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Ver atração: ${spot.name}`}
          onPress={() =>
            router.push({ pathname: '/tourist-spot/[id]', params: { id: spot._id } })
          }
        >
          <View style={styles.rowIcon}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{spot.name}</Text>
            <Text style={styles.rowSubtitle}>
              {`${labelCategoriaAtracao(spot.category)}${spot.address ? ` — ${spot.address}` : ''}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }

    const { event } = item;
    const estado = classificarEvento(event.startDate, event.endDate, hoje);
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Ver evento: ${event.name}`}
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: event._id } })}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{event.name}</Text>
          <Text style={styles.rowSubtitle}>
            {`${BADGE_EVENTO[estado]} · ${formatarPeriodoEvento(event.startDate, event.endDate)}${
              event.location ? ` — ${event.location}` : ''
            }`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

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
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderRow}
            renderSectionHeader={({ section }) => (
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                <Text style={styles.groupCount}>
                  {section.key === 'empresas' && view.total > view.items.length
                    ? `${view.items.length} de ${view.total}`
                    : `${section.data.length}`}
                </Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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

                  <TouchableOpacity
                    style={[styles.categoryChip, showSpots && styles.categoryChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setShowSpots((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar por atrações"
                  >
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={showSpots ? colors.background : colors.primary}
                    />
                    <Text style={[styles.categoryChipText, showSpots && styles.categoryChipTextSelected]}>
                      Atrações
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryChip, showEvents && styles.categoryChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setShowEvents((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar por eventos"
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={showEvents ? colors.background : colors.primary}
                    />
                    <Text style={[styles.categoryChipText, showEvents && styles.categoryChipTextSelected]}>
                      Eventos
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

                {(nearMeCity || openNowOnly || showSpots || showEvents) && selectedCategories.length === 0 && (
                  <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
                    <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.clearAllText}>Limpar todos os filtros</Text>
                  </TouchableOpacity>
                )}
              </>
            }
            ListFooterComponent={
              <>
                {(view.hasMore || spotsTemMais || eventsTemMais) && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMore}
                    disabled={loadingMore}
                    accessibilityRole="button"
                    accessibilityLabel="Carregar mais resultados"
                  >
                    <Text style={styles.loadMoreText}>
                      {loadingMore ? 'Carregando…' : 'Carregar mais'}
                    </Text>
                  </TouchableOpacity>
                )}
                {listaVazia && <Text style={styles.emptyText}>{mensagemVazio}</Text>}
                {loadingTurismo && !loading && (
                  <Text style={styles.emptyText}>Carregando atrações e eventos…</Text>
                )}
                {turismoError && !loadingTurismo && (
                  <View style={styles.feedbackTurismo}>
                    <Text style={styles.emptyText}>{turismoError}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={retry}
                      accessibilityRole="button"
                      accessibilityLabel="Tentar carregar atrações e eventos novamente"
                    >
                      <Text style={styles.retryText}>Tentar novamente</Text>
                    </TouchableOpacity>
                  </View>
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
            ...Typography.h2,
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
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
      ...Typography.h5,
      paddingVertical: 0,
    },
    micButton: {
      padding: 4,
    },
    voiceError: {
      color: colors.error,
      ...Typography.caption,
    },
    errorBox: {
      gap: Spacing.two,
      alignItems: 'flex-start',
    },
    errorText: {
      color: colors.error,
      ...Typography.body,
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
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
            ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
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
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
    },
    groupCount: {
      color: colors.textSecondary,
            ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
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
    rowIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.chip,
      backgroundColor: colors.surfaceAlt,
    },
    rowTitle: {
      color: colors.text,
            ...Typography.h5,
    },
    rowSubtitle: {
      color: colors.textSecondary,
      ...Typography.body,
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
            ...Typography.h5,
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
            ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    emptyText: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',
      marginTop: Spacing.four,
    },
    feedbackTurismo: {
      alignItems: 'center',
      gap: Spacing.two,
      marginTop: Spacing.two,
      paddingBottom: Spacing.three,
    },
  });
}
