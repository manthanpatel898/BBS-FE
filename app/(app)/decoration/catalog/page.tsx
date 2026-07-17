'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DecorationCatalogCompatibilityPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/decoration/settings?tab=decoration'); }, [router]);
  return <main className="mx-auto max-w-xl p-10 text-center"><h1 className="text-xl font-bold text-slate-950">Opening Decoration Settings…</h1><p className="mt-2 text-sm text-slate-500">Catalog and inventory are now managed from Settings.</p></main>;
}
