import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..', '..', '..');

function readDomain(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('domain.ts equivalence', () => {
  it('shared, mobile and admin copies are textually identical', () => {
    const shared = readDomain('shared/domain.ts');
    const mobile = readDomain('mobile/src/types/domain.ts');
    const admin = readDomain('admin/src/types/domain.ts');

    expect(mobile).toBe(shared);
    expect(admin).toBe(shared);
  });
});
