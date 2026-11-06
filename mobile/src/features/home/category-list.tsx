import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Category } from '@/types/domain';

function openCategory(category: Category) {
  router.push(`/search?category=${encodeURIComponent(category.slug)}`);
}

const CategoryChip = memo(function CategoryChip({ category }: { category: Category }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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
        color={colors.primary}
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
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
      backgroundColor: colors.surface,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipPressed: {
      backgroundColor: Overlays.amberTag,
      borderColor: colors.primary,
    },
    label: {
      color: colors.text,
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
  });
}