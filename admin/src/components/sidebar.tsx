import { Badge } from './badge';

/** Seções do painel. Cada entrada ainda não possui tela implementada. */
export const SECTIONS = [
  'Empresas',
  'Categorias',
  'Anúncios',
  'Banners',
  'Usuários',
] as const;

/** Navegação lateral estática (sem CRUD por enquanto). */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <h1 className="brand">Guia Comercial</h1>
      <p className="brand-sub">Painel Administrativo</p>
      <nav>
        <ul className="menu">
          {SECTIONS.map((section) => (
            <li key={section} className="menu-item">
              <span>{section}</span>
              <Badge>em breve</Badge>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
