import { describe, expect, it } from 'vitest';

import { rowActionClass } from './row-actions';

describe('row-actions helper', () => {
  it('editar usa acento primário (amber) e hover preenchido', () => {
    expect(rowActionClass('edit')).toContain('text-primary');
    expect(rowActionClass('edit')).toContain('hover:bg-primary');
    expect(rowActionClass('edit')).toContain('hover:text-[#111827]');
  });

  it('excluir usa danger (vermelho) e hover preenchido', () => {
    expect(rowActionClass('delete')).toContain('text-danger');
    expect(rowActionClass('delete')).toContain('hover:bg-danger');
    expect(rowActionClass('delete')).toContain('hover:text-white');
  });

  it('ambos têm transição e feedback de clique', () => {
    expect(rowActionClass('edit')).toContain('transition-all');
    expect(rowActionClass('edit')).toContain('active:scale-95');
    expect(rowActionClass('delete')).toContain('transition-all');
    expect(rowActionClass('delete')).toContain('active:scale-95');
  });

  it('variantes são distintas', () => {
    expect(rowActionClass('edit')).not.toBe(rowActionClass('delete'));
  });
});
