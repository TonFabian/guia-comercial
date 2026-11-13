import { useClerk, useUser } from '@clerk/clerk-react';

export const SECTIONS = [
  'Empresas', 'Categorias', 'Cidades', 'Banners', 'Cupons', 'Vagas', 'Avisos',
  'Utilidade Pública', 'Atrações', 'Eventos', 'Notificações', 'Usuários',
] as const;

export type Section = (typeof SECTIONS)[number];

const ICONS: Record<Section, string> = {
  Empresas: '🏢', Categorias: '🏷️', Cidades: '📍', Banners: '🖼️', Cupons: '🎟️',
  Vagas: '💼', Avisos: '📢', 'Utilidade Pública': '🏥', Atrações: '🗺️',
  Eventos: '📅', Notificações: '🔔', Usuários: '👤',
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
  const { user } = useUser();
  const { signOut } = useClerk();

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-[#0d0f13] border-r border-border transition-transform duration-200 md:static md:translate-x-0 ${
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
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => {
                onChange(section);
                onClose();
              }}
              className={`flex w-full items-center gap-2 rounded-(--radius-input) px-3 py-2 text-sm text-left transition-colors ${
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
        <div className="border-t border-border p-3">
          {user && (
            <div
              className="mb-2 truncate text-xs text-text-muted"
              title={user.primaryEmailAddress?.emailAddress ?? ''}
            >
              {user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'Administrador'}
            </div>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-(--radius-input) border border-border bg-surface-hover px-3 py-2 text-xs text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <span aria-hidden="true">🚪</span>
            <span>Sair</span>
          </button>
        </div>
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
  const { signOut } = useClerk();

  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-[#0d0f13]/95 px-4 py-3 backdrop-blur">
      <button onClick={onMenu} aria-label="Abrir menu" className="text-xl text-text">
        ☰
      </button>
      <span className="text-base font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
        {section}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Sair"
        className="ml-auto rounded-(--radius-input) border border-border bg-surface-hover px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        Sair
      </button>
    </header>
  );
}
