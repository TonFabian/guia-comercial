import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
}

/** Etiqueta pequena usada em items de menu/listagens. */
export function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>;
}
