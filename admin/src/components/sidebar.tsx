// no badge import needed

export const SECTIONS = [
  'Empresas',
  'Categorias',
  'Cidades',
  'Banners',
  'Cupons',
  'Vagas',
  'Avisos',
  'Utilidade Pública',
  'Usuários',
] as const;

export type Section = (typeof SECTIONS)[number];

export function Sidebar({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <aside className="sidebar">
      <h1 className="brand">Guia Comercial</h1>
      <p className="brand-sub">Painel Administrativo</p>
      <nav>
        <ul className="menu">
          {SECTIONS.map((section) => (
            <li
              key={section}
              className={`menu-item ${active === section ? 'active' : ''}`}
              onClick={() => onChange(section)}
              style={{ cursor: 'pointer' }}
            >
              <span>{section}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
