import type { DecorationBooking } from '@/lib/auth/types';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import { formatIndianCurrency } from '@/lib/decoration/dashboard-view';
import { getDecorationStatusMeta } from '@/lib/decoration/booking-view';

export function DecorationDaySidebar({ date, bookings, onClose, onAdd, onOpenBooking }: {
  date: string;
  bookings: DecorationBooking[];
  onClose: () => void;
  onAdd: () => void;
  onOpenBooking: (id: string) => void;
}) {
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/45" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={`Events on ${label}`} className="absolute inset-y-0 left-0 flex w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-2xl lg:max-w-5xl">
        <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-900">{label}</h2><p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 shadow-sm">{bookings.length} booking{bookings.length === 1 ? '' : 's'}</p></div><button type="button" onClick={onClose} aria-label="Close selected date" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 hover:bg-slate-50">×</button></div>
          <button type="button" onClick={onAdd} className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-white shadow-sm hover:bg-amber-600 sm:w-auto">Add inquiry</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-7">
          {bookings.length ? <div className="grid gap-4 md:grid-cols-2">{bookings.map((booking) => (
            <button type="button" key={booking.id} onClick={() => onOpenBooking(booking.id)} className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${getDecorationStatusMeta(booking.status).cardClass}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{booking.customer.name}</h3><p className="mt-1 truncate text-sm text-slate-600">{booking.functionName}</p></div><DecorationStatusBadge status={booking.status} /></div>
              <dl className="mt-4 space-y-2 text-sm"><div><dt className="inline font-bold text-slate-700">Venue: </dt><dd className="inline text-slate-600">{booking.venue.name}{booking.hall ? ` / ${booking.hall.name}` : ''}</dd></div><div><dt className="inline font-bold text-slate-700">Time: </dt><dd className="inline text-slate-600">{booking.startTime}–{booking.endTime} · {booking.timeSlot}</dd></div></dl>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-xs"><div><p className="text-slate-500">Package</p><p className="mt-1 font-bold text-slate-900">{formatIndianCurrency(booking.packageRate)}</p></div><div><p className="text-slate-500">Received</p><p className="mt-1 font-bold text-emerald-700">{formatIndianCurrency(booking.totalCollected)}</p></div><div><p className="text-slate-500">Pending</p><p className="mt-1 font-bold text-red-700">{formatIndianCurrency(booking.outstandingAmount)}</p></div></div>
            </button>
          ))}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><h3 className="font-bold text-slate-900">No events on this date</h3><p className="mt-2 text-sm text-slate-600">Create an inquiry to start planning this date.</p></div>}
        </div>
      </aside>
    </div>
  );
}
