import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Type } from '@/constants/theme';
import { GuestBanner } from '@/features/auth/guest-banner';
import { AnnounceCta } from '@/features/home/announce-cta';
import { AutonomousProfessionals } from '@/features/home/autonomous-professionals';
import { BannerCarousel } from '@/features/home/banner-carousel';
import { CategoryList } from '@/features/home/category-list';
import { FeaturedCompany } from '@/features/home/featured-company';
import { Header } from '@/features/home/header';
import { JobList } from '@/features/home/job-list';
import { NoticesCarousel } from '@/features/home/notices-carousel';
import { OtherCompanies } from '@/features/home/other-companies';
import { PublicUtilities } from '@/features/home/public-utilities';
import { SearchBar } from '@/features/home/search-bar';
import { SectionHeader } from '@/features/home/section-header';
import { useHomeData } from '@/features/home/use-home-data';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getAutonomousProfessionals, getCities, getCompanies, getNotices } from '@/services/api';
import type { AutonomousProfessional, Company, Notice } from '@/types/domain';

/** Cupons desativados a pedido do produto; flag mantém a seção reativável. */
const SHOW_COUPONS = false;

export default function HomeScreen() {
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [cities, setCities] = useState<{ _id: string; name: string; slug: string }[]>([]);
  const selectedCityName = useMemo(
    () => cities.find((c) => c.slug === selectedCity)?.name,
    [cities, selectedCity],
  );
  const { loading, categories, banners, featuredCompany, jobs, error } = useHomeData(selectedCity);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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
  }, []);

  const [professionals, setProfessionals] = useState<AutonomousProfessional[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [otherCompanies, setOtherCompanies] = useState<Company[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pros, nts, page] = await Promise.all([
          getAutonomousProfessionals(),
          getNotices(),
          getCompanies(1, 50),
        ]);
        if (!cancelled) {
          setProfessionals(pros);
          setNotices(nts);
          setOtherCompanies(page.items.filter((c) => !c.isFeatured));
        }
      } catch {
        // ignora
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Se houve erro de auth (401), já o useHomeData redirecionou.
  // Se ainda estiver com erro (ex.: fallback), mostramos mensagem.
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Tentar novamente" onPress={() => window.location.reload()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
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
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <CategoryList categories={categories} />
              <FeaturedCompany company={featuredCompany} />
              <OtherCompanies companies={otherCompanies} />
              {banners.length > 0 ? (
                <>
                  <SectionHeader title="Promoções da Semana" />
                  <BannerCarousel banners={banners} />
                </>
              ) : null}
              <PublicUtilities />
              <JobList jobs={jobs} />
              <AutonomousProfessionals professionals={professionals} />
              <NoticesCarousel notices={notices} />
              <AnnounceCta />
            </View>
          )}
        </ScrollView>
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
      fontSize: Type.base,
      fontWeight: '600',
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
      fontSize: Type.small,
      fontWeight: '600',
    },
    cityChipTextActive: {
      color: colors.background,
    },
    center: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.surface,
    },
    errorText: {
      fontSize: 18,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
