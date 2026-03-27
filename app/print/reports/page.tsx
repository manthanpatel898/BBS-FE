import { Suspense } from 'react';
import { PrintReportsView } from './print-reports-view';

export default function PrintReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <PrintReportsView />
    </Suspense>
  );
}
