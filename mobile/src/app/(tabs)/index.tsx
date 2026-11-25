import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Typography } from '@/constants/theme';
import { GuestBanner } from '@/features/auth/guest-banner';
import { AnnounceCta } from '@/features/home/announce-cta';
import { BannerCarousel } from '@/features/home/banner-carousel';
import { CategoryList } from '@/features/home/category-list';
import { FeaturedCompanies } from '@/features/home/featured-companies';
import { Header } from '@/features/home/header';
import { JobList } from '@/features/home/job-list';
import { NoticesCarousel } from '@/features/home/notices-carousel';
import { OtherCompanies } from '@/features/home/other-companies';
import { PublicUtilities } from '@/features/home/public-utilities';
import { SearchBar } from '@/features/home/search-bar';
import { SectionHeader } from '@/features/home/section-header';
import { TourismSection } from '@/features/home/tourism-section';
import { useHomeData } from '@/features/home/use-home-data';
import { useReloadOnAppActive } from '@/hooks/use-app-active-reload';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getCities, getCompanies, getNotices, getPublicUtilities } from '@/services/api';
import type { Company, Notice, PublicUtility } from '@/types/domain';

export default function HomeScreen() {
  const [retryKey, setRetryKey] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [cities, setCities] = useState<{ _id: string; name: string; slug: string }[]>([]);
  const selectedCityName = useMemo(
    () => cities.find((c) => c.slug === selectedCity)?.name,
    [cities, selectedCity],
  );
  const { loading, categories, banners, featuredCompanies, jobs, error } = useHomeData(selectedCity, retryKey);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  // Recarrega ao voltar para a Home (foco da rota): uma alteração de plano
  // feita no painel admin precisa aparecer sem exigir que o usuário feche e
  // abra o app. Ignora a primeira focalização (mount inicial).
  const primeiraFocagem = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiraFocagem.current) {
        primeiraFocagem.current = false;
        return;
      }
      setRetryKey((key) => key + 1);
    }, []),
  );

  // Complementa o foco da rota: quando o app volta do segundo plano com a
  // Home já ativa, useFocusEffect não dispara, então recarregamos aqui.
  // Não dispara no mount inicial (evita fetch duplicado).
  useReloadOnAppActive(() => setRetryKey((key) => key + 1));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCities();
        if (!cancelled) {
          setCities(list);
          if (list.length === 1) setSelectedCity(list[0].slug);
        }
      } catch {
        // ignora
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [otherCompanies, setOtherCompanies] = useState<Company[]>([]);
  const [utilities, setUtilities] = useState<PublicUtility[]>([]);

  const [noticesLoading, setNoticesLoading] = useState(true);
  const [otherCompaniesLoading, setOtherCompaniesLoading] = useState(true);
  const [utilitiesLoading, setUtilitiesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [otherCompaniesError, setOtherCompaniesError] = useState<string | null>(null);
  const [utilitiesError, setUtilitiesError] = useState<string | null>(null);
  const [utilitiesToken, setUtilitiesToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUtilitiesLoading(true);
      setUtilitiesError(null);
      try {
        const list = await getPublicUtilities();
        if (!cancelled) setUtilities(list);
      } catch (error) {
        if (!cancelled) {
          setUtilities([]);
          setUtilitiesError(
            error instanceof Error ? error.message : 'Erro ao carregar os telefones úteis',
          );
        }
      } finally {
        if (!cancelled) setUtilitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [utilitiesToken, retryKey]);

  const reloadUtilities = useCallback(() => {
    setUtilitiesToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNoticesLoading(true);
      setOtherCompaniesLoading(true);
      setNoticesError(null);
      setOtherCompaniesError(null);
      try {
        const [nts, page] = await Promise.all([
          getNotices(),
          getCompanies(1, 50, selectedCity, ['basic', 'free']),
        ]);
        if (!cancelled) {
          setNotices(nts);
          setOtherCompanies(page.items);
        }
      } catch (e) {
        if (!cancelled) {
          setNoticesError(e instanceof Error ? e.message : 'Erro ao carregar avisos');
          setOtherCompaniesError(e instanceof Error ? e.message : 'Erro ao carregar empresas');
        }
      } finally {
        if (!cancelled) {
          setNoticesLoading(false);
          setOtherCompaniesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey, selectedCity]);

  // Se houve erro de auth (401), já o useHomeData redirecionou.
  // Se ainda estiver com erro (ex.: fallback), mostramos mensagem.
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setRetryKey((k) => k + 1)}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          scrollEnabled={!loading}
          style={styles.scrollView}
          contentContainerStyle={StyleSheet.flatten([
            styles.scrollContent,
            { paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ])}
          showsVerticalScrollIndicator={false}
        >
          <Header city={selectedCityName} />
          {cities.length > 1 && (
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.cityLabel}>Cidade:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <TouchableOpacity
                  style={[styles.cityChip, !selectedCity && styles.cityChipActive]}
                  onPress={() => setSelectedCity(undefined)}
                >
                  <Text style={[styles.cityChipText, !selectedCity && styles.cityChipTextActive]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                {cities.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.cityChip, selectedCity === c.slug && styles.cityChipActive]}
                    onPress={() => setSelectedCity(c.slug)}
                  >
                    <Text
                      style={[
                        styles.cityChipText,
                        selectedCity === c.slug && styles.cityChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <SearchBar />
          <GuestBanner />
          <View style={{ flex: 1 }}>
            <CategoryList categories={categories} />
            <FeaturedCompanies companies={featuredCompanies} />
            <PublicUtilities
              utilities={utilities}
              loading={utilitiesLoading}
              error={utilitiesError}
              onRetry={reloadUtilities}
            />
            <OtherCompanies
              companies={otherCompanies}
              loading={otherCompaniesLoading}
              error={otherCompaniesError}
            />
            <NoticesCarousel notices={notices} loading={noticesLoading} error={noticesError} />
            <JobList jobs={jobs} />
            <TourismSection city={selectedCity} />
            {banners.length > 0 ? (
              <>
                <SectionHeader title="Promoções da Semana" />
                <BannerCarousel banners={banners} />
              </>
            ) : null}
            <AnnounceCta />
          </View>
          {loading && <LoadingSkeleton colors={colors} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


function LoadingSkeleton({ colors }: { colors: ReturnType<typeof useThemeColors> }) {
  const [opacity] = useState(() => new Animated.Value(0.35));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const box = (key: string, style: object) => (
    <Animated.View
      key={key}
      style={[{ borderRadius: 10, backgroundColor: colors.surface, opacity }, style]}
    />
  );

  const utilityCard = (key: string) =>
    box(key, {
      flex: 1,
      height: 148,
      borderRadius: 16,
      padding: 14,
      justifyContent: 'space-between',
    });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        paddingTop: 16,
        paddingHorizontal: 16,
        zIndex: 999,
      }}
    >
      {/* Topo: localização + sino */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {box('location', { height: 20, width: 140 })}
        {box('bell', { height: 26, width: 26, borderRadius: 13 })}
      </View>

      {/* Título */}
      {box('title-1', { height: 22, width: '90%', marginBottom: 8 })}
      {box('title-2', { height: 22, width: '65%', marginBottom: 20 })}

      {/* Chips de cidade */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {box('chip-label', { height: 18, width: 60 })}
        {box('chip-1', { height: 34, width: 80, borderRadius: 17 })}
        {box('chip-2', { height: 34, width: 120, borderRadius: 17 })}
        {box('chip-3', { height: 34, width: 90, borderRadius: 17 })}
      </View>

      {/* Barra de busca */}
      {box('search', { height: 52, borderRadius: 26, marginBottom: 20 })}

      {/* Chips de categoria */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        {box('cat-1', { height: 40, width: 120, borderRadius: 20 })}
        {box('cat-2', { height: 40, width: 120, borderRadius: 20 })}
        {box('cat-3', { height: 40, width: 100, borderRadius: 20 })}
      </View>

      {/* Título de seção */}
      {box('section-1', { height: 20, width: 220, marginBottom: 14 })}

      {/* Grid de telefones úteis (2 x 2) */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        {utilityCard('util-1')}
        {utilityCard('util-2')}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {utilityCard('util-3')}
        {utilityCard('util-4')}
      </View>

      {/* Título de seção */}
      {box('section-2', { height: 20, width: 260, marginBottom: 14 })}

      {/* Card de empresa */}
      {box('company', { height: 84, borderRadius: 16 })}
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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 110,
    },
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    cityLabel: {
      color: colors.textSecondary,
      ...Typography.bodySemibold,
    },
    cityChip: {
      backgroundColor: colors.surface,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    cityChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    cityChipText: {
      color: colors.textSecondary,
      ...Typography.captionSemibold,
    },
    cityChipTextActive: {
      color: colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.surface,
    },
    errorText: {
      ...Typography.h3,
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    retryButtonText: {
      color: colors.background,
      ...Typography.bodySemibold,
    },
  });
}
