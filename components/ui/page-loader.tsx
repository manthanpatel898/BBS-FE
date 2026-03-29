/**
 * Shared animated loading components used across all pages.
 *
 * Usage:
 *   <PageLoader message="Loading bookings…" />          — full section spinner
 *   <TableLoader colSpan={5} message="Loading…" />      — inside <tbody>
 *   <SkeletonCards count={6} />                         — pulse card grid
 */

export function PageLoader({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-amber-400" />
        <div className="absolute inset-2 animate-ping rounded-full bg-amber-100 opacity-60" />
      </div>
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}

export function TableLoader({
  colSpan,
  message = 'Loading…',
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-amber-400" />
            <div className="absolute inset-2 animate-ping rounded-full bg-amber-100 opacity-60" />
          </div>
          <p className="text-sm font-medium text-slate-400">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm"
        />
      ))}
    </>
  );
}

export function SkeletonRows({ count = 5, cols = 5 }: { count?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-t border-slate-100">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
