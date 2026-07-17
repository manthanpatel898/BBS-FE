import type { DecorationBookingStatus } from '@/lib/auth/types';
import { getDecorationStatusMeta } from '@/lib/decoration/booking-view';

export function DecorationStatusBadge({
  status,
  showDot = true,
}: {
  status: DecorationBookingStatus;
  showDot?: boolean;
}) {
  const metadata = getDecorationStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${metadata.badgeClass}`}
    >
      {showDot ? (
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${metadata.dotClass}`}
        />
      ) : null}
      {metadata.label}
    </span>
  );
}
