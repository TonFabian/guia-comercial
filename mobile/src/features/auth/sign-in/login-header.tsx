import { Image, StyleSheet, Text, View } from 'react-native';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useLoginColors } from '@/features/auth/use-login-theme';

/**
 * Cabeçalho da tela de login: logotipo oficial, slogan e arco dourado sutil.
 */
export function LoginHeader() {
  const colors = useLoginColors();
  const styles = makeStyles(colors);
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

function makeStyles(colors: ReturnType<typeof useLoginColors>) {
  return StyleSheet.create({
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
    color: colors.text,
        ...Typography.h5,
    fontFamily: FontFamily.body500,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  arc: {
    marginTop: 8,
    width: 140,
    height: 18,
    borderBottomWidth: 2,
    borderColor: colors.link,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    opacity: 0.85,
  },
  });
}
