import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { PaginationDots } from '@/components/PaginationDots';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { companyPlan, sortCompaniesByPlan } from '@/features/company/company-plan';
import { PlanBadge } from '@/features/company/plan-badge';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { pageIndexFromOffset } from '@/utils/carousel-page';
import { openWhatsApp } from '@/utils/links';
import { paginateOtherCompanies } from './other-companies-view';
import type { OtherCompaniesPage } from './other-companies-view';
import { SectionHeader } from './section-header';

const OtherCompanyCard = memo(function OtherCompanyCard({ company }: { company: Company }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const contato = company.whatsapp ?? company.phone;
  const plano = companyPlan(company);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Empresa ${company.name}, ${categoryLabel(company.category)}`}
        onPress={() => router.push({ pathname: '/company/[id]', params: { id: company._id } })}
      >
        <View style={styles.thumb}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {company.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {categoryLabel(company.category)}
              {company.address ? ` · ${company.address}` : ''}
            </Text>
            {plano !== 'free' ? <PlanBadge plan={plano} /> : null}
          </View>
        </View>
      </TouchableOpacity>
      {contato ? (
        <TouchableOpacity
          style={styles.whatsappBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`WhatsApp ${company.name}`}
          onPress={() => {
            if (contato) void openWhatsApp(contato);
          }}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.background} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const OtherCompaniesPageItem = memo(function OtherCompaniesPageItem({
  page,
  pageWidth,
}: {
  page: OtherCompaniesPage;
  pageWidth: number;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.page, { width: pageWidth }]}>
      {page.companies.map((company) => (
        <OtherCompanyCard key={company._id} company={company} />
      ))}
    </View>
  );
});

const pageKey = (page: OtherCompaniesPage) => page.id;

interface Props {
  companies: Company[];
  loading?: boolean;
  error?: string | null;
}

export function OtherCompanies({ companies, loading = false, error = null }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);

  const pages = useMemo(
    () => paginateOtherCompanies(sortCompaniesByPlan(companies)),
    [companies],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      setActiveIndex(
        pageIndexFromOffset(
          contentOffset.x,
          pageWidth,
          pages.length,
          contentSize.width - layoutMeasurement.width,
        ),
      );
    },
    [pageWidth, pages.length],
  );

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<OtherCompaniesPage>) => (
      <OtherCompaniesPageItem page={item} pageWidth={pageWidth} />
    ),
    [pageWidth],
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Outras Empresas & Serviços Locais"
        actionLabel="Ver todas"
        onAction={() => router.push('/search')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : pages.length === 0 ? (
        <Text style={styles.empty}>Nenhuma empresa cadastrada</Text>
      ) : (
        <>
          <FlatList
            horizontal
            data={pages}
            keyExtractor={pageKey}
            renderItem={renderPage}
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            decelerationRate="fast"
            style={styles.carousel}
            testID="other-companies-carousel"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
          <PaginationDots total={pages.length} activeIndex={activeIndex} />
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: Spacing.four },
    carousel: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    page: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.three,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      padding: Spacing.three,
    },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: Radius.iconBox,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: Spacing.half },
    name: { color: colors.text, ...Typography.h5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
    meta: { flex: 1, color: colors.textSecondary, ...Typography.body },
    whatsappBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      backgroundColor: colors.whatsapp,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.three,
    },
    center: { paddingVertical: Spacing.three, alignItems: 'center' },
    empty: {
      color: colors.textSecondary,
      ...Typography.caption,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
  });
}
