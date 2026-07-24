'use client';

import { useState } from 'react';
import type { DecorationSnapshotLine } from '@/lib/auth/types';
import { orderedSnapshotGroups, safeSnapshotImage, snapshotItemKey } from '@/lib/decoration/snapshot-view';

function ImageFallback({ line, large = false }: { line: DecorationSnapshotLine; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = failed ? null : safeSnapshotImage(line.image);
  const size = large ? 'h-full min-h-72 w-full' : 'aspect-[4/3] w-full';
  if (!source) return <div className={`${size} grid place-items-center bg-slate-100 px-4 text-center text-sm font-medium text-slate-400`} role="img" aria-label={`No image available for ${line.itemName}`}>Image unavailable</div>;
  return <img src={source} alt={line.itemName} className={`${size} object-cover`} loading="lazy" onError={() => setFailed(true)} />;
}

export function DecorationSnapshotGallery({ lines, printable = false, internal = false }: { lines: DecorationSnapshotLine[]; printable?: boolean; internal?: boolean }) {
  const [selected, setSelected] = useState<DecorationSnapshotLine | null>(null);
  const groups = orderedSnapshotGroups(lines);
  if (!lines.length) return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Decoration has not been selected for this event.</div>;
  return <div className="space-y-7 text-slate-900">
    {groups.map(({ key, category, items }) => <section key={key} className="decoration-print-group break-inside-avoid">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{category}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{items.length} {items.length === 1 ? 'item' : 'items'}</span></div>
      <div className={`grid gap-4 ${printable ? 'grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {items.map((line, index) => <article key={snapshotItemKey(line, index)} className="decoration-print-item overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button type="button" className="block w-full overflow-hidden text-left print:pointer-events-none" onClick={() => !printable && setSelected(line)} aria-label={`View ${line.itemName} image`} disabled={printable}><ImageFallback line={line} /></button>
          <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h4 className="font-bold text-slate-900">{line.itemName}</h4>{line.isCustom && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Custom</span>}</div><p className="text-sm font-semibold text-slate-600">Quantity: {line.quantity}</p>{line.description ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{line.description}</p> : <p className="text-sm italic text-slate-400">No description</p>}{internal && line.logisticsMode && <div className="border-t pt-2 text-xs text-slate-500"><p>Logistics: {line.logisticsMode.replaceAll('_', ' ')}</p>{line.rangeStart && line.rangeEnd && <p className="mt-1">Reserved: {new Date(line.rangeStart).toLocaleString('en-IN')} – {new Date(line.rangeEnd).toLocaleString('en-IN')}</p>}</div>}</div>
        </article>)}
      </div>
    </section>)}
    {selected && <div className="fixed inset-0 z-50 grid bg-slate-950/90 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={`${selected.itemName} preview`} onClick={() => setSelected(null)}><div className="m-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4"><div><p className="font-bold text-slate-900">{selected.itemName}</p><p className="text-sm text-slate-500">Quantity: {selected.quantity}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" aria-label="Close image preview">Close</button></div><div className="min-h-0 flex-1 overflow-auto bg-slate-100"><ImageFallback line={selected} large /></div>{selected.description && <p className="border-t border-slate-200 bg-white p-4 text-sm text-slate-600">{selected.description}</p>}</div></div>}
  </div>;
}
