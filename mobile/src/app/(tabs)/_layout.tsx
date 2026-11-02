import AppTabs from '@/components/app-tabs';
import { useAuthGuard } from '@/features/auth/use-auth-guard';

/**
 * Layout das abas protegidas: o guard decide se o conteúdo fica visível.
 */
export default function TabsLayout() {
  useAuthGuard();

  return <AppTabs />;
}
