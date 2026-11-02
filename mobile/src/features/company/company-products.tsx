import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Spacing, Type } from '@/constants/theme';
import type { CompanyProduct } from '@/types/domain';

import { formatPrice } from './format';

/** Lista de produtos e serviços com preço. */
export function CompanyProducts({ products }: { products: CompanyProduct[] }) {
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

const styles = StyleSheet.create({
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GuiaColors.border,
  },
  productBody: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '600',
  },
  productDescription: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  price: {
    color: GuiaColors.primary,
    fontSize: Type.subtitle,
    fontWeight: '700',
  },
});
