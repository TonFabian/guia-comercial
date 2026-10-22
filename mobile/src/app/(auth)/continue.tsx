import { StyleSheet, Text, View } from 'react-native';

/**
 * Tela de pendências do fluxo SSO (stub da v1): coleta o que a sessão
 * indica sobre itens pendentes e deixa o usuário continuar.
 */
export default function ContinueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Falta pouco</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
