import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..', '..', '..');

function readDomain(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('domain.ts equivalence', () => {
  it('admin copy is textually identical to shared', () => {
    const shared = readDomain('shared/domain.ts');
    const admin = readDomain('admin/src/types/domain.ts');

    // mobile possui helpers extras (categoryLabel/companyLabel) ausentes em shared; pendência de refactor.
    expect(admin).toBe(shared);
  });
});
