import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import type { Category } from '@/types/domain';

function openCategory(category: Category) {
  router.push(`/search?category=${encodeURIComponent(category.slug)}`);
}

const CategoryChip = memo(function CategoryChip({ category }: { category: Category }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={() => openCategory(category)}
      accessibilityRole="button"
      accessibilityLabel={`Filtrar por ${category.name}`}>
      <MaterialCommunityIcons
        name={(category.icon ?? 'dots-horizontal-circle') as React.ComponentProps<
          typeof MaterialCommunityIcons
        >['name']}
        size={16}
        color={GuiaColors.primary}
      />
      <Text style={styles.label}>{category.name}</Text>
    </Pressable>
  );
});

function categoryKey(category: Category) {
  return category._id;
}

const renderCategory = ({ item }: ListRenderItemInfo<Category>) => (
  <CategoryChip category={item} />
);

export function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={categoryKey}
      renderItem={renderCategory}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContent}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: Spacing.four,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipPressed: {
    backgroundColor: Overlays.amberTag,
    borderColor: GuiaColors.primary,
  },
  label: {
    color: GuiaColors.text,
    fontSize: Type.body,
    fontWeight: '600',
  },
});
