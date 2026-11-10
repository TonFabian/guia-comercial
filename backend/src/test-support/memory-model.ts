/**
 * Duplicata em memória do Mongoose usada nos testes de rota.
 *
 * O projeto não sobe Mongo durante os testes; este helper reproduz o
 * subconjunto de operações usado pelos services (`find`, `findOne`,
 * `findById`, `findByIdAndUpdate`, `findByIdAndDelete`, `findOneAndUpdate`,
 * `updateOne`, `create`, `countDocuments`, `exists`) com os operadores de
 * filtro `$in`, `$ne`, `$gte`, `$exists`, `$or` e `$and`.
 *
 * Com `criarModeloEmMemoria({ unicos: [campo] })`, campos com índice único
 * disparam erro de chave duplicada (code 11000, mesmo formato do Mongo) na
 * inserção — inclusive no ramo de upsert do `findOneAndUpdate`.
 *
 * Semântica igual à do Mongoose: `find` resolve uma lista, `findOne` e
 * `findById` resolvem um documento (ou `null`) e `updateOne` resolve o
 * contador de documentos casados.
 *
 * Uso exclusivo dos testes: nenhum arquivo de produção importa este módulo.
 */

export type MemoryDocument = Record<string, unknown>;

export type MemoryFilter = Record<string, unknown>;

export interface MemoryUpdate {
  $set?: MemoryDocument;
  $unset?: Record<string, unknown>;
  $inc?: Record<string, number>;
}

export interface MemoryQuery extends PromiseLike<unknown> {
  sort(ordem: Record<string, number>): MemoryQuery;
  skip(valor: number): MemoryQuery;
  limit(valor: number): MemoryQuery;
  select(projecao: Record<string, number>): MemoryQuery;
  populate(campo: string): MemoryQuery;
  lean(): MemoryQuery;
  exec(): Promise<unknown>;
}

/** Opções de modelagem: `unicos` simula índices `unique` do Mongoose. */
export interface MemoryModelOptions {
  /** Campos com índice único: inserir valor repetido dispara erro 11000. */
  unicos?: string[];
}

export interface MemoryModel {
  /** Documentos guardados, na ordem de inserção. */
  documents: MemoryDocument[];
  find(filtro?: MemoryFilter): MemoryQuery;
  findOne(filtro?: MemoryFilter): MemoryQuery;
  findById(id: string): MemoryQuery;
  findByIdAndUpdate(id: string, atualizacao: MemoryUpdate): MemoryQuery;
  findByIdAndDelete(id: string): MemoryQuery;
  findOneAndUpdate(filtro: MemoryFilter, atualizacao: MemoryUpdate, opcoes?: unknown): MemoryQuery;
  updateOne(filtro: MemoryFilter, atualizacao: MemoryUpdate): MemoryQuery;
  create(
    documento: MemoryDocument | MemoryDocument[],
  ): Promise<MemoryDocument | MemoryDocument[]>;
  countDocuments(filtro?: MemoryFilter): Promise<number>;
  exists(filtro: MemoryFilter): Promise<boolean>;
}

interface Estado {
  ordem: Record<string, number>;
  skip: number;
  limit: number | null;
  projecao: Record<string, number> | null;
  populates: string[];
  resolver: () => unknown;
}

class MemoryQueryImpl implements MemoryQuery {
  private readonly estado: Estado;

  constructor(estado: Estado) {
    this.estado = estado;
  }

  sort(ordem: Record<string, number>): MemoryQuery {
    this.estado.ordem = ordem;
    return this;
  }

  skip(valor: number): MemoryQuery {
    this.estado.skip = valor;
    return this;
  }

  limit(valor: number): MemoryQuery {
    this.estado.limit = valor;
    return this;
  }

  select(projecao: Record<string, number>): MemoryQuery {
    this.estado.projecao = projecao;
    return this;
  }

  populate(campo: string): MemoryQuery {
    this.estado.populates.push(campo);
    return this;
  }

  lean(): MemoryQuery {
    return this;
  }

  async exec(): Promise<unknown> {
    return this.estado.resolver();
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

/** Cria um modelo Mongoose falso, com a mesma interface usada pelos services. */
export function criarModeloEmMemoria(opcoesDoModelo: MemoryModelOptions = {}): MemoryModel {
  const documents: MemoryDocument[] = [];
  const unicidades = opcoesDoModelo.unicos ?? [];
  let sequencia = 0;

  function novoId(): string {
    sequencia += 1;
    return sequencia.toString().padStart(24, '0');
  }

  /**
   * Simula a falha de chave duplicada do MongoDB: mesma forma consultada
   * pelos services (`(erro as { code?: number }).code === 11000`).
   */
  function erroChaveDuplicada(campo: string): Error {
    const erro = new Error(`E11000: valor duplicado em '${campo}'`);
    Object.assign(erro, { name: 'MongoServerError', code: 11000 });
    return erro;
  }

  /** Garante que um valor reservado a índice único não entra duplicado. */
  function inserirComUnicidade(memoria: MemoryDocument): void {
    for (const campo of unicidades) {
      const valor = memoria[campo];
      if (valor === undefined) continue;
      const duplicado = documents.some((documento) => campo in documento && valoresIguais(documento[campo], valor));
      if (duplicado) throw erroChaveDuplicada(campo);
    }
    documents.push(memoria);
  }

  function criarConsulta(
    filtro: MemoryFilter,
    resolver: (casados: MemoryDocument[], estado: Estado) => unknown,
  ): MemoryQuery {
    const estado: Estado = {
      ordem: {},
      skip: 0,
      limit: null,
      projecao: null,
      populates: [],
      resolver: () => null,
    };
    estado.resolver = () => {
      const casados = documents.filter((documento) => casarDocumento(documento, filtro));
      return resolver(casados, estado);
    };
    return new MemoryQueryImpl(estado);
  }

  return {
    documents,

    find(filtro: MemoryFilter = {}) {
      return criarConsulta(filtro, (casados, estado) => finalizar(casados, estado));
    },

    findOne(filtro: MemoryFilter = {}) {
      return criarConsulta(filtro, (casados, estado) => {
        const primeiro = casados[0];
        return primeiro ? projetar(primeiro, estado.projecao) : null;
      });
    },

    findById(id: string) {
      return criarConsulta({ _id: id }, (casados, estado) => {
        const primeiro = casados[0];
        return primeiro ? projetar(primeiro, estado.projecao) : null;
      });
    },

    findByIdAndUpdate(id: string, atualizacao: MemoryUpdate) {
      return criarConsulta({ _id: id }, (casados, estado) => {
        const alvo = casados[0];
        if (!alvo) return null;
        aplicarAtualizacao(alvo, atualizacao);
        return projetar(alvo, estado.projecao);
      });
    },

    findByIdAndDelete(id: string) {
      return criarConsulta({ _id: id }, (casados, estado) => {
        const alvo = casados[0];
        if (!alvo) return null;
        documents.splice(documents.indexOf(alvo), 1);
        return projetar(alvo, estado.projecao);
      });
    },

    findOneAndUpdate(
      filtro: MemoryFilter,
      atualizacao: MemoryUpdate,
      opcoes?: { upsert?: boolean },
    ) {
      return criarConsulta(filtro, (casados, estado) => {
        const alvo = casados[0];
        if (!alvo) {
          if (!opcoes?.upsert) return null;
          const criado: MemoryDocument = { _id: novoId(), ...(atualizacao.$set ?? {}) };
          // Upsert com violação do índice único dispara como no Mongo (11000):
          // é por isso que um filtro de upsert precisa carregar a condição
          // de posse — sem ela, o insert colide e o erro vira o resultado.
          inserirComUnicidade(criado);
          return projetar(criado, estado.projecao);
        }
        aplicarAtualizacao(alvo, atualizacao);
        return projetar(alvo, estado.projecao);
      });
    },

    updateOne(filtro: MemoryFilter, atualizacao: MemoryUpdate, opcoes?: { upsert?: boolean }) {
      return criarConsulta(filtro, (casados) => {
        const alvo = casados[0];
        if (!alvo) {
          if (!opcoes?.upsert) return { matchedCount: 0, modifiedCount: 0 };
          // Upsert: o documento novo nasce com os campos de igualdade do
          // filtro (posse) — mesma semântica do Mongo — e depois recebe o
          // update (ex.: $inc cria o contador com o primeiro valor).
          const criado: MemoryDocument = {};
          for (const [campo, condicao] of Object.entries(filtro)) {
            if (typeof condicao !== 'object' || condicao === null) {
              criado[campo] = condicao;
            }
          }
          aplicarAtualizacao(criado, atualizacao);
          inserirComUnicidade(criado);
          return { matchedCount: 0, modifiedCount: 1, upsertedId: criado._id };
        }
        aplicarAtualizacao(alvo, atualizacao);
        return { matchedCount: 1, modifiedCount: 1 };
      });
    },

    async create(documento: MemoryDocument | MemoryDocument[]) {
      if (Array.isArray(documento)) {
        const criados = documento.map((item) => {
          const criado = { _id: novoId(), ...item };
          inserirComUnicidade(criado);
          return criado;
        });
        return criados;
      }
      const criado = { _id: novoId(), ...documento };
      inserirComUnicidade(criado);
      return criado;
    },

    async countDocuments(filtro: MemoryFilter = {}) {
      return documents.filter((documento) => casarDocumento(documento, filtro)).length;
    },

    async exists(filtro: MemoryFilter) {
      return documents.some((documento) => casarDocumento(documento, filtro));
    },
  };
}

/** Aplica ordenação, paginação e projeção sobre os documentos casados. */
function finalizar(casados: MemoryDocument[], estado: Estado): MemoryDocument[] {
  const ordenados = ordenar(casados, estado.ordem);
  const pagina =
    estado.limit === null
      ? ordenados.slice(estado.skip)
      : ordenados.slice(estado.skip, estado.skip + estado.limit);
  return pagina.map((documento) => projetar(documento, estado.projecao));
}

function ordenar(
  documentos: MemoryDocument[],
  ordem: Record<string, number>,
): MemoryDocument[] {
  const chaves = Object.entries(ordem);
  if (chaves.length === 0) return documentos;

  return [...documentos].sort((a, b) => {
    for (const [campo, direcao] of chaves) {
      const diferenca = comparar(a[campo], b[campo]);
      if (diferenca !== 0) return direcao < 0 ? -diferenca : diferenca;
    }
    return 0;
  });
}

function comparar(a: unknown, b: unknown): number {
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR');
}

/** Projeção no estilo do Mongo: `1` inclui, `0` exclui. */
function projetar(
  documento: MemoryDocument,
  projecao: Record<string, number> | null,
): MemoryDocument {
  if (!projecao) return { ...documento };

  const inclusoes = Object.entries(projecao).filter(([, valor]) => valor === 1);
  if (inclusoes.length > 0) {
    const resultado: MemoryDocument = {};
    for (const [campo] of inclusoes) {
      if (documento[campo] !== undefined) resultado[campo] = documento[campo];
    }
    if (documento._id !== undefined) resultado._id = documento._id;
    return resultado;
  }

  const resultado = { ...documento };
  for (const [campo, valor] of Object.entries(projecao)) {
    if (valor === 0) delete resultado[campo];
  }
  return resultado;
}

function aplicarAtualizacao(
  documento: MemoryDocument,
  atualizacao: MemoryUpdate,
): void {
  // O Mongoose trata um objeto de update sem operadores como `$set`
  // implícito: os campos enviados sobrescrevem os existentes e `null`
  // limpa o valor. Reproduzir essa semântica evita que o duplo esconda
  // bug de atualização (o update nunca pareceria ter efeito).
  const temOperadores =
    Object.keys(atualizacao).some((chave) => chave.startsWith('$'));

  if (!temOperadores) {
    for (const [campo, valor] of Object.entries(atualizacao)) {
      if (valor === undefined) continue;
      documento[campo] = valor;
    }
    return;
  }

  if (atualizacao.$set) {
    Object.assign(documento, atualizacao.$set);
  }
  if (atualizacao.$inc) {
    for (const [campo, incremento] of Object.entries(atualizacao.$inc ?? {})) {
      const atual = typeof documento[campo] === 'number' ? documento[campo] : 0;
      documento[campo] = atual + (incremento as number);
    }
  }
  if (atualizacao.$unset) {
    for (const campo of Object.keys(atualizacao.$unset)) {
      delete documento[campo];
    }
  }
}

function casarDocumento(
  documento: MemoryDocument,
  filtro: MemoryFilter,
): boolean {
  return Object.entries(filtro).every(([campo, condicao]) => {
    if (campo === '$or') {
      const alternativas = (condicao as MemoryFilter[]) ?? [];
      return alternativas.some((alternativa) => casarDocumento(documento, alternativa));
    }
    if (campo === '$and') {
      const alternativas = (condicao as MemoryFilter[]) ?? [];
      return alternativas.every((alternativa) => casarDocumento(documento, alternativa));
    }
    return casarValor(documento[campo], condicao);
  });
}

function casarValor(valor: unknown, condicao: unknown): boolean {
  if (condicao instanceof RegExp) {
    if (typeof valor === 'string') return condicao.test(valor);
    if (Array.isArray(valor)) return valor.some((item) => typeof item === 'string' && condicao.test(item));
    return false;
  }

  if (condicao !== null && typeof condicao === 'object' && !Array.isArray(condicao)) {
    const operadores = condicao as Record<string, unknown>;
    if ('$in' in operadores) {
      const lista = (operadores.$in as unknown[]) ?? [];
      return lista.some((item) => valoresIguais(valor, item));
    }
    if ('$ne' in operadores) {
      return !valoresIguais(valor, operadores.$ne);
    }
    if ('$gte' in operadores) {
      const limite = operadores.$gte;
      // A regra de eventos compara strings YYYY-MM-DD: a ordem lexicográfica
      // é correta no formato fixo (nunca misture data com datetime ISO).
      if (typeof valor === 'string' && typeof limite === 'string') return valor >= limite;
      if (typeof valor === 'number' && typeof limite === 'number') return valor >= limite;
      return false;
    }
    if ('$exists' in operadores) {
      return (valor !== undefined) === Boolean(operadores.$exists);
    }
    return false;
  }

  return valoresIguais(valor, condicao);
}

function valoresIguais(valor: unknown, esperado: unknown): boolean {
  if (valor === undefined || valor === null) {
    return esperado === undefined || esperado === null;
  }
  if (valor instanceof Date || esperado instanceof Date) {
    return new Date(valor as string).getTime() === new Date(esperado as string).getTime();
  }
  return String(valor) === String(esperado);
}
