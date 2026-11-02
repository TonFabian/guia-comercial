import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { CompanyProduct } from '@/types/domain';

import { formatPrice } from './format';

/** Lista de produtos e serviços com preço. */
export function CompanyProducts({ products }: { products: CompanyProduct[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <>
      {products.map((product) => (
        <View key={product.name} style={styles.product}>
          <View style={styles.productBody}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.description && (
              <Text style={styles.productDescription}>{product.description}</Text>
            )}
          </View>
          {product.price !== undefined && (
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
          )}
        </View>
      ))}
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    product: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    productBody: {
      flex: 1,
      gap: 2,
    },
    productName: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
    productDescription: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    price: {
      color: colors.primary,
      fontSize: Type.subtitle,
      fontWeight: '700',
    },
  });
}
