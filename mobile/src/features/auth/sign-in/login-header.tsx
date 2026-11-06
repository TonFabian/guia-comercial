import { Image, StyleSheet, Text, View } from 'react-native';

import { LoginColors, Type } from '@/constants/theme';

/**
 * Cabeçalho da tela de login: logotipo oficial, slogan e arco dourado sutil.
 */
export function LoginHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logoCastelo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Castelo Tem"
      />
      <Text style={styles.slogan}>Sua cidade, ainda mais perto de você!</Text>
      <View style={styles.arc} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 200,
    height: 180,
    backgroundColor: 'transparent',
  },
  slogan: {
    marginTop: 8,
    color: LoginColors.text,
    fontSize: Type.cardTitle,
    fontWeight: '500',
    textAlign: 'center',
  },
  arc: {
    marginTop: 8,
    width: 140,
    height: 18,
    borderBottomWidth: 2,
    borderColor: LoginColors.link,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    opacity: 0.85,
  },
});
