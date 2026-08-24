'use client';

type CategoryChoice = {
  id: string;
  name: string;
  pricePerPlate: number;
};

type Props = {
  categoryId: string;
  categories: CategoryChoice[];
  pax: string;
  paxReadOnly?: boolean;
  customPrice: string;
  customPriceLocked: boolean;
  customPriceLockMessage?: string;
  startTime: string;
  endTime: string;
  showSchedule: boolean;
  onCategoryChange: (value: string) => void;
  onPaxChange: (value: string) => void;
  onCustomPriceChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
};

const fieldClassName =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:h-10 sm:text-sm';

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
      {label}
      {children}
    </label>
  );
}

export function BookingActivePackageEditor({
  categoryId,
  categories,
  pax,
  paxReadOnly = false,
  customPrice,
  customPriceLocked,
  customPriceLockMessage,
  startTime,
  endTime,
  showSchedule,
  onCategoryChange,
  onPaxChange,
  onCustomPriceChange,
  onStartTimeChange,
  onEndTimeChange,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
      <div className={`grid grid-cols-2 gap-2 ${showSchedule ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
        <div className="col-span-2 lg:col-span-2">
          <Field label="Category">
            <select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} className={fieldClassName}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({currency(category.pricePerPlate)})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Pax">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={pax}
            readOnly={paxReadOnly}
            onChange={(event) => onPaxChange(event.target.value)}
            className={`${fieldClassName} ${paxReadOnly ? 'bg-slate-100 text-slate-600' : ''}`}
          />
        </Field>
        <Field label="Custom price">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="Default"
            value={customPrice}
            disabled={customPriceLocked}
            onChange={(event) => onCustomPriceChange(event.target.value)}
            className={fieldClassName}
          />
        </Field>
        {showSchedule ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-2">
              <Field label="Start time">
                <input type="time" value={startTime} onChange={(event) => onStartTimeChange(event.target.value)} className={fieldClassName} />
              </Field>
              <Field label="End time">
                <input type="time" value={endTime} onChange={(event) => onEndTimeChange(event.target.value)} className={fieldClassName} />
              </Field>
          </div>
        ) : null}
      </div>
      {customPriceLocked && customPriceLockMessage ? (
        <p className="mt-2 text-xs text-slate-500">{customPriceLockMessage}</p>
      ) : null}
    </section>
  );
}
