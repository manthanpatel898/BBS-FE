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
    <div className="modal-viewport-pad fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <div
        className={`modal-panel-height safe-pad-bottom relative w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 ${widthClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:right-6 sm:top-6"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col gap-4 pr-12 sm:pr-14">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Banquate Booking System
            </p>
            <h2 className="mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
