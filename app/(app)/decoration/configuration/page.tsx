'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  addDecorationHall,
  createDecorationEventType,
  createDecorationVenue,
  fetchDecorationEventTypes,
  fetchDecorationVenues,
  setDecorationEventTypeActive,
  setDecorationHallActive,
  setDecorationVenueActive,
  updateDecorationEventType,
  updateDecorationHall,
  updateDecorationVenue,
} from '@/lib/auth/api';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { DecorationEventType, DecorationHall, DecorationVenue } from '@/lib/auth/types';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

export default function DecorationConfigurationPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Configuration' });
  const { accessToken, user } = useAuth();
  const canManage = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_CONFIGURATION_MANAGE);
  const [tab, setTab] = useState<'events' | 'venues'>('events');
  const [events, setEvents] = useState<DecorationEventType[]>([]);
  const [venues, setVenues] = useState<DecorationVenue[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [eventModal, setEventModal] = useState<DecorationEventType | 'new' | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventOrder, setEventOrder] = useState('0');
  const [venueModal, setVenueModal] = useState<DecorationVenue | 'new' | null>(null);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [initialHalls, setInitialHalls] = useState('');
  const [hallEditor, setHallEditor] = useState<{ venue: DecorationVenue; hall?: DecorationHall } | null>(null);
  const [hallName, setHallName] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [eventData, venueData] = await Promise.all([
        fetchDecorationEventTypes(accessToken, search, includeInactive),
        fetchDecorationVenues(accessToken, search, includeInactive),
      ]);
      setEvents(eventData);
      setVenues(venueData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load configuration.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, includeInactive, search]);

  useEffect(() => { void load(); }, [load]);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setError(''); setMessage('');
    try { await action(); setMessage(success); await load(); return true; }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Request failed.'); return false; }
    finally { setBusy(''); }
  }

  function openEvent(item: DecorationEventType | 'new') {
    setEventModal(item); setEventName(item === 'new' ? '' : item.name); setEventOrder(item === 'new' ? '0' : String(item.displayOrder));
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault(); if (!accessToken || !eventModal) return;
    const saved = await run('event-form', () => eventModal === 'new'
      ? createDecorationEventType(accessToken, { name: eventName, displayOrder: Number(eventOrder) })
      : updateDecorationEventType(accessToken, eventModal.id, { name: eventName, displayOrder: Number(eventOrder) }),
    eventModal === 'new' ? 'Event type created.' : 'Event type updated.');
    if (saved) setEventModal(null);
  }

  function openVenue(item: DecorationVenue | 'new') {
    setVenueModal(item); setVenueName(item === 'new' ? '' : item.name); setVenueAddress(item === 'new' ? '' : item.address ?? ''); setInitialHalls('');
  }

  async function saveVenue(event: FormEvent) {
    event.preventDefault(); if (!accessToken || !venueModal) return;
    const halls = initialHalls.split('\n').map((name) => name.trim()).filter(Boolean).map((name) => ({ name }));
    const saved = await run('venue-form', () => venueModal === 'new'
      ? createDecorationVenue(accessToken, { name: venueName, address: venueAddress, halls })
      : updateDecorationVenue(accessToken, venueModal.id, { name: venueName, address: venueAddress }),
    venueModal === 'new' ? 'Venue created.' : 'Venue updated.');
    if (saved) setVenueModal(null);
  }

  async function saveHall(event: FormEvent) {
    event.preventDefault(); if (!accessToken || !hallEditor) return;
    const saved = await run('hall-form', () => hallEditor.hall
      ? updateDecorationHall(accessToken, hallEditor.venue.id, hallEditor.hall.id, hallName)
      : addDecorationHall(accessToken, hallEditor.venue.id, hallName),
    hallEditor.hall ? 'Hall updated.' : 'Hall added.');
    if (saved) setHallEditor(null);
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Decoration Configuration</h1><p className="mt-1 text-sm text-slate-500">Manage event types, hotels, venues and their halls.</p></div>
        {canManage && <button onClick={() => tab === 'events' ? openEvent('new') : openVenue('new')} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">Add {tab === 'events' ? 'event type' : 'venue'}</button>}
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['events', 'venues'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item === 'events' ? 'Event Types' : 'Venues & Halls'}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search configuration" className={inputClass} />
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show inactive</label>
      </div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading configuration…</p> : tab === 'events' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{item.name}</h2><p className="mt-1 text-xs text-slate-500">Display order: {item.displayOrder}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div>{canManage && <div className="mt-4 flex gap-2"><button onClick={() => openEvent(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit</button><button disabled={busy === item.id} onClick={() => accessToken && run(item.id, () => setDecorationEventTypeActive(accessToken, item.id, !item.isActive), `Event type ${item.isActive ? 'deactivated' : 'activated'}.`)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{item.isActive ? 'Deactivate' : 'Activate'}</button></div>}</article>)}</div>
      ) : (
        <div className="space-y-4">{venues.map((venue) => <article key={venue.id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${venue.isActive ? '' : 'opacity-60'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold text-slate-900">{venue.name}</h2><p className="mt-1 text-sm text-slate-500">{venue.address || 'No address provided'}</p></div>{canManage && <div className="flex flex-wrap gap-2"><button onClick={() => openVenue(venue)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => { setHallEditor({ venue }); setHallName(''); }} className="rounded-lg border px-3 py-2 text-xs font-semibold">Add hall</button><button onClick={() => accessToken && run(venue.id, () => setDecorationVenueActive(accessToken, venue.id, !venue.isActive), `Venue ${venue.isActive ? 'deactivated' : 'activated'}.`)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{venue.isActive ? 'Deactivate' : 'Activate'}</button></div>}</div><div className="mt-4 flex flex-wrap gap-2">{venue.halls.length ? venue.halls.map((hall) => <button key={hall.id} disabled={!canManage} onClick={() => { if (canManage) { setHallEditor({ venue, hall }); setHallName(hall.name); } }} className={`rounded-full border px-3 py-1.5 text-xs ${hall.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500 line-through'}`}>{hall.name}</button>) : <p className="text-sm text-slate-400">No halls configured.</p>}</div>{canManage && venue.halls.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{venue.halls.map((hall) => <button key={hall.id} onClick={() => accessToken && run(hall.id, () => setDecorationHallActive(accessToken, venue.id, hall.id, !hall.isActive), `Hall ${hall.isActive ? 'deactivated' : 'activated'}.`)} className="text-xs font-medium text-slate-500 underline">{hall.isActive ? `Deactivate ${hall.name}` : `Activate ${hall.name}`}</button>)}</div>}</article>)}</div>
      )}
      {!loading && (tab === 'events' ? events.length === 0 : venues.length === 0) && <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No matching records found.</p>}
      {eventModal && <CommonModal title={eventModal === 'new' ? 'Add event type' : 'Edit event type'} onClose={() => setEventModal(null)} widthClassName="max-w-lg"><form onSubmit={saveEvent} className="space-y-4"><input value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={100} required placeholder="Event type name" className={inputClass} /><input value={eventOrder} onChange={(e) => setEventOrder(e.target.value)} min="0" type="number" required placeholder="Display order" className={inputClass} /><LoadingButton isLoading={busy === 'event-form'} className="w-full">Save event type</LoadingButton></form></CommonModal>}
      {venueModal && <CommonModal title={venueModal === 'new' ? 'Add venue' : 'Edit venue'} onClose={() => setVenueModal(null)} widthClassName="max-w-lg"><form onSubmit={saveVenue} className="space-y-4"><input value={venueName} onChange={(e) => setVenueName(e.target.value)} maxLength={150} required placeholder="Hotel or venue name" className={inputClass} /><textarea value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} maxLength={500} placeholder="Address (optional)" className={inputClass} />{venueModal === 'new' && <textarea value={initialHalls} onChange={(e) => setInitialHalls(e.target.value)} placeholder={'Hall names (one per line)\nGrand Hall\nGarden Area'} className={inputClass} rows={4} />}<LoadingButton isLoading={busy === 'venue-form'} className="w-full">Save venue</LoadingButton></form></CommonModal>}
      {hallEditor && <CommonModal title={hallEditor.hall ? 'Edit hall' : 'Add hall'} description={hallEditor.venue.name} onClose={() => setHallEditor(null)} widthClassName="max-w-lg"><form onSubmit={saveHall} className="space-y-4"><input value={hallName} onChange={(e) => setHallName(e.target.value)} maxLength={100} required placeholder="Hall name" className={inputClass} /><LoadingButton isLoading={busy === 'hall-form'} className="w-full">Save hall</LoadingButton></form></CommonModal>}
    </section>
  );
}
