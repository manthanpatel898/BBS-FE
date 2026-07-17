'use client';

import { DecorationWorkspace } from '@/components/decoration/decoration-workspace';
import { useAppPageHeader } from '@/components/layouts/app-layout';

export default function DecorationEventsPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Events & Inquiries' });
  return <DecorationWorkspace />;
}
