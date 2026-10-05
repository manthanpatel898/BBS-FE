'use client';
import React from 'react';

export function WhatsappMenuActions(props: { restaurantEnabled: boolean; globallyAvailable: boolean; eligibleBooking: boolean; busy: boolean; onSave: () => void; onSaveAndSend: () => void }) {
  const showSend = props.restaurantEnabled && props.eligibleBooking;
  return <div className="flex min-w-0 flex-col gap-2">
    <button type="button" disabled={props.busy} onClick={props.onSave} className="min-h-11 rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Save category</button>
    {showSend ? <>
      <button type="button" disabled={props.busy || !props.globallyAvailable} onClick={props.onSaveAndSend} className="min-h-11 rounded-xl border border-emerald-600 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50">Save &amp; send on WhatsApp</button>
      {!props.globallyAvailable ? <p className="text-xs text-slate-600">WhatsApp sending is not active yet. You can still save the menu.</p> : null}
    </> : null}
  </div>;
}
