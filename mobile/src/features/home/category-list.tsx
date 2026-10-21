import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Type } from '@/constants/theme';
import type { Category } from '@/types/domain';

export function CategoryList({ categories }: { categories: Category[] }) {
  function openCategory(category: Category) {
    router.push(`/search?category=${encodeURIComponent(category.slug)}`);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContent}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category._id}
          style={styles.categoryItem}
          activeOpacity={0.7}
          onPress={() => openCategory(category)}>
          <View style={styles.categoryIconBox}>
            <MaterialCommunityIcons
              name={(category.icon ?? 'dots-horizontal-circle') as React.ComponentProps<
                typeof MaterialCommunityIcons
              >['name']}
              size={26}
              color={GuiaColors.primary}
            />
          </View>
          <Text style={styles.categoryLabel}>{category.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 24,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
    gap: 8,
  },
  categoryIconBox: {
    width: 58,
    height: 58,
    borderRadius: Radius.iconBox,
    backgroundColor: GuiaColors.surface,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    textAlign: 'center',
  },
});
