'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrintOrderView } from './print-order-view';

function PrintOrderContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? undefined;
  const copy = searchParams.get('copy') ?? undefined;

  return <PrintOrderView orderId={id} copyType={copy} />;
}

export default function PrintOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <PrintOrderContent />
    </Suspense>
  );
}
