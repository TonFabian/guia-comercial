import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { getAutonomousProfessionals, getCompanies, getNotices } from '@/services/api';
import { GuestBanner } from '@/features/auth/guest-banner';
import type { AutonomousProfessional, Company, Notice } from '@/types/domain';
import { AutonomousProfessionals } from '@/features/home/autonomous-professionals';
import { NoticesCarousel } from '@/features/home/notices-carousel';
import { OtherCompanies } from '@/features/home/other-companies';
import { AnnounceCta } from '@/features/home/announce-cta';
import { BannerCarousel } from '@/features/home/banner-carousel';
import { CategoryList } from '@/features/home/category-list';
import { FeaturedCompany } from '@/features/home/featured-company';
import { Header } from '@/features/home/header';
import { JobList } from '@/features/home/job-list';
import { PublicUtilities } from '@/features/home/public-utilities';
import { SearchBar } from '@/features/home/search-bar';
import { SectionHeader } from '@/features/home/section-header';
import { useHomeData } from '@/features/home/use-home-data';

/** Cupons desativados a pedido do produto; flag mantém a seção reativável. */
const SHOW_COUPONS = false;

export default function HomeScreen() {
  const { loading, categories, banners, featuredCompany, jobs, error } = useHomeData();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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
          <Header />
          <SearchBar />
          <GuestBanner />
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
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
            </>
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
