export default function AccessDeniedPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl items-center p-6 text-center">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">Access restricted</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">No module access assigned</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is active, but no Event Decoration permissions are assigned. Contact your company administrator.
        </p>
      </div>
    </section>
  );
}
