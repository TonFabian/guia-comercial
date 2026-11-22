/**
 * Stub do `expo-constants` para o ambiente Node do Vitest: o módulo real
 * carrega código nativo (react-native) que não resolve fora do device.
 * `EXPO_CONSTANTS_HOST_URI` permite simular o host do dev server nos testes.
 */
const hostUri = process.env.EXPO_CONSTANTS_HOST_URI;
const Constants = {
  expoConfig: hostUri ? { hostUri } : null,
};

export default Constants;
