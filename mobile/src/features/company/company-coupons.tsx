import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import type { Coupon } from '@/types/domain';

/** Cupons ativos da empresa. */
export function CompanyCoupons({ coupons }: { coupons: Coupon[] }) {
  return (
    <>
      {coupons.map((coupon) => (
        <View key={coupon._id} style={styles.coupon}>
          <View style={styles.couponHeader}>
            <Text style={styles.couponTitle}>{coupon.title}</Text>
            {coupon.discount && (
              <View style={styles.discountBox}>
                <Text style={styles.discountText}>{coupon.discount}</Text>
              </View>
            )}
          </View>
          {coupon.description && (
            <Text style={styles.couponDescription}>{coupon.description}</Text>
          )}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Cupom</Text>
            <Text style={styles.code}>{coupon.code}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  coupon: {
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.iconBox,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: Spacing.three,
    gap: 6,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  couponTitle: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '700',
  },
  discountBox: {
    backgroundColor: Overlays.amberTag,
    borderRadius: Radius.chip,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  discountText: {
    color: GuiaColors.primary,
    fontSize: Type.small,
    fontWeight: '800',
  },
  couponDescription: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GuiaColors.background,
    borderRadius: Radius.tag,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  codeLabel: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
  code: {
    color: GuiaColors.primary,
    fontSize: Type.subtitle,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
