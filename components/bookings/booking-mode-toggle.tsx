'use client';

import Link from 'next/link';

type BookingMode = 'banquet' | 'odc';

type BookingModeToggleProps = {
  activeMode: BookingMode;
  showOdc?: boolean;
};

export function BookingModeToggle({ activeMode, showOdc = true }: BookingModeToggleProps) {
  if (!showOdc) return null;

  const linkBase =
    'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition';
  const activeClass = 'bg-amber-400 text-white shadow-sm';
  const inactiveClass = 'text-slate-600 hover:bg-slate-50';

  return (
    <nav
      data-booking-mode-toggle
      aria-label="Booking type"
      className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      <Link
        href="/bookings"
        aria-current={activeMode === 'banquet' ? 'page' : undefined}
        className={`${linkBase} ${activeMode === 'banquet' ? activeClass : inactiveClass}`}
      >
        Banquate
      </Link>
      <Link
        href="/odc/inquiries"
        aria-current={activeMode === 'odc' ? 'page' : undefined}
        className={`${linkBase} ${activeMode === 'odc' ? activeClass : inactiveClass}`}
      >
        ODC
      </Link>
    </nav>
  );
}
