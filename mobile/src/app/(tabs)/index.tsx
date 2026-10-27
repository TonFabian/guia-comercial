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

import { GuiaColors } from '@/constants/theme';
import { GuestBanner } from '@/features/auth/guest-banner';
import { AnnounceCta } from '@/features/home/announce-cta';
import { BannerCarousel } from '@/features/home/banner-carousel';
import { CategoryList } from '@/features/home/category-list';
import { CouponList } from '@/features/home/coupon-list';
import { FeaturedCompany } from '@/features/home/featured-company';
import { Header } from '@/features/home/header';
import { JobList } from '@/features/home/job-list';
import { PharmacyOnDuty } from '@/features/home/pharmacy-on-duty';
import { SearchBar } from '@/features/home/search-bar';
import { useHomeData } from '@/features/home/use-home-data';

export default function HomeScreen() {
  const { loading, banners, categories, coupons, featuredCompany, jobs, pharmacy, error } =
    useHomeData();
  const insets = useSafeAreaInsets();

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
          <GuestBanner />
          <SearchBar />
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={GuiaColors.primary} />
            </View>
          ) : (
            <>
              <CategoryList categories={categories} />
              <BannerCarousel banners={banners} />
              <PharmacyOnDuty pharmacy={pharmacy} />
              <FeaturedCompany company={featuredCompany} />
              <CouponList coupons={coupons} />
              <JobList jobs={jobs} />
              <AnnounceCta />
            </>
          )}
        </ScrollView>
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
    backgroundColor: GuiaColors.surface,
  },
  errorText: {
    fontSize: 18,
    color: GuiaColors.error,
    textAlign: 'center',
  },
});
