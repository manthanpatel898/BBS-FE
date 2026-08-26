'use client';

import { useState } from 'react';

type Solution = 'banquet' | 'decoration';

const solutions = {
  banquet: {
    eyebrow: 'Banquet Management',
    title: 'From first inquiry to final invoice',
    description:
      'Keep bookings, halls, menus, advances, follow-ups, reports, and invoices connected in one operational flow.',
    steps: [
      ['01', 'Capture the inquiry', 'Customer, event, pax, hall, slot and follow-up details.'],
      ['02', 'Plan the booking', 'Choose structured or flexible menus and manage multiple meal packages.'],
      ['03', 'Confirm and deliver', 'Collect advances, protect hall availability and generate polished documents.'],
    ],
    highlights: ['Hall & slot visibility', 'Menu and category builder', 'Tax invoices & reports'],
  },
  decoration: {
    eyebrow: 'Event Decoration Management',
    title: 'Plan every detail without spreadsheets',
    description:
      'Manage decoration inquiries, photo-led selections, availability, advances, follow-ups, and customer-ready proposals.',
    steps: [
      ['01', 'Capture the event', 'Customer, venue, event type, date, time, notes and expected budget.'],
      ['02', 'Build the decoration', 'Select catalog items or add custom photo notes with quantities and descriptions.'],
      ['03', 'Share the proposal', 'Track advances and download a consistent, branded decoration PDF.'],
    ],
    highlights: ['Photo-first selection', 'Inventory availability', 'Branded proposal PDFs'],
  },
} as const;

export function HomeSolutionSwitcher() {
  const [selected, setSelected] = useState<Solution>('banquet');
  const solution = solutions[selected];

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 p-2 sm:flex sm:justify-center sm:gap-3 sm:p-4" aria-label="ZenBooking solutions">
        {(['banquet', 'decoration'] as const).map((key) => (
          <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)} className={`rounded-2xl px-3 py-3 text-xs font-bold transition sm:px-7 sm:text-sm ${selected === key ? 'bg-slate-950 text-white shadow-lg' : 'bg-white text-slate-600 hover:text-slate-950'}`}>
            {solutions[key].eyebrow}
          </button>
        ))}
      </div>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.78fr_1.22fr] lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">{solution.eyebrow}</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{solution.title}</h3>
          <p className="mt-4 max-w-xl leading-7 text-slate-600">{solution.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {solution.highlights.map((highlight) => <span key={highlight} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{highlight}</span>)}
          </div>
        </div>

        <div className="grid gap-3">
          {solution.steps.map(([number, title, description]) => (
            <article key={number} className="group grid grid-cols-[42px_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-200 hover:bg-amber-50/50 sm:grid-cols-[54px_1fr] sm:p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white sm:h-12 sm:w-12">{number}</span>
              <div><h4 className="font-bold text-slate-950">{title}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
