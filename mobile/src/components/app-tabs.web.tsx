import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View
          style={{
            ...styles.tabBar,
            paddingBottom: Math.max(insets.bottom, 10),
          }}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton label="Início" icon="home" />
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton label="Buscar" icon="search" />
          </TabTrigger>
          <TabTrigger name="favorites" href="/favorites" asChild>
            <TabButton label="Favoritos" icon="heart" />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton label="Perfil" icon="person" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: 'home' | 'search' | 'heart' | 'person';
};

export function TabButton({ children: _children, label, icon, isFocused, ref: _ref, style, ...props }: TabButtonProps) {
  const color = isFocused ? GuiaColors.primary : GuiaColors.textSecondary;

  return (
    <Pressable
      {...props}
      style={StyleSheet.flatten([
        styles.tabButton,
        (style ?? undefined) as StyleProp<ViewStyle>,
      ])}>
      <Ionicons name={isFocused ? icon : `${icon}-outline`} size={22} color={color} />
      <Text style={StyleSheet.flatten([styles.tabLabel, { color }])}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: GuiaColors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GuiaColors.border,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
