import { describe, it, expect } from 'vitest';
import { NotificationModel } from './notification.model.js';

describe('NotificationModel', () => {
  it('declara os índices esperados', () => {
    const indexes = NotificationModel.schema.indexes();
    const keys = indexes.map((i) => JSON.stringify(i[0]));
    expect(keys).toContain(JSON.stringify({ clerkId: 1, createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ clerkId: 1, refId: 1 }));
  });
});
