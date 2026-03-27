import { Suspense } from 'react';
import { PrintOrderView } from './print-order-view';

export default async function PrintOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; copy?: string }>;
}) {
  const { id, copy } = await searchParams;

  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <PrintOrderView orderId={id} copyType={copy} />
    </Suspense>
  );
}
