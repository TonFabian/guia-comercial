import { describe, expect, it } from 'vitest';

import { deleteButtonClass } from './delete-button';

describe('delete-button helper', () => {
  it('estado inicial usa danger com hover preenchido', () => {
    expect(deleteButtonClass('danger')).toContain('text-danger');
    expect(deleteButtonClass('danger')).toContain('hover:bg-danger');
  });

  it('estado armado "confirmar" usa preenchimento danger sólido', () => {
    expect(deleteButtonClass('confirm')).toContain('bg-danger');
    expect(deleteButtonClass('confirm')).toContain('text-white');
  });

  it('cancelar usa estilo neutro de superfície', () => {
    expect(deleteButtonClass('cancel')).toContain('bg-surface-hover');
    expect(deleteButtonClass('cancel')).toContain('text-text');
  });

  it('todos têm transição e feedback de clique', () => {
    expect(deleteButtonClass('danger')).toContain('transition-all');
    expect(deleteButtonClass('confirm')).toContain('transition-all');
    expect(deleteButtonClass('cancel')).toContain('transition-all');
    expect(deleteButtonClass('danger')).toContain('active:scale-95');
  });
});
