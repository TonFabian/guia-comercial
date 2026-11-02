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
import { GuestBanner } from '@/features/auth/guest-banner';
import { AnnounceCta } from '@/features/home/announce-cta';
import { CategoryList } from '@/features/home/category-list';
import { FeaturedCompany } from '@/features/home/featured-company';
import { Header } from '@/features/home/header';
import { JobList } from '@/features/home/job-list';
import { PublicUtilitySection } from '@/features/home/public-utility-section';
import { SearchBar } from '@/features/home/search-bar';
import { useHomeData } from '@/features/home/use-home-data';

/** Cupons desativados a pedido do produto; flag mantém a seção reativável. */
const SHOW_COUPONS = false;

export default function HomeScreen() {
  const { loading, categories, featuredCompany, jobs, pharmacy, error } = useHomeData();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ]}
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
              <PublicUtilitySection pharmacy={pharmacy} />
              <JobList jobs={jobs} />
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
