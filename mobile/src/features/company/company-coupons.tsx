import { StyleSheet, Text, View } from 'react-native';

import { Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Coupon } from '@/types/domain';

/** Cupons ativos da empresa. */
export function CompanyCoupons({ coupons }: { coupons: Coupon[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    coupon: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.iconBox,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    discountBox: {
      backgroundColor: Overlays.amberTag,
      borderRadius: Radius.chip,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    discountText: {
      color: colors.primary,
            ...Typography.caption,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
    },
    couponDescription: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    codeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: Radius.tag,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    codeLabel: {
      color: colors.textSecondary,
      ...Typography.caption,
    },
    code: {
      color: colors.primary,
            ...Typography.h5,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
      letterSpacing: 1,
    },
  });
}
