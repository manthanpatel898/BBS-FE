import { useEffect, useState, type ReactNode } from 'react';

type DownloadController = { start(): Promise<void> | false; abort(): void };

export function BookingDownloadLifecycle({
  controllerFactory,
  children,
}: {
  controllerFactory: (callbacks: {
    onBusy: (busy: boolean) => void;
    onError: (error: string) => void;
  }) => DownloadController;
  children: (state: { busy: boolean; error: string; start: () => void }) => ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [controller] = useState(() => controllerFactory({ onBusy: setBusy, onError: setError }));

  useEffect(() => () => controller.abort(), [controller]);

  return children({ busy, error, start: () => { controller.start(); } });
}
