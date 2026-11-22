/**
 * Resolução da URL base da API.
 *
 * Em desenvolvimento com Expo Go, o IP da máquina muda a cada rede. Em vez de
 * fixar o endereço em `.env`, derivamos o host do `hostUri` do Expo (o mesmo
 * host que serve o bundle), trocando a porta do Metro pela porta da API.
 * `EXPO_PUBLIC_API_URL` continua vencendo quando definida — necessário em
 * build de produção, onde não existe dev server.
 */
export const PORTA_API_PADRAO = 4000;

export interface ApiUrlOptions {
  /** Valor de `EXPO_PUBLIC_API_URL`, quando definido. */
  explicitUrl?: string;
  /** `Constants.expoConfig?.hostUri` (ex.: "192.168.1.106:8081"). */
  hostUri?: string;
  /**
   * URL do bundle servido pelo Metro (ex.: "http://192.168.1.106:8081/").
   *
   * Em dev build (bare/CNG) o `expo-constants` lê o `app.json` embutido e não
   * expõe `hostUri`; a URL do bundle continua apontando para o dev server.
   */
  bundleUrl?: string;
  /** `__DEV__`. */
  dev: boolean;
}

/** Extrai só o host do `hostUri`, descartando esquema, caminho e porta. */
function extrairHost(hostUri: string): string | null {
  const semEsquema = hostUri.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
  const host = semEsquema.split(':')[0]?.trim();
  return host ? host : null;
}

export function resolveApiBaseUrl({ explicitUrl, hostUri, bundleUrl, dev }: ApiUrlOptions): string | undefined {
  const urlExplicita = explicitUrl?.trim();
  if (urlExplicita) return urlExplicita;
  if (!dev) return undefined;

  const fonte = hostUri ?? bundleUrl;
  if (!fonte) return undefined;

  const host = extrairHost(fonte);
  if (!host) return undefined;

  return `http://${host}:${PORTA_API_PADRAO}/api`;
}
