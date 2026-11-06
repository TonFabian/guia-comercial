import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { LoginColors, LoginGradients } from '@/constants/theme';

/**
 * Decoração de fundo da tela de login: ondas douradas sutis desenhadas em
 * código (sem assets). Fica atrás do conteúdo e não intercepta toques.
 */
export function LoginBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={LoginGradients.waveTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topWave}
      />
      <LinearGradient
        colors={LoginGradients.waveBottom}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomWave}
      />
      <View style={styles.bottomArc} />
    </View>
  );
}

const styles = StyleSheet.create({
  topWave: {
    position: 'absolute',
    top: -160,
    left: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  bottomWave: {
    position: 'absolute',
    bottom: -190,
    right: -150,
    width: 380,
    height: 380,
    borderRadius: 190,
  },
  bottomArc: {
    position: 'absolute',
    bottom: 48,
    right: -60,
    width: 220,
    height: 120,
    borderTopWidth: 2,
    borderColor: LoginColors.arc,
    borderRadius: 110,
  },
});
