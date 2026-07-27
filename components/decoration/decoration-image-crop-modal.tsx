'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import { exportDecorationCrop } from '@/lib/decoration/image-crop';

export type DecorationCropperAdapterProps = {
  image: string;
  crop: Point;
  zoom: number;
  rotation: number;
  aspect: number;
  minZoom: number;
  maxZoom: number;
  zoomWithScroll: boolean;
  onCropChange: (crop: Point) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (area: Area, pixels: Area) => void;
};

type DecorationImageCropModalProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Test seam for exercising modal behavior without browser image layout. */
  CropperComponent?: ComponentType<DecorationCropperAdapterProps>;
  /** Test seam for exercising asynchronous export behavior. */
  exportCrop?: typeof exportDecorationCrop;
};

const initialCrop: Point = { x: 0, y: 0 };
const DefaultCropper = (props: DecorationCropperAdapterProps) => <Cropper {...props} />;

export function DecorationImageCropModal({
  file,
  busy = false,
  onCancel,
  onConfirm,
  returnFocusRef,
  CropperComponent = DefaultCropper,
  exportCrop = exportDecorationCrop,
}: DecorationImageCropModalProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'FULL' | 'CROP' | null>(null);
  const [error, setError] = useState('');
  const [currentFile, setCurrentFile] = useState(file);
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);
  const activeFileRef = useRef<File | null>(file);
  const closeBlocked = busy || processing;

  if (currentFile !== file) {
    setCurrentFile(file);
    setCrop(initialCrop);
    setZoom(1);
    setRotation(0);
    setCropPixels(null);
    setProcessing(false);
    setProcessingMode(null);
    setError('');
  }

  const requestClose = useCallback(() => {
    if (closeBlocked) return;
    onCancel();
  }, [closeBlocked, onCancel]);

  useModalViewport(requestClose, closeBlocked);

  useEffect(() => {
    const fallbackTrigger = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
    return () => {
      (returnFocusRef?.current ?? fallbackTrigger)?.focus();
      queueMicrotask(() => returnFocusRef?.current?.focus());
    };
  }, [returnFocusRef]);

  useEffect(() => {
    const dialog = dialogElement;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button, input, [tabindex]',
    )).filter(control => !control.hasAttribute('disabled') && control.tabIndex >= 0);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, [dialogElement]);

  useEffect(() => {
    activeFileRef.current = file;
    return () => {
      if (activeFileRef.current === file) activeFileRef.current = null;
    };
  }, [file]);

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
    const confirmingFile = file;
    setProcessing(true);
    setProcessingMode('CROP');
    setError('');
    try {
      const croppedFile = await exportCrop(file, cropPixels, rotation);
      if (activeFileRef.current !== confirmingFile) return;
      await onConfirm(croppedFile);
    } catch (reason) {
      if (activeFileRef.current !== confirmingFile) return;
      setError(reason instanceof Error ? reason.message : 'Unable to crop this image. Please try again.');
    } finally {
      if (activeFileRef.current === confirmingFile) {
        setProcessing(false);
        setProcessingMode(null);
      }
    }
  };

  const confirmFullImage = async () => {
    if (closeBlocked) return;
    const confirmingFile = file;
    setProcessing(true);
    setProcessingMode('FULL');
    setError('');
    try {
      await onConfirm(file);
    } catch (reason) {
      if (activeFileRef.current !== confirmingFile) return;
      setError(reason instanceof Error ? reason.message : 'Unable to use this image. Please try again.');
    } finally {
      if (activeFileRef.current === confirmingFile) {
        setProcessing(false);
        setProcessingMode(null);
      }
    }
  };

  return <BodyPortal>
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      ref={setDialogElement}
      aria-modal="true"
      aria-labelledby="decoration-crop-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-4xl sm:overflow-hidden sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-900 px-4 py-3 sm:static sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Image editor</p>
            <h2 id="decoration-crop-title" className="text-xl font-bold text-white">Crop image</h2>
          </div>
          <button type="button" disabled={closeBlocked} onClick={requestClose} aria-label="Close image crop" className="h-11 w-11 rounded-full border border-white/20 text-2xl text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50">×</button>
        </header>

        <div
          className="relative h-[clamp(15rem,48dvh,32rem)] min-h-[15rem] shrink-0 bg-black sm:h-auto sm:min-h-[20rem] sm:flex-1"
          data-testid="decoration-crop-viewport"
          style={{ touchAction: 'none' }}
        >
          {sourceUrl ? <CropperComponent
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
            <button type="button" disabled={closeBlocked} onClick={() => void confirmFullImage()} className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">{processingMode === 'FULL' ? 'Using image…' : 'Use Full Image'}</button>
            <button type="button" aria-label="Crop image" disabled={closeBlocked || !cropPixels} onClick={() => void confirm()} className="min-h-11 rounded-xl bg-amber-400 px-5 py-2 font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">{processingMode === 'CROP' ? 'Cropping…' : busy ? 'Please wait…' : 'Crop & Use'}</button>
          </div>
        </div>
      </div>
    </div>
  </BodyPortal>;
}
