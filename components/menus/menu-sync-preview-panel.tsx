import { MenuSyncPreview } from '@/lib/auth/types';

export function MenuSyncPreviewPanel({ preview }: { preview: MenuSyncPreview }) {
  const tiles = [
    ['New', preview.summary.create, 'border-blue-200 bg-blue-50 text-blue-800'],
    ['Updated', preview.summary.update, 'border-amber-200 bg-amber-50 text-amber-800'],
    ['Unchanged', preview.summary.unchanged, 'border-slate-200 bg-slate-50 text-slate-700'],
    ['Reactivated', preview.summary.reactivate, 'border-emerald-200 bg-emerald-50 text-emerald-800'],
    ['Deactivated', preview.summary.deactivate, 'border-red-200 bg-red-50 text-red-800'],
    ['Removed sections', preview.summary.removedSections, 'border-rose-200 bg-rose-50 text-rose-800'],
    ['Removed subitems', preview.summary.removedSubitems, 'border-rose-200 bg-rose-50 text-rose-800'],
  ] as const;
  const destructive = preview.summary.deactivate + preview.summary.removedSections + preview.summary.removedSubitems;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([label, value, className]) => (
          <div key={label} className={`rounded-xl border px-3 py-3 text-center ${className}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>
      {destructive > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Missing menus will be deactivated, and missing sections or subitems from included menus will be removed. Historical bookings remain unchanged.
        </div>
      ) : null}
      {preview.issues.length ? (
        <details open className="rounded-xl border border-red-200 bg-red-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-800">{preview.issues.length} issue{preview.issues.length === 1 ? '' : 's'} must be resolved</summary>
          <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-red-200 px-4 py-3 text-sm text-red-800">
            {preview.issues.map((entry, index) => <li key={`${entry.row}-${entry.code}-${index}`}><strong>Row {entry.row}:</strong> {entry.message}</li>)}
          </ul>
        </details>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Validation passed. The complete menu snapshot is ready to synchronize.</div>
      )}
    </div>
  );
}
