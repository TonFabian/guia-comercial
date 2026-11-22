import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { PaginationDots } from '@/components/PaginationDots';
import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
import { PlanBadge } from '@/features/company/plan-badge';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { cityName } from '@/utils/city';
import { useCarouselPagination } from '@/hooks/use-carousel-pagination';
import { callPhone, openAddress, openWhatsApp } from '@/utils/links';
import { openCompanyDetails } from '../company/open-company';
import { SectionHeader } from './section-header';

const CARD_WIDTH = 360;

const FeaturedCompanyCard = memo(function FeaturedCompanyCard({ company }: { company: Company }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.companyCard}>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${company.name}`}
        onPress={() => openCompanyDetails(company._id)}
      >
        <View style={styles.companyCover}>
          <MaterialCommunityIcons name="office-building" size={48} color={Overlays.whiteSoft} />
          <View style={styles.highlightTag}>
            <Text style={styles.highlightTagText}>Destaque</Text>
          </View>
        </View>
        <View style={styles.companyBody}>
          <Text style={styles.companyName}>{company.name}</Text>
          <View style={styles.categoryRow}>
            <Text style={styles.companyCategory}>{categoryLabel(company.category)}</Text>
            <PlanBadge plan={company.plan} />
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.companyAddress}>{company.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.companyActions}>
        <TouchableOpacity
          style={styles.whatsappPill}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() => company.whatsapp && void openWhatsApp(company.whatsapp)}
          disabled={!company.whatsapp}
          accessibilityLabel={!company.whatsapp ? 'WhatsApp não disponível' : 'Abrir WhatsApp'}
        >
          <MaterialCommunityIcons name="whatsapp" size={16} color={colors.background} />
          <Text style={styles.whatsappPillText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() => company.phone && void callPhone(company.phone)}
          disabled={!company.phone}
          accessibilityLabel={!company.phone ? 'Telefone não disponível' : 'Ligar'}
        >
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={styles.actionPillText}>Ligar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() =>
            company.address && void openAddress(company.address, cityName(company.city))
          }
          disabled={!company.address}
          accessibilityLabel={!company.address ? 'Endereço não disponível' : 'Abrir endereço'}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.actionPillText}>Endereço</Text>
        </TouchableOpacity>
      </View>
      {!company.phone && !company.address && !company.whatsapp ? <ContactHintRow /> : null}
    </View>
  );
});

const renderFeaturedCompany = ({ item }: ListRenderItemInfo<Company>) => (
  <FeaturedCompanyCard company={item} />
);

const featuredCompanyKey = (company: Company) => company._id;

export function FeaturedCompanies({ companies }: { companies: Company[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeIndex, handleScroll, snapToInterval } = useCarouselPagination(
    companies.length,
    CARD_WIDTH,
    Spacing.two,
  );

  if (companies.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" />
      <FlatList
        horizontal
        data={companies}
        keyExtractor={featuredCompanyKey}
        renderItem={renderFeaturedCompany}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={snapToInterval}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      <PaginationDots total={companies.length} activeIndex={activeIndex} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    carouselContent: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.two,
    },
    companyCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    companyCover: {
      height: 120,
      backgroundColor: colors.coverPlaceholder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightTag: {
      position: 'absolute',
      top: Spacing.three,
      left: Spacing.three,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.two,
    },
    highlightTagText: {
      color: colors.background,
      ...Typography.caption,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
    },
    companyBody: {
      padding: Spacing.three,
      gap: Spacing.one,
    },
    companyName: {
      color: colors.text,
      ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    companyCategory: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
      marginTop: Spacing.half,
    },
    companyAddress: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    companyActions: {
      flexDirection: 'row',
      gap: Spacing.one,
      marginTop: Spacing.three,
      marginBottom: Spacing.three,
      marginHorizontal: Spacing.two,
    },
    actionPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.one,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    actionPillText: {
      color: colors.primary,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    whatsappPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.one,
      backgroundColor: colors.whatsapp,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    whatsappPillText: {
      color: colors.background,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
