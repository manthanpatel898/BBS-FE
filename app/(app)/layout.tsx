import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AppLayout>
  );
}
