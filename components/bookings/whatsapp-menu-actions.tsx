'use client';
import React from 'react';

export function WhatsappMenuActions(props: { restaurantEnabled: boolean; globallyAvailable: boolean; eligibleBooking: boolean; busy: boolean; sendEnabled?: boolean; onSave: () => void; onSaveAndSend: () => void }) {
  const showSend = props.restaurantEnabled && props.eligibleBooking;
  return <>
    <button type="button" disabled={props.busy} onClick={props.onSave} className="min-h-11 min-w-0 rounded-xl bg-amber-400 px-2 py-2 text-xs font-semibold leading-snug text-slate-950 transition hover:bg-amber-500 disabled:opacity-50 sm:px-3 sm:text-sm">Save category</button>
    {showSend ? <>
      <button type="button" disabled={props.busy || !props.globallyAvailable || props.sendEnabled === false} onClick={props.onSaveAndSend} className="min-h-11 min-w-0 rounded-xl border border-emerald-600 bg-white px-2 py-2 text-xs font-semibold leading-snug text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50 sm:px-3 sm:text-sm">Save &amp; send on WhatsApp</button>
      {!props.globallyAvailable ? <p className="col-span-full text-xs text-slate-600">WhatsApp sending is not active yet. You can still save the menu.</p> : null}
    </> : null}
  </>;
}
