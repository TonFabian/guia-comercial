export const SECTIONS = [
  'Empresas', 'Categorias', 'Cidades', 'Banners', 'Cupons', 'Vagas', 'Avisos',
  'Utilidade Pública', 'Atrações', 'Eventos', 'Usuários',
] as const;

export type Section = (typeof SECTIONS)[number];

const ICONS: Record<Section, string> = {
  Empresas: '🏢', Categorias: '🏷️', Cidades: '📍', Banners: '🖼️', Cupons: '🎟️',
  Vagas: '💼', Avisos: '📢', 'Utilidade Pública': '🏥', Atrações: '🗺️',
  Eventos: '📅', Usuários: '👤',
};

export function Sidebar({
  active,
  onChange,
  open,
  onClose,
}: {
  active: Section;
  onChange: (s: Section) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-[#0d0f13] border-r border-border transition-transform duration-200 md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <div className="text-sm font-bold text-primary" style={{ fontFamily: 'var(--font-family-heading)' }}>
              ◆ Guia Comercial
            </div>
            <div className="text-[10px] text-text-muted">Painel Administrativo</div>
          </div>
          <button className="md:hidden text-text-muted" onClick={onClose} aria-label="Fechar menu">
            ✕
          </button>
        </div>
        <nav className="p-2 space-y-0.5 overflow-y-auto">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => {
                onChange(section);
                onClose();
              }}
              className={`flex w-full items-center gap-2 rounded-[--radius-input] px-3 py-2 text-sm text-left transition-colors ${
                active === section
                  ? 'border-l-2 border-primary bg-surface-hover text-primary'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <span>{ICONS[section]}</span>
              <span>{section}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

export function MobileTopbar({
  section,
  onMenu,
}: {
  section: Section;
  onMenu: () => void;
}) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-[#0d0f13]/95 px-4 py-3 backdrop-blur">
      <button onClick={onMenu} aria-label="Abrir menu" className="text-xl text-text">
        ☰
      </button>
      <span className="text-base font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
        {section}
      </span>
    </header>
  );
}
