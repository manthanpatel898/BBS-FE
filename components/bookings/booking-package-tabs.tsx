'use client';

type PackageTab = {
  id: string;
  label: string;
  categoryName: string;
  pax: string;
  removable?: boolean;
};

type Props = {
  activeId: string;
  packages: PackageTab[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addDisabled?: boolean;
};

export function BookingPackageTabs({
  activeId,
  packages,
  onSelect,
  onAdd,
  onRemove,
  addDisabled = false,
}: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Meal packages">
      {packages.map((item) => {
        const selected = item.id === activeId;
        return (
          <div key={item.id} className="relative shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(item.id)}
              className={`min-w-[124px] rounded-xl border px-2.5 py-2 pr-7 text-left transition sm:min-w-[144px] sm:px-3 sm:pr-8 ${
                selected
                  ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className={`block text-[9px] font-bold uppercase tracking-[0.14em] ${selected ? 'text-amber-300' : 'text-amber-600'}`}>
                {item.label}
              </span>
              <span className="mt-0.5 block truncate text-xs font-bold sm:text-sm">
                {item.categoryName || 'Select category'}
              </span>
              <span className={`mt-0.5 block text-[10px] font-medium sm:text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                {item.pax ? `${item.pax} pax` : 'Pax pending'}
              </span>
            </button>
            {item.removable ? (
              <button
                type="button"
                aria-label={`Remove ${item.categoryName || 'additional'} package`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(item.id);
                }}
                className={`absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
                  selected
                    ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-red-300 hover:text-red-200'
                    : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                }`}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        aria-label="Add meal package"
        onClick={onAdd}
        disabled={addDisabled}
        className="inline-flex min-h-[60px] w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-amber-400 bg-amber-50 text-xl font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[64px] sm:w-11"
      >
        +
      </button>
    </div>
  );
}
