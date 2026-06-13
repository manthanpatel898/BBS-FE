'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrintTagsView } from './print-tags-view';

function PrintTagsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? undefined;
  const items = searchParams.get('items') ?? '';

  return <PrintTagsView orderId={id} selectedItemIds={items} />;
}

export default function PrintTagsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <PrintTagsContent />
    </Suspense>
  );
}
