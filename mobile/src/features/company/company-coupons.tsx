import { StyleSheet, Text, View } from 'react-native';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
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
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '800',
    },
    couponDescription: {
      color: colors.textSecondary,
      fontSize: Type.body,
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
      fontSize: Type.small,
    },
    code: {
      color: colors.primary,
      fontSize: Type.subtitle,
      fontWeight: '800',
      letterSpacing: 1,
    },
  });
}
