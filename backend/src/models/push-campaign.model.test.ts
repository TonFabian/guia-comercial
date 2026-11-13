import { describe, expect, it } from 'vitest';

import { PushCampaignModel } from './push-campaign.model.js';

describe('push-campaign.model', () => {
  it('declara os paths principais', () => {
    const schema = PushCampaignModel.schema;
    for (const path of [
      'title',
      'body',
      'imageUrl',
      'deepLink',
      'segment.kind',
      'segment.userIds',
      'segment.cityId',
      'segment.plan',
      'segment.companyId',
      'status',
      'scheduledFor',
      'sendingStartedAt',
      'sentAt',
      'receipts',
      'stats.targeted',
      'stats.sent',
      'stats.failed',
      'stats.deadTokens',
      'error',
      'createdByClerkId',
    ]) {
      expect(schema.path(path)).toBeTruthy();
    }
  });

  it('status aceita os cinco estados', () => {
    const status = PushCampaignModel.schema.path('status') as { enumValues?: string[] } | undefined;
    expect(status?.enumValues).toEqual(['draft', 'scheduled', 'sending', 'sent', 'failed']);
  });

  it('tem índice { scheduledFor, status }', () => {
    const indice = PushCampaignModel.schema.indexes().find(
      ([chaves]) => 'scheduledFor' in chaves && 'status' in chaves,
    );
    expect(indice).toBeTruthy();
  });

  it('tem índice { status, createdAt } com createdAt desc', () => {
    const indice = PushCampaignModel.schema.indexes().find(
      ([chaves]) => 'status' in chaves && 'createdAt' in chaves,
    );
    expect(indice).toBeTruthy();
    expect((indice?.[0] as Record<string, number>).createdAt).toBe(-1);
  });

  it('stats tem defaults 0', () => {
    const targeted = PushCampaignModel.schema.path('stats.targeted') as { defaultValue?: unknown } | undefined;
    expect(targeted?.defaultValue).toBe(0);
  });

  it('receipts é array Mixed', () => {
    const receipts = PushCampaignModel.schema.path('receipts') as { instance?: string } | undefined;
    expect(receipts?.instance).toBe('Array');
  });
});