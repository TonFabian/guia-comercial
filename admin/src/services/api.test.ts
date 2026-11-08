import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

import { getCompanies } from './api';

describe('api client', () => {
  beforeEach(() => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('parses paginated response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50 }),
      headers: new Headers(),
    });
    const res = await getCompanies(1, 50);
    expect(res.total).toBe(0);
  });
});
