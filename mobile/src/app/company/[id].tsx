import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { CompanyAbout } from '@/features/company/company-about';
import { CompanyActionsBar } from '@/features/company/company-actions-bar';
import { CompanyCoupons } from '@/features/company/company-coupons';
import { CompanyHero } from '@/features/company/company-hero';
import { CompanyHours } from '@/features/company/company-hours';
import { CompanyProducts } from '@/features/company/company-products';
import { CompanyReviews } from '@/features/company/company-reviews';
import { CompanySection } from '@/features/company/company-section';
import { buildCompanyActions } from '@/features/company/company-actions';
import type { CompanyAction } from '@/features/company/company-actions';
import { useCompanyDetail } from '@/features/company/use-company-detail';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { callPhone, openAddress, openExternalUrl, openWhatsApp, shareCompany } from '@/utils/links';

export default function CompanyDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { company, coupons, loading } = useCompanyDetail(companyId);
  const { isFavorite, toggleFavorite } = useFavorites();
  const insets = useSafeAreaInsets();

  function handleAction(action: CompanyAction) {
    if (!company) return;

    switch (action.kind) {
      case 'whatsapp':
        if (action.value) void openWhatsApp(action.value);
        return;
      case 'call':
        if (action.value) void callPhone(action.value);
        return;
      case 'map':
        if (action.value) void openAddress(action.value);
        return;
      case 'website':
      case 'instagram':
      case 'facebook':
        if (action.value) void openExternalUrl(action.value, action.label);
        return;
      case 'share':
        void shareCompany(company);
        return;
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={GuiaColors.primary} size="large" />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Ionicons name="storefront-outline" size={44} color={GuiaColors.textSecondary} />
        <Text style={styles.notFoundTitle}>Empresa não encontrada</Text>
        <Text style={styles.notFoundText}>
          O link pode estar errado ou a empresa foi removida do guia.
        </Text>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const actions = buildCompanyActions(company);
  const favorite = isFavorite(company._id);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <CompanyHero company={company} />

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.topButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={GuiaColors.text} />
          </TouchableOpacity>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.topButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onPress={() => toggleFavorite(company)}>
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={favorite ? GuiaColors.primary : GuiaColors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar"
              onPress={() => void shareCompany(company)}>
              <Ionicons name="share-social-outline" size={20} color={GuiaColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <CompanyActionsBar actions={actions} onPress={handleAction} />

        <CompanySection title="Sobre" icon="information-circle-outline">
          <CompanyAbout
            description={company.description}
            services={company.services}
            address={company.address}
            city={company.city}
          />
        </CompanySection>

        {company.products && company.products.length > 0 && (
          <CompanySection title="Produtos e serviços" icon="pricetag-outline">
            <CompanyProducts products={company.products} />
          </CompanySection>
        )}

        {company.openingHours && company.openingHours.length > 0 && (
          <CompanySection title="Horário de funcionamento" icon="time-outline">
            <CompanyHours openingHours={company.openingHours} />
          </CompanySection>
        )}

        {coupons.length > 0 && (
          <CompanySection title="Cupons" icon="ticket-outline">
            <CompanyCoupons coupons={coupons} />
          </CompanySection>
        )}

        <CompanySection title="Avaliações" icon="star-outline">
          <CompanyReviews rating={company.rating} ratingCount={company.ratingCount} />
        </CompanySection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  content: {
    paddingBottom: Spacing.five,
  },
  center: {
    flex: 1,
    backgroundColor: GuiaColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: Spacing.four,
  },
  notFoundTitle: {
    color: GuiaColors.text,
    fontSize: Type.title,
    fontWeight: '700',
  },
  notFoundText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.two,
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
  },
  backButtonText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Overlays.blackSoft,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
