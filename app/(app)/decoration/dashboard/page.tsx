'use client';

import { DecorationDashboard } from '@/components/decoration/decoration-dashboard';
import { useAppPageHeader } from '@/components/layouts/app-layout';

export default function DecorationDashboardPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Operations Dashboard' });
  return <DecorationDashboard />;
}
