import type { ReactNode } from 'react';
import { PageLoader, SkeletonCards } from '@/components/ui/page-loader';

export function DecorationPageLoading({
  message = 'Loading decoration information…',
  cardCount,
}: {
  message?: string;
  cardCount?: number;
}) {
  if (cardCount) {
    return (
      <div aria-busy="true" aria-label={message} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCards count={cardCount} />
      </div>
    );
  }

  return <PageLoader message={message} />;
}

export function DecorationPageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
      <p className="font-bold">Unable to load decoration information</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function DecorationPageEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
