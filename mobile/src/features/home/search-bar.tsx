import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Type } from '@/constants/theme';

export function SearchBar() {
  const [query, setQuery] = useState('');

  function submit() {
    const term = query.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <View style={styles.searchBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Empresa, produto ou serviço"
        placeholderTextColor={GuiaColors.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submit}
        returnKeyType="search"
        blurOnSubmit
      />
      <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
        <Ionicons name="mic-outline" size={20} color={GuiaColors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.searchButton} activeOpacity={0.8} onPress={submit}>
        <Ionicons name="search" size={18} color={GuiaColors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.search,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingLeft: 16,
    paddingRight: 6,
    height: 52,
  },
  searchInput: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    paddingVertical: 0,
  },
  micButton: {
    padding: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: GuiaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
