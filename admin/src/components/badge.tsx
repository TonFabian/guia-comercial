import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return <span className="inline-flex rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">{children}</span>;
}
