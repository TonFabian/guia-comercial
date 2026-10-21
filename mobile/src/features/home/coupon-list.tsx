import { SectionHeader } from './section-header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CardColors, GuiaColors, Overlays, Radius, Type } from '@/constants/theme';
import type { DisplayCoupon } from '@/data/mock';
import { companyLabel } from '@/types/domain';

export function CouponList({ coupons }: { coupons: DisplayCoupon[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Cupons e Descontos" icon="pricetag" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}>
        {coupons.map((coupon) => (
          <TouchableOpacity
            key={coupon._id}
            style={StyleSheet.flatten([
              styles.couponCard,
              { backgroundColor: coupon.color ?? CardColors.couponDefault },
            ])}
            activeOpacity={0.85}
            onPress={() => showCouponCode(coupon)}>
            <View style={styles.couponTag}>
              <Text style={styles.couponTagText}>Cupom Exclusivo</Text>
            </View>
            <Text style={styles.couponTitle}>{coupon.title}</Text>
            <Text style={styles.couponBusiness}>{companyLabel(coupon.company)}</Text>
            <View style={styles.couponFooter}>
              <Ionicons name="copy-outline" size={14} color={GuiaColors.primary} />
              <Text style={styles.couponFooterText}>Copiar cupom</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function showCouponCode(coupon: DisplayCoupon) {
  Alert.alert('Cupom Exclusivo', `Use o código ${coupon.code} em ${companyLabel(coupon.company)}.`);
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
    padding: 16,
    justifyContent: 'space-between',
    gap: 8,
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
    gap: 6,
    marginTop: 4,
  },
  couponFooterText: {
    color: GuiaColors.primary,
    fontSize: Type.body,
    fontWeight: '600',
  },
});
