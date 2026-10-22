import { SectionHeader } from './section-header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CardShadow, CardColors, GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import type { DisplayCoupon } from '@/data/mock';
import { openCompanyDetails } from '@/features/company/open-company';
import { companyId, companyLabel } from '@/types/domain';

export function CouponList({ coupons }: { coupons: DisplayCoupon[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(id: string) {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Cupons e Descontos" icon="pricetag" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}>
        {coupons.map((coupon) => {
          const targetId = companyId(coupon.company);
          return (
            <View
              key={coupon._id}
              style={StyleSheet.flatten([
                styles.couponCard,
                { backgroundColor: coupon.color ?? CardColors.couponDefault },
              ])}>
              <TouchableOpacity
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Ver empresa do cupom ${coupon.title}`}
                disabled={!targetId}
                onPress={() => targetId && openCompanyDetails(targetId)}>
                <View style={styles.couponTag}>
                  <Text style={styles.couponTagText}>Cupom Exclusivo</Text>
                </View>
                <Text style={styles.couponTitle}>{coupon.title}</Text>
                <Text style={styles.couponBusiness}>{companyLabel(coupon.company)}</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.couponFooter}
                onPress={() => handleCopy(coupon._id)}
                hitSlop={6}
                android_ripple={{ color: Overlays.amberTag }}>
                <Ionicons name="copy-outline" size={14} color={GuiaColors.primary} />
                <Text style={styles.couponFooterText}>
                  {copiedId === coupon._id ? 'Copiado! ✓' : 'Copiar cupom'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  couponCard: {
    width: 200,
    minHeight: 150,
    borderRadius: Radius.card,
    padding: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginRight: 12,
    ...CardShadow,
  },
  couponTag: {
    alignSelf: 'flex-start',
    backgroundColor: Overlays.amberTag,
    borderRadius: Radius.tag,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  couponTagText: {
    color: GuiaColors.primary,
    fontSize: Type.caption,
    fontWeight: '700',
  },
  couponTitle: {
    color: GuiaColors.text,
    fontSize: Type.cardTitle,
    fontWeight: '800',
    marginTop: 4,
  },
  couponBusiness: {
    color: Overlays.whiteFaint,
    fontSize: Type.body,
  },
  couponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  couponFooterText: {
    color: GuiaColors.primary,
    fontSize: Type.body,
    fontWeight: '600',
  },
});
