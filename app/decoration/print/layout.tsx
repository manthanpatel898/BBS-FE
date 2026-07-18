import { ProtectedRoute } from '@/components/auth/protected-route';

export default function DecorationPrintLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
