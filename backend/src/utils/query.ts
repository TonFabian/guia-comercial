/**
 * Sanitizadores centrais de parâmetros de query, com comportamento fail-closed.
 *
 * Parâmetro ausente (undefined/null) → `undefined` (sem filtro, comportamento
 * legítimo). Parâmetro PRESENTE mas malformado (array, objeto, tipo errado,
 * acima do limite, fora do enum) → erro 400. Nunca descartar silenciosamente:
 * descartar devolve MAIS dados do que o chamador pediu.
 */

/** Erro de domínio que o errorHandler mapeia para o status HTTP. */
export function parametroInvalido(nome: string, motivo: string): Error & { statusCode: number } {
  return Object.assign(new Error(`Parâmetro inválido: '${nome}' — ${motivo}`), { statusCode: 400 });
}

/** Limite padrão de tamanho de um texto de query. */
const LIMITE_TEXTO_PADRAO = 120;

/** Nulo (\0) e demais caracteres de controle não pertencem a texto de query. */
// eslint-disable-next-line no-control-regex -- remover controles É o objetivo do sanitizador
const CARACTERES_DE_CONTROLE = /[\0\x01-\x1f\x7f]/g;

function falha(nome: string, motivo: string): never {
  throw parametroInvalido(nome, motivo);
}

/** Aparado, sem controle e sem espaços das pontas; vazio volta como undefined. */
function textoLimpo(valor: string): string {
  return valor.replace(CARACTERES_DE_CONTROLE, '').trim();
}

/** Nome genérico quando o chamador não informa o campo — preserva as mensagens antigas. */
const NOME_GENERICO = 'valor';

interface OpcoesDeTexto {
  maxLength?: number;
  minLength?: number;
  /** Nome do parâmetro de query, para a mensagem do 400 (ex.: 'q'). */
  nome?: string;
}

/**
 * Texto de query: só string, aparado, sem controles, com teto de tamanho.
 * String que fica vazia após a limpeza → undefined (sem filtro).
 */
export function lerTexto(valor: unknown, opcoes?: OpcoesDeTexto): string | undefined {
  const nome = opcoes?.nome ?? NOME_GENERICO;
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') return falha(nome, 'esperado texto, recebido tipo não texto');

  const texto = textoLimpo(valor);
  if (texto === '') return undefined;

  const maxLength = opcoes?.maxLength ?? LIMITE_TEXTO_PADRAO;
  if (texto.length > maxLength) {
    return falha(nome, `texto acima do limite de ${maxLength} caracteres`);
  }
  const minLength = opcoes?.minLength ?? 0;
  if (texto.length < minLength) {
    return falha(nome, `texto abaixo do mínimo de ${minLength} caracteres`);
  }
  return texto;
}

/**
 * Booleano de query: apenas as strings 'true'/'false'. Qualquer outro valor
 * presente é um 400 — '1'/'0'/'yes' virariam ambiguidade de contrato.
 */
export function lerBooleano(valor: unknown, nome = NOME_GENERICO): boolean | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') return falha(nome, 'esperado booleano, recebido tipo não texto');

  const texto = textoLimpo(valor);
  if (texto === '') return undefined;
  if (texto === 'true') return true;
  if (texto === 'false') return false;
  return falha(nome, "booleanos aceitos: 'true' ou 'false'");
}

interface OpcoesDeInteiro {
  min?: number;
  max?: number;
  /** Nome do parâmetro de query, para a mensagem do 400 (ex.: 'page'). */
  nome?: string;
}

/**
 * Inteiro de query: apenas string numérica inteira. Número cru não é aceito:
 * parâmetros de query chegam sempre como string no Express; aceitar número
 * reabriria confusão de tipos (defesa em profundidade). O resultado é clampado
 * em [min, max] quando as bordas são informadas (min padrão 0).
 */
export function lerInteiro(valor: unknown, opcoes?: OpcoesDeInteiro): number | undefined {
  const nome = opcoes?.nome ?? NOME_GENERICO;
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') return falha(nome, 'esperado número, recebido tipo não texto');

  const texto = textoLimpo(valor);
  if (texto === '') return undefined;
  if (!/^-?\d+$/.test(texto)) return falha(nome, 'esperado número inteiro');

  let numero = Number(texto);
  const min = opcoes?.min ?? 0;
  const max = opcoes?.max ?? Number.POSITIVE_INFINITY;
  numero = Math.min(Math.max(numero, min), max);
  return numero;
}

/** Teto padrão de itens numa lista de slugs. */
const LIMITE_ITENS_PADRAO = 20;

/** Teto padrão de caracteres por slug. */
const LIMITE_SLUG_PADRAO = 64;

/** Teto padrão da string CRUA informada (antes da normalização). */
const LIMITE_CRUA_PADRAO = 120;

/**
 * Normaliza um candidato a slug: minúsculo, sem acento (NFD), espaços → hífen,
 * só [a-z0-9-], hífens colapsados e aparados. Devolve '' quando nada sobra.
 */
function normalizarSlug(item: string): string {
  return item
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface OpcoesDeLista {
  maxItens?: number;
  maxLength?: number;
  /** Teto da string crua (padrão 120). */
  maxBruto?: number;
  /** Nome do parâmetro de query, para a mensagem do 400 (ex.: 'category'). */
  nome?: string;
}

/**
 * Lista de slugs: aceita 'a,b' (parser `simple` do Express 5); cada item é
 * normalizado, vazios e sem-sentido são descartados e duplicatas deduplicadas
 * ('a,A' → ['a']). Teto da string CRUA (antes de normalizar — evita entrada
 * gigante que normaliza para vazio), de itens e de tamanho por item; acima de
 * qualquer um dos três → 400.
 */
export function lerListaDeSlugs(valor: unknown, opcoes?: OpcoesDeLista): string[] | undefined {
  const nome = opcoes?.nome ?? NOME_GENERICO;
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') return falha(nome, 'esperado lista de slugs, recebido tipo não texto');

  const texto = textoLimpo(valor);
  if (texto === '') return undefined;

  const maxBruto = opcoes?.maxBruto ?? LIMITE_CRUA_PADRAO;
  if (texto.length > maxBruto) {
    return falha(nome, `texto acima do limite de ${maxBruto} caracteres`);
  }

  const maxLength = opcoes?.maxLength ?? LIMITE_SLUG_PADRAO;
  const slugs = texto.split(',').map((item) => normalizarSlug(item));
  for (const slug of slugs) {
    if (slug.length > maxLength) {
      return falha(nome, `slug acima do limite de ${maxLength} caracteres`);
    }
  }

  const itensValidos = [...new Set(slugs.filter((slug) => slug !== ''))];
  const maxItens = opcoes?.maxItens ?? LIMITE_ITENS_PADRAO;
  if (itensValidos.length > maxItens) {
    return falha(nome, `lista acima do limite de ${maxItens} itens`);
  }
  if (itensValidos.length === 0) return undefined;
  return itensValidos;
}

/**
 * Enum de query: o valor precisa estar na lista informada; valor presente e
 * fora dela → 400 com os valores aceitos na mensagem.
 */
export function lerEnum<T extends string>(
  valor: unknown,
  valores: readonly T[],
  nome = NOME_GENERICO,
): T | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') return falha(nome, 'esperado texto, recebido tipo não texto');

  const texto = textoLimpo(valor);
  if (texto === '') return undefined;
  const aceito = valores.find((valorEnumerado) => valorEnumerado === texto);
  if (aceito !== undefined) return aceito;
  return falha(nome, `valor não aceito; aceitos: ${valores.join(', ')}`);
}
