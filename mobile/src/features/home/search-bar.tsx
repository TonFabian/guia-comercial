import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function SearchBar() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => setQuery('');
    }, []),
  );

  function submit(term?: string) {
    const value = (term ?? query).trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function handleMic() {
    if (Platform.OS !== 'web') {
      // Busca por voz disponível apenas na web por enquanto.
      return;
    }
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      return;
    }
    if (listening) return;
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setQuery(transcript);
        submit(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <View style={styles.searchBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Empresa, produto ou serviço"
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => submit()}
        returnKeyType="search"
        blurOnSubmit
      />
      <TouchableOpacity style={styles.micButton} activeOpacity={0.7} onPress={handleMic}>
        <Ionicons name={listening ? 'mic' : 'mic-outline'} size={20} color={listening ? colors.primary : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.searchButton} activeOpacity={0.8} onPress={() => submit()}>
        <Ionicons name="search" size={18} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: colors.surface,
      borderRadius: Radius.search,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 16,
      paddingRight: 6,
      height: 52,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}