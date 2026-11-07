import { describe, it, expect } from 'vitest';

import { EmpresasSection } from './components/sections/empresas';
import { VagasSection } from './components/sections/vagas';
import { CuponsSection } from './components/sections/cupons';
import { AvisosSection } from './components/sections/avisos';
import { UsuariosSection } from './components/sections/usuarios';

describe('admin sections smoke', () => {
  it('exports section components', () => {
    expect(typeof EmpresasSection).toBe('function');
    expect(typeof VagasSection).toBe('function');
    expect(typeof CuponsSection).toBe('function');
    expect(typeof AvisosSection).toBe('function');
    expect(typeof UsuariosSection).toBe('function');
  });
});
