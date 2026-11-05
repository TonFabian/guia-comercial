import type { AuthStatus } from '@/providers/auth-provider';

export type MenuItemId = 'meus-dados' | 'minha-empresa' | 'configuracoes' | 'sair';

type MenuIcon =
  | 'person-outline'
  | 'business-outline'
  | 'settings-outline'
  | 'log-out-outline';

export interface MenuItem {
  id: MenuItemId;
  label: string;
  icon: MenuIcon;
}

const BASE_ITEMS: MenuItem[] = [
  { id: 'meus-dados', label: 'Meus dados', icon: 'person-outline' },
  { id: 'minha-empresa', label: 'Minha empresa', icon: 'business-outline' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings-outline' },
];

export function buildMenu(state: AuthStatus): MenuItem[] {
  if (state === 'signedIn') {
    return [...BASE_ITEMS, { id: 'sair', label: 'Sair', icon: 'log-out-outline' }];
  }

  return [...BASE_ITEMS];
}
