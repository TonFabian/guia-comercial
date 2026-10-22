import { StyleSheet, Text, View } from 'react-native';

/**
 * Tela de login (stub da v1 — os componentes do formulário entram na tela
 * de [Task 10] do plano de autenticação).
 */
export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acesse sua conta</Text>
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
