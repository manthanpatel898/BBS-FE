'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import { exportDecorationCrop } from '@/lib/decoration/image-crop';

type DecorationImageCropModalProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

const initialCrop: Point = { x: 0, y: 0 };

export function DecorationImageCropModal({
  file,
  busy = false,
  onCancel,
  onConfirm,
}: DecorationImageCropModalProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const closeBlocked = busy || processing;

  const requestClose = useCallback(() => {
    if (closeBlocked) return;
    onCancel();
  }, [closeBlocked, onCancel]);

  useModalViewport(requestClose, closeBlocked);

  useEffect(() => {
    const returnTrigger = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    return () => {
      returnTrigger?.focus();
    };
  }, []);

  useEffect(() => {
    const nextSourceUrl = URL.createObjectURL(file);
    setSourceUrl(nextSourceUrl);
    return () => {
      URL.revokeObjectURL(nextSourceUrl);
    };
  }, [file]);

  const reset = () => {
    setCrop(initialCrop);
    setZoom(1);
    setRotation(0);
    setError('');
  };

  const confirm = async () => {
    if (closeBlocked || !cropPixels) return;
    setProcessing(true);
    setError('');
    try {
      const croppedFile = await exportDecorationCrop(file, cropPixels, rotation);
      await onConfirm(croppedFile);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to crop this image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return <BodyPortal>
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decoration-crop-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="safe-pad-bottom flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-4xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-900 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Image editor</p>
            <h2 id="decoration-crop-title" className="text-xl font-bold text-white">Crop image</h2>
          </div>
          <button type="button" disabled={closeBlocked} onClick={requestClose} aria-label="Close image crop" className="h-11 w-11 rounded-full border border-white/20 text-2xl text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50">×</button>
        </header>

        <div className="relative min-h-0 flex-1 bg-black" style={{ touchAction: 'none' }}>
          {sourceUrl ? <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={4 / 3}
            minZoom={1}
            maxZoom={3}
            zoomWithScroll
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, pixels) => setCropPixels(pixels)}
          /> : null}
        </div>

        <div className="safe-pad-bottom shrink-0 space-y-4 border-t border-white/10 bg-slate-900 p-4 sm:p-6">
          {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          <label className="block text-sm font-semibold text-white">
            Zoom
            <input aria-label="Image zoom" type="range" min={1} max={3} step={0.01} value={zoom} disabled={closeBlocked} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 h-11 w-full accent-amber-400" />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <button type="button" disabled={closeBlocked} onClick={() => setRotation(current => (current + 90) % 360)} aria-label="Rotate image 90 degrees" className="min-h-11 rounded-xl border border-white/20 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50">Rotate 90°</button>
            <button type="button" disabled={closeBlocked} onClick={reset} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50">Reset</button>
            <button type="button" disabled={closeBlocked} onClick={requestClose} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50 sm:ml-auto">Cancel</button>
            <button type="button" disabled={closeBlocked || !cropPixels} onClick={() => void confirm()} className="min-h-11 rounded-xl bg-amber-400 px-5 py-2 font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">{processing ? 'Cropping…' : busy ? 'Please wait…' : 'Crop image'}</button>
          </div>
        </div>
      </div>
    </div>
  </BodyPortal>;
}
