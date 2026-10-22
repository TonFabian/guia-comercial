import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';
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
  const { loading, banners, categories, coupons, featuredCompany, jobs, pharmacy } = useHomeData();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
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
});
