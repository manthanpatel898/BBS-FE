'use client';

export function CommonModal({
  title,
  description,
  children,
  onClose,
  widthClassName = 'max-w-3xl',
  zIndexClassName = 'z-50',
  panelClassName = '',
  contentClassName = '',
  mobileFullScreen = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
  zIndexClassName?: string;
  panelClassName?: string;
  contentClassName?: string;
  mobileFullScreen?: boolean;
}) {
  const viewportClassName = mobileFullScreen
    ? 'p-0 sm:px-4 sm:py-6'
    : 'modal-viewport-pad px-3 sm:px-4 sm:py-6';
  const panelHeightClassName = mobileFullScreen
    ? 'flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none border-x-0 border-y-0 p-0 sm:modal-panel-height sm:h-auto sm:rounded-2xl sm:border sm:p-6'
    : 'modal-panel-height overflow-y-auto rounded-2xl border p-4 sm:p-6';

  return (
    <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-slate-900/50 backdrop-blur-sm ${viewportClassName}`}>
      <div
        data-mobile-full-screen={mobileFullScreen ? 'true' : undefined}
        className={`safe-pad-bottom app-scrollbar relative w-full border-slate-200 bg-white text-slate-950 shadow-2xl ${panelHeightClassName} ${widthClassName} ${panelClassName}`}
      >
        <div className={`relative shrink-0 ${mobileFullScreen ? 'border-b border-slate-200 p-4 sm:border-b-0 sm:p-0' : ''}`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:right-0 sm:top-0"
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
                <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className={`${mobileFullScreen ? 'app-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:mt-6 sm:p-0' : 'mt-6'} ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
