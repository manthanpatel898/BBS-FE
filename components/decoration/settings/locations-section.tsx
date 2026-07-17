'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import { addDecorationHall, createDecorationVenue, fetchDecorationVenues, setDecorationHallActive, setDecorationVenueActive, updateDecorationHall, updateDecorationVenue } from '@/lib/auth/api';
import type { DecorationHall, DecorationLocationType, DecorationVenue } from '@/lib/auth/types';
import { configurationActionClass } from '@/lib/decoration/configuration-actions';
import { decorationLocationTypeLabel, hasNormalizedDuplicate, reconcileSelectedParentId } from '@/lib/decoration/settings-view';
import { ConfigurationModal, decorationSettingsInput } from './configuration-modal';

export function LocationsSection() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<DecorationVenue[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<DecorationVenue | 'new' | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<DecorationLocationType>('VENUE');
  const [address, setAddress] = useState('');
  const [initialHalls, setInitialHalls] = useState('');
  const [hallEditor, setHallEditor] = useState<{ venue: DecorationVenue; hall?: DecorationHall } | null>(null);
  const [hallName, setHallName] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const nextItems = await fetchDecorationVenues(accessToken, search, includeInactive);
      setItems(nextItems);
      setSelectedLocationId((current) => reconcileSelectedParentId(current, nextItems));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load banquets and outdoor venues.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, includeInactive]);

  useEffect(() => { void load(); }, [load]);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setError(''); setMessage('');
    try { await action(); setMessage(success); await load(); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed'); return false; }
    finally { setBusy(''); }
  }

  function open(item: DecorationVenue | 'new') {
    setEditor(item); setName(item === 'new' ? '' : item.name); setType(item === 'new' ? 'VENUE' : item.type);
    setAddress(item === 'new' ? '' : item.address ?? ''); setInitialHalls(''); setError('');
  }

  function openHall(venue: DecorationVenue, hall?: DecorationHall) {
    setHallEditor({ venue, hall }); setHallName(hall?.name ?? ''); setError('');
  }

  async function saveLocation(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editor) return;
    if (!name.trim()) { setError('Banquet or outdoor venue name is required.'); return; }
    if (hasNormalizedDuplicate(items, name, editor === 'new' ? undefined : editor.id)) { setError('Banquet or outdoor venue already exists.'); return; }
    const halls = initialHalls.split('\n').map((value) => value.trim()).filter(Boolean).map((hallNameValue) => ({ name: hallNameValue }));
    const ok = await run('location-form', () => editor === 'new'
      ? createDecorationVenue(accessToken, { name, type, address: address || undefined, halls })
      : updateDecorationVenue(accessToken, editor.id, { name, type, address }), editor === 'new' ? 'Location created.' : 'Location updated.');
    if (ok) setEditor(null);
  }

  async function saveHall(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !hallEditor) return;
    if (!hallName.trim()) { setError('Hall name is required.'); return; }
    if (hasNormalizedDuplicate(hallEditor.venue.halls, hallName, hallEditor.hall?.id)) { setError('Hall already exists for this location.'); return; }
    const ok = await run('hall-form', () => hallEditor.hall
      ? updateDecorationHall(accessToken, hallEditor.venue.id, hallEditor.hall.id, hallName)
      : addDecorationHall(accessToken, hallEditor.venue.id, hallName), hallEditor.hall ? 'Hall updated.' : 'Hall added.');
    if (ok) setHallEditor(null);
  }

  const selectedLocation = items.find((item) => item.id === selectedLocationId);

  return <section className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{selectedLocation ? <button type="button" onClick={() => setSelectedLocationId('')} className="mb-2 inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800">← Back to Locations</button> : null}<h2 className="text-xl font-bold text-slate-950">{selectedLocation ? selectedLocation.name : 'Banquets & Outdoor Venues'}</h2><p className="mt-1 text-sm text-slate-600">{selectedLocation ? 'Manage the halls configured for this location.' : 'Open a location to view and manage its halls.'}</p></div>{selectedLocation ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => open(selectedLocation)} className={configurationActionClass('edit')}>Edit location</button><button type="button" onClick={() => openHall(selectedLocation)} className={configurationActionClass('add')}>Add hall</button></div> : <button type="button" onClick={() => open('new')} className="min-h-11 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950">Add banquet / outdoor venue</button>}</div>
    {!selectedLocation ? <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search banquets and outdoor venues" className={decorationSettingsInput}/><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)}/>Show inactive</label></div> : null}
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
    {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">Loading locations…</p> : selectedLocation ? <LocationDetail location={selectedLocation} accessToken={accessToken} busy={busy} onEditHall={(hall) => openHall(selectedLocation, hall)} onToggleHall={(hall) => accessToken && void run(hall.id, () => setDecorationHallActive(accessToken, selectedLocation.id, hall.id, !hall.isActive), `Hall ${hall.isActive ? 'deactivated' : 'activated'}.`)} onToggleLocation={() => accessToken && void run(selectedLocation.id, () => setDecorationVenueActive(accessToken, selectedLocation.id, !selectedLocation.isActive), `${decorationLocationTypeLabel(selectedLocation.type)} ${selectedLocation.isActive ? 'deactivated' : 'activated'}.`)} /> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <LocationCard key={item.id} item={item} onOpen={() => setSelectedLocationId(item.id)} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">No matching banquets or outdoor venues found.</p>}
    {editor ? <ConfigurationModal title={editor === 'new' ? 'Add banquet / outdoor venue' : 'Edit banquet / outdoor venue'} onClose={() => setEditor(null)}><form onSubmit={saveLocation} className="space-y-4"><label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Type</span><select value={type} onChange={(event) => setType(event.target.value as DecorationLocationType)} className={decorationSettingsInput}><option value="HOTEL">Banquet</option><option value="VENUE">Outdoor Venue</option></select></label><label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Name</span><input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} className={decorationSettingsInput}/></label><label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Address (optional)</span><textarea maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className={decorationSettingsInput}/></label>{editor === 'new' ? <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Initial halls (optional, one per line)</span><textarea rows={4} value={initialHalls} onChange={(event) => setInitialHalls(event.target.value)} className={decorationSettingsInput}/></label> : null}<LoadingButton isLoading={busy === 'location-form'} className="w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950">Save location</LoadingButton></form></ConfigurationModal> : null}
    {hallEditor ? <ConfigurationModal title={hallEditor.hall ? 'Edit hall' : 'Add hall'} description={hallEditor.venue.name} onClose={() => setHallEditor(null)}><form onSubmit={saveHall} className="space-y-4"><label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Hall Name / Number</span><input autoFocus required maxLength={100} value={hallName} onChange={(event) => setHallName(event.target.value)} className={decorationSettingsInput}/></label><LoadingButton isLoading={busy === 'hall-form'} className="w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950">Save hall</LoadingButton></form></ConfigurationModal> : null}
  </section>;
}

function LocationCard({ item, onOpen }: { item: DecorationVenue; onOpen: () => void }) {
  return <article className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${item.isActive ? '' : 'opacity-70'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{item.name}</h3><p className="mt-1 text-sm text-slate-600">{decorationLocationTypeLabel(item.type)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.address || 'No address provided'}</p><p className="mt-2 text-sm font-semibold text-slate-700">{item.halls.length} {item.halls.length === 1 ? 'hall' : 'halls'}</p><button type="button" onClick={onOpen} className="mt-4 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Open Location</button></article>;
}

function LocationDetail({ location: selectedLocation, accessToken, busy, onEditHall, onToggleHall, onToggleLocation }: { location: DecorationVenue; accessToken: string | null; busy: string; onEditHall: (hall: DecorationHall) => void; onToggleHall: (hall: DecorationHall) => void; onToggleLocation: () => void }) {
  return <div className="space-y-4"><article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-950">{decorationLocationTypeLabel(selectedLocation.type)}</p><p className="mt-1 text-sm text-slate-600">{selectedLocation.address || 'No address provided'}</p></div><button type="button" disabled={!accessToken || busy === selectedLocation.id} onClick={onToggleLocation} className={configurationActionClass(selectedLocation.isActive ? 'deactivate' : 'activate', busy === selectedLocation.id)}>{busy === selectedLocation.id ? 'Saving…' : selectedLocation.isActive ? 'Deactivate' : 'Activate'}</button></div></article>{selectedLocation.halls.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selectedLocation.halls.map((hall) => <article key={hall.id} className={`rounded-xl border p-4 ${hall.isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><h3 className={`font-bold ${hall.isActive ? 'text-emerald-900' : 'text-slate-800'}`}>{hall.name}</h3><span className="text-xs font-bold text-slate-600">{hall.isActive ? 'Active' : 'Inactive'}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => onEditHall(hall)} className={configurationActionClass('edit')}>Edit</button><button type="button" disabled={busy === hall.id} onClick={() => onToggleHall(hall)} className={configurationActionClass(hall.isActive ? 'deactivate' : 'activate', busy === hall.id)}>{busy === hall.id ? 'Saving…' : hall.isActive ? 'Deactivate' : 'Activate'}</button></div></article>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No halls configured. Halls are optional for outdoor venues.</p>}</div>;
}
