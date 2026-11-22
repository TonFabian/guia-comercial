/**
 * URL do dev server (Metro) que serviu o bundle, em desenvolvimento.
 *
 * Em dev build (bare/CNG) o `expo-constants` lê o `app.json` embutido e não
 * expõe `hostUri`; a URL do bundle, porém, continua apontando para a máquina
 * que roda o `expo start`. Derivar o host daí evita fixar o IP da rede no
 * `.env` — mesmo problema que o `hostUri` resolve no Expo Go.
 *
 * O require é tardio porque `react-native` não resolve no Vitest (Node).
 */
type DevServerInfo = {
  url: string;
  bundleLoadedFromServer: boolean;
};

type GetDevServer = () => DevServerInfo;

function carregarModulo(): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native/Libraries/Core/Devtools/getDevServer');
}

// O módulo é `export default`, mas o interop do `require` pode entregar a
// função direto; aceitar as duas formas evita falha silenciosa no device.
function normalizarModulo(modulo: unknown): GetDevServer | null {
  if (typeof modulo === 'function') return modulo as GetDevServer;

  if (
    typeof modulo === 'object' &&
    modulo !== null &&
    typeof (modulo as { default?: unknown }).default === 'function'
  ) {
    return (modulo as { default: GetDevServer }).default;
  }

  return null;
}

export function devServerUrl(load: () => unknown = carregarModulo): string | undefined {
  try {
    const getDevServer = normalizarModulo(load());
    if (!getDevServer) return undefined;

    const info = getDevServer();
    // Em produção/embedded o `getDevServer` cai no fallback localhost:8081 —
    // não é um dev server real, então não serve como host da API.
    return info.bundleLoadedFromServer ? info.url : undefined;
  } catch {
    return undefined;
  }
}
