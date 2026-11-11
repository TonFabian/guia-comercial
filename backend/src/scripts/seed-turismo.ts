/**
 * Dados de exemplo do módulo de turismo (atrações e eventos) do seed.
 *
 * Fica num módulo PURO (sem I/O, sem Mongoose) para poder ser testado
 * deterministicamente: o seed precisa de uma conexão com o banco, os dados
 * da programação não. O `seed.ts` monta as datas reais e resolve os ids das
 * atrações; aqui só o texto.
 */

/** Item da programação interna do evento (como vai no documento). */
export type ItemProgramacaoSeed = {
  /** Data do item (YYYY-MM-DD), dentro de [startDate, endDate]. */
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  stage?: string;
  /** Id da atração referenciada (o schema guarda ObjectId, não slug). */
  relatedSpot?: string;
  ticket?: 'free' | 'paid';
  ticketPrice?: string;
  ticketUrl?: string;
};

/** Evento turístico do seed (campos que o modelo aceita). */
export type EventoTuristicoSeed = {
  name: string;
  slug: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  city: string;
  latitude: number;
  longitude: number;
  organizer?: string;
  ticket?: 'free' | 'paid';
  featured?: boolean;
  active: boolean;
  schedule?: ItemProgramacaoSeed[];
};

/** Datas do turismo (YYYY-MM-DD) já formatadas pelo seed. */
export interface DatasTurismo {
  /** Primeiro dia do festival. */
  inicioFestival: string;
  /** Dia do meio do festival. */
  segundoDiaFestival: string;
  /** Último dia do festival (também o endDate do evento). */
  fimFestival: string;
  /** Dia da feira (começo e fim). */
  inicioFeira: string;
}

/**
 * Referência da atração no item da programação — a chave só entra quando a
 * atração existe (evita gravar `relatedSpot` vazio no documento).
 */
function referenciaAtracao(idAtracao: string | undefined): { relatedSpot?: string } {
  return idAtracao ? { relatedSpot: idAtracao } : {};
}

/**
 * Monta os eventos turísticos do seed: o festival (com a programação interna
 * de 3 dias) e a feira.
 *
 * A programação referencia as atrações pelo id resolvido em `idsAtracoes`
 * (slug → id); quando a atração não existe, o item fica sem referência.
 */
export function montarEventosTuristicos(
  datas: DatasTurismo,
  casteloId: string,
  idsAtracoes: ReadonlyMap<string, string>,
): EventoTuristicoSeed[] {
  return [
    {
      name: 'Cânyon Fest Poti',
      slug: `canyon-fest-poti-${datas.inicioFestival.slice(0, 4)}`,
      description:
        'Festival de três dias às margens do cânion, com exposição de animais, rodeio e corrida, além de shows à noite.',
      category: 'festival',
      startDate: datas.inicioFestival,
      endDate: datas.fimFestival,
      startTime: '10:00',
      endTime: '23:00',
      location: 'Cânion do Rio Poti',
      city: casteloId,
      latitude: -7.32,
      longitude: -43.06,
      organizer: 'Organização Cânyon Fest Poti',
      ticket: 'free',
      featured: true,
      active: true,
      // 3 dias, 2+ itens por dia, palcos distintos e referência às atrações
      // cadastradas. As datas dos itens são as do próprio festival.
      schedule: [
        {
          date: datas.inicioFestival,
          startTime: '10:00',
          endTime: '12:00',
          title: 'Abertura e exposição de animais',
          description: 'Boas-vindas com fazenda experimental e venda de artesanato.',
          stage: 'Praça de Entrada',
        },
        {
          date: datas.inicioFestival,
          startTime: '16:00',
          endTime: '18:00',
          title: 'Caminhada-ecológica pelo cânion',
          description: 'Trilha guiada às margens do rio, com o guia do parque.',
          stage: 'Trilha do Cânion',
          ...referenciaAtracao(idsAtracoes.get('canyon-do-rio-poti')),
        },
        {
          date: datas.inicioFestival,
          startTime: '19:00',
          endTime: '22:00',
          title: 'Show de forró',
          stage: 'Palco Principal',
        },
        {
          date: datas.inicioFestival,
          title: 'Praça de alimentação',
          description: 'Barracas de comida típica e bebidas, sem horário fixo.',
          stage: 'Praça de Entrada',
        },
        {
          date: datas.segundoDiaFestival,
          startTime: '09:00',
          endTime: '12:00',
          title: 'Rodeio',
          stage: 'Pista do Cânion',
        },
        {
          date: datas.segundoDiaFestival,
          startTime: '14:00',
          endTime: '17:00',
          title: 'Banho de rio nas cachoeiras',
          stage: 'Margem do Rio Poti',
          ...referenciaAtracao(idsAtracoes.get('cachoeiras-do-rio-poti')),
        },
        {
          date: datas.segundoDiaFestival,
          startTime: '20:00',
          endTime: '23:00',
          title: 'Show de quadrilha',
          stage: 'Palco Principal',
        },
        {
          date: datas.fimFestival,
          startTime: '10:00',
          endTime: '13:00',
          title: 'Corrida de canoas',
          stage: 'Rio Poti',
          // Item com ingresso próprio (o do evento é gratuito).
          ticket: 'paid',
          ticketPrice: 'R$ 25,00',
        },
        {
          date: datas.fimFestival,
          startTime: '16:00',
          endTime: '18:00',
          title: 'Encerramento e premiações',
          stage: 'Praça do Cânion',
        },
      ],
    },
    {
      name: 'Feira do Rio Poti',
      slug: `feira-do-rio-poti-${datas.inicioFeira.slice(0, 4)}`,
      description:
        'Feira de produtores e artesãos da região do Rio Poti, com comida típica e apresentações culturais na praça.',
      category: 'fair',
      startDate: datas.inicioFeira,
      endDate: datas.inicioFeira,
      location: 'Praça do Centro',
      city: casteloId,
      latitude: -7.2833,
      longitude: -43.0167,
      ticket: 'free',
      active: true,
    },
  ];
}


/**
 * Eventos turísticos de Teresina (segunda cidade do seed).
 *
 * Mantido separado do `montarEventosTuristicos` (Castelo do Piauí) para não
 * quebrar o teste determinístico que espera exatamente o festival e a feira
 * do Rio Poti para a cidade padrão.
 */
export function montarEventosTuristicosTeresina(
  datas: DatasTurismo,
  teresinaId: string,
  idsAtracoes: ReadonlyMap<string, string>,
): EventoTuristicoSeed[] {
  return [
    {
      name: 'Festival de Inverno de Teresina',
      slug: `festival-de-inverno-teresina-${datas.inicioFestival.slice(0, 4)}`,
      description:
        'Festival cultural de inverno com shows, feira gastronômica e exposições no parque da cidade.',
      category: 'festival',
      startDate: datas.inicioFestival,
      endDate: datas.fimFestival,
      startTime: '17:00',
      endTime: '23:00',
      location: 'Parque da Cidadania',
      city: teresinaId,
      latitude: -5.089,
      longitude: -42.802,
      organizer: 'Prefeitura de Teresina',
      ticket: 'free',
      featured: true,
      active: true,
      schedule: [
        {
          date: datas.inicioFestival,
          startTime: '17:00',
          endTime: '19:00',
          title: 'Abertura e feira gastronômica',
          stage: 'Praça Principal',
        },
        {
          date: datas.inicioFestival,
          startTime: '20:00',
          endTime: '22:00',
          title: 'Show de MPB',
          stage: 'Palco Principal',
          ...referenciaAtracao(idsAtracoes.get('parque-da-cidadania-teresina')),
        },
        {
          date: datas.segundoDiaFestival,
          startTime: '18:00',
          endTime: '21:00',
          title: 'Noite de forró',
          stage: 'Palco Principal',
        },
        {
          date: datas.fimFestival,
          startTime: '16:00',
          endTime: '18:00',
          title: 'Encerramento e premiações',
          stage: 'Praça Principal',
        },
      ],
    },
    {
      name: 'Feira de Artesanato de Teresina',
      slug: `feira-de-artesanato-teresina-${datas.inicioFeira.slice(0, 4)}`,
      description: 'Feira de artesãos da capital, com produtos regionais e apresentações culturais.',
      category: 'fair',
      startDate: datas.inicioFeira,
      endDate: datas.inicioFeira,
      location: 'Encontro dos Rios',
      city: teresinaId,
      latitude: -5.05,
      longitude: -42.8,
      ticket: 'free',
      active: true,
    },
  ];
}
