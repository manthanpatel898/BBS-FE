export function DecorationGeneralNotes({
  value,
  disabled,
  error,
  onChange,
}: {
  value: string;
  disabled: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <label className="block font-bold text-slate-950" htmlFor="decoration-general-notes">General Notes <span className="font-normal text-slate-500">(optional)</span></label>
    <p className="mt-1 text-xs text-slate-500">Instructions applying to the complete event setup.</p>
    <textarea id="decoration-general-notes" rows={4} maxLength={5000} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="light-form-field mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 placeholder:text-slate-400" placeholder="Add common setup or coordination notes…" />
    <div className="mt-1 flex justify-between gap-3 text-xs"><span className="text-red-600">{error}</span><span className="ml-auto text-slate-500">{value.length} / 5000</span></div>
  </section>;
}
