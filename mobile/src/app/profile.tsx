import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';

const MENU = [
  { id: '1', label: 'Meus dados', icon: 'person-outline' as const },
  { id: '2', label: 'Minha empresa', icon: 'business-outline' as const },
  { id: '3', label: 'Configurações', icon: 'settings-outline' as const },
  { id: '4', label: 'Sair', icon: 'log-out-outline' as const },
];

export default function ProfileScreen() {
  const handleMenuPress = (item: (typeof MENU)[0]) => {
    console.log('[PROFILE] menu item pressed:', item.label, item.id);
    if (item.id === '1') {
      console.log('[PROFILE] Tentando abrir tela/login - Meus dados');
      Alert.alert('Login', 'Funcionalidade de login em desenvolvimento.');
      return;
    }
    if (item.id === '4') {
      console.log('[PROFILE] Tentando sair');
      Alert.alert('Sair', 'Nenhum usuário logado.');
      return;
    }
    console.log('[PROFILE] Item não implementado:', item.label);
    Alert.alert(item.label, 'Em breve');
  };

  const handleLoginPress = () => {
    console.log('[PROFILE] Botão de login/visitante pressionado');
    Alert.alert('Login', 'Tela de autenticação em desenvolvimento. Ver logs.');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Perfil</Text>
        <TouchableOpacity style={styles.avatarBox} activeOpacity={0.7} onPress={handleLoginPress}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={GuiaColors.primary} />
          </View>
          <Text style={styles.userName}>Visitante</Text>
          <Text style={styles.userHint}>Faça login para salvar favoritos</Text>
        </TouchableOpacity>
        <View style={styles.menu}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item)}>
              <Ionicons name={item.icon} size={20} color={GuiaColors.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={GuiaColors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    color: GuiaColors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  avatarBox: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: GuiaColors.surface,
    borderWidth: 2,
    borderColor: GuiaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: GuiaColors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  userHint: {
    color: GuiaColors.textSecondary,
    fontSize: 13,
  },
  menu: {
    backgroundColor: GuiaColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GuiaColors.border,
  },
  menuLabel: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: 15,
  },
});
