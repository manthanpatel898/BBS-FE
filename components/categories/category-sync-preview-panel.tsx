import { CategorySyncPreview } from '@/lib/auth/types';

export function CategorySyncPreviewPanel({
  preview,
}: {
  preview: CategorySyncPreview;
}) {
  const tiles = [
    { label: 'New', value: preview.summary.create, className: 'border-blue-200 bg-blue-50 text-blue-800' },
    { label: 'Updated', value: preview.summary.update, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    { label: 'Unchanged', value: preview.summary.unchanged, className: 'border-slate-200 bg-slate-50 text-slate-700' },
    { label: 'Reactivated', value: preview.summary.reactivate, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { label: 'Deactivated', value: preview.summary.deactivate, className: 'border-red-200 bg-red-50 text-red-800' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Synchronization preview
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Review every change before updating the restaurant&apos;s categories.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`rounded-xl border px-3 py-3 text-center ${tile.className}`}
          >
            <p className="text-xl font-bold">{tile.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {preview.summary.deactivate > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>{preview.summary.deactivate} active categories will be deactivated.</strong>{' '}
          They are missing from the uploaded complete snapshot. Historical bookings remain unchanged.
        </div>
      ) : null}

      {preview.issues.length > 0 ? (
        <details open className="rounded-xl border border-red-200 bg-red-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-800">
            {preview.issues.length} issue{preview.issues.length === 1 ? '' : 's'} must be resolved
          </summary>
          <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-red-200 px-4 py-3 text-sm text-red-800">
            {preview.issues.map((item, index) => (
              <li key={`${item.row}-${item.code}-${index}`}>
                <strong>Row {item.row}:</strong> {item.message}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Validation passed. No duplicate or identity errors were found.
        </div>
      )}
    </div>
  );
}
