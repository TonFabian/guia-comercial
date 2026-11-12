import { describe, expect, it } from 'vitest';

import { PlanNotificationModel } from './plan-notification.model.js';

describe('plan-notification.model', () => {
  it('tem índice único por (companyId, kind, planExpiresAt)', () => {
    const indice = PlanNotificationModel.schema.indexes().find(
      ([chaves]) => 'companyId' in chaves && 'kind' in chaves && 'planExpiresAt' in chaves,
    );
    expect(indice).toBeTruthy();
    expect(indice?.[1].unique).toBe(true);
  });

  it('kind só aceita os três tipos de aviso', () => {
    const kind = PlanNotificationModel.schema.path('kind');
    expect(kind?.enumValues).toEqual(['expiring-7d', 'expiring-1d', 'expired']);
  });
});
