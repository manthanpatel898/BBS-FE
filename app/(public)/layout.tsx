import { PublicLayout } from '@/components/layouts/public-layout';

export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
