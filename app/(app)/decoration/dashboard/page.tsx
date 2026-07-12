export default function DecorationDashboardPage() {
  return (
    <section className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
        Event Decoration
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your decoration operations dashboard is ready for the next implementation stage.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Today’s events', 'Upcoming confirmations', 'Pending followups', 'Pending payments'].map(
          (label) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">—</p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
