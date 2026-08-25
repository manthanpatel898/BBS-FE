'use client';

import { SuperAdminRoute } from '@/components/auth/super-admin-route';
import { FeedbackManagementList } from '@/components/feedback/feedback-management-list';
import { Suspense } from 'react';

export default function FeedbackManagementPage() {
  return <SuperAdminRoute><Suspense fallback={<div className="p-8 text-center font-semibold text-slate-500">Loading feedback…</div>}><FeedbackManagementList /></Suspense></SuperAdminRoute>;
}
