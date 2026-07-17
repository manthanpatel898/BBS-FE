import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationStatusMeta } from '@/lib/decoration/booking-view';
import { groupDecorationBookingsByDate } from '@/lib/decoration/calendar';

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DecorationCalendar({ month, bookings, onMonthChange, onOpenDay }: {
  month: Date;
  bookings: DecorationBooking[];
  onMonthChange: (month: Date) => void;
  onOpenDay: (date: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const grouped = groupDecorationBookingsByDate(bookings);
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))} className="rounded-xl border border-slate-200 px-3 py-2 font-bold hover:bg-slate-50">←</button>
          <button type="button" onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50">Today</button>
        </div>
        <h2 className="text-lg font-black text-slate-950">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))} className="rounded-xl border border-slate-200 px-3 py-2 font-bold hover:bg-slate-50">→</button>
      </header>

      <div className="hidden flex-wrap gap-x-4 gap-y-2 border-b border-slate-100 px-6 py-3 sm:flex">
        {(['INQUIRY', 'CONFIRMED', 'DECORATION_SELECTION_PENDING', 'DECORATION_SELECTED', 'COMPLETED'] as const).map((status) => {
          const meta = getDecorationStatusMeta(status);
          return <span key={status} className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />{meta.label}</span>;
        })}
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-3">{day.slice(0, 1)}<span className="hidden sm:inline">{day.slice(1)}</span></div>)}
      </div>
      <div className="grid grid-cols-7 bg-slate-200 gap-px">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-20 bg-slate-50 sm:min-h-32" />;
          const key = dateKey(year, monthIndex, day);
          const rows = grouped.get(key) ?? [];
          return (
            <button key={key} type="button" onClick={() => onOpenDay(key)} className="group min-h-20 overflow-hidden bg-white p-1.5 text-left transition hover:bg-amber-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:min-h-32 sm:p-2" aria-label={`${day}, ${rows.length} events`}>
              <div className="flex items-center justify-between gap-1"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${key === todayKey ? 'bg-amber-500 text-white' : 'text-slate-700'}`}>{day}</span>{rows.length ? <span className="text-[10px] font-bold text-slate-500">{rows.length}</span> : null}</div>
              <div className="mt-1.5 space-y-1">
                {rows.slice(0, 3).map((booking) => {
                  const meta = getDecorationStatusMeta(booking.status);
                  return <div key={booking.id} className="flex items-center gap-1 rounded bg-slate-50 px-1 py-0.5 text-[9px] font-semibold text-slate-700 sm:text-[10px]"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} /><span className="truncate">{booking.customer.name}</span></div>;
                })}
                {rows.length > 3 ? <p className="px-1 text-[9px] font-bold text-amber-700">+{rows.length - 3} more</p> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
