'use client';

export function CommonModal({
  title,
  description,
  children,
  onClose,
  widthClassName = 'max-w-3xl',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 ${widthClassName}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Banquate Booking System
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
