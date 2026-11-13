import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { find, aggregate } = vi.hoisted(() => ({ find: vi.fn(), aggregate: vi.fn() }));

vi.mock('../models/push-token.model.js', () => ({
  PushTokenModel: { find, aggregate },
}));

import { sendPushToCity, sendPushToTokens, sendPushToUser } from './push.service.js';

function fetchOk() {
  return vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200 }));
}

function cursorCom(docs: unknown[]) {
  return { select: () => ({ lean: () => ({ exec: () => Promise.resolve(docs) }) }) };
}

describe('sendPushToTokens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POST para a API do Expo com as mensagens formatadas', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToTokens(['ExponentPushToken[a]'], 'Título', 'Corpo');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(JSON.parse(String(init.body))).toEqual([{ to: 'ExponentPushToken[a]', title: 'Título', body: 'Corpo' }]);
  });

  it('lista vazia: nem chama a rede', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToTokens([], 'T', 'B');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede: warn e NÃO lança', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    await expect(sendPushToTokens(['x'], 'T', 'B')).resolves.toBeUndefined();
  });
});

describe('sendPushToUser / sendPushToCity', () => {
  beforeEach(() => {
    find.mockReset();
    aggregate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sendPushToUser filtra tokens pelo clerkId exato', async () => {
    find.mockReturnValue(cursorCom([{ token: 'tok1' }]));
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToUser('user_1', 'T', 'B');
    expect(find).toHaveBeenCalledWith({ clerkId: 'user_1' });
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual([{ to: 'tok1', title: 'T', body: 'B' }]);
  });

  it('sendPushToCity faz join clerkId → UserModel.city e NÃO pega token sem dono', async () => {
    aggregate.mockReturnValue({ exec: () => Promise.resolve([{ token: 'tokCidade' }]) });
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToCity('000000000000000000000320', 'T', 'B');
    const pipeline = aggregate.mock.calls[0]?.[0] as unknown[];
    expect(JSON.stringify(pipeline)).toContain('$lookup');
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual([{ to: 'tokCidade', title: 'T', body: 'B' }]);
  });

  it('sendPushToCity com id malformado: nem consulta nem envia', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToCity('nao-e-id', 'T', 'B');
    expect(aggregate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendPushToUser sem token: nem chama a rede', async () => {
    find.mockReturnValue(cursorCom([]));
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToUser('user_nada', 'T', 'B');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
