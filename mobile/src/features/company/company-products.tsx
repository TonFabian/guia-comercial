import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { CompanyProduct } from '@/types/domain';

import { openWhatsApp } from '@/utils/links';
import { formatPrice } from './format';

/** Lista de produtos e serviços com preço e botão "Pedir no WhatsApp". */
export function CompanyProducts({
  products,
  whatsapp,
}: {
  products: CompanyProduct[];
  whatsapp?: string;
}) {
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
          {whatsapp ? (
            <Pressable
              style={styles.orderButton}
              onPress={() => void openWhatsApp(whatsapp, `Olá, tenho interesse em ${product.name}`)}
              accessibilityRole="button"
              accessibilityLabel={`Pedir ${product.name} no WhatsApp`}>
              <Text style={styles.orderButtonText}>Pedir</Text>
            </Pressable>
          ) : null}
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
            ...Typography.h5,
    },
    productDescription: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    price: {
      color: colors.primary,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    orderButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: Spacing.two,
    },
    orderButtonText: {
      color: colors.background,
      ...Typography.captionSemibold,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
