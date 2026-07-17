export type CropRotation = 0 | 90 | 180 | 270;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropPixels extends ImageDimensions {
  x: number;
  y: number;
}

export interface CropOutputPlan {
  rotation: CropRotation;
  rotatedWidth: number;
  rotatedHeight: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
}

interface CropBitmap extends ImageDimensions {
  close?: () => void;
}

interface CropCanvasContext {
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  drawImage(...args: unknown[]): void;
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray };
}

interface CropCanvas extends ImageDimensions {
  getContext(type: '2d', options?: { willReadFrequently?: boolean }): CropCanvasContext | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
  release?: () => void;
}

export interface DecorationCropAdapters {
  decodeBitmap(file: File, options: { imageOrientation: 'from-image' }): Promise<CropBitmap>;
  createCanvas(width: number, height: number): CropCanvas;
}

const CROP_ASPECT = 4 / 3;
const DEFAULT_MAX = { width: 1600, height: 1200 };

const positiveFinite = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid image ${label}.`);
  return value;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum);

export function normalizeCropRotation(value: number): CropRotation {
  if (!Number.isFinite(value)) return 0;
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  return normalized as CropRotation;
}

export function calculateCropOutput(
  source: ImageDimensions,
  crop: CropPixels,
  rotation: number,
  max: ImageDimensions = DEFAULT_MAX,
): CropOutputPlan {
  const sourceWidth = positiveFinite(source.width, 'width');
  const sourceHeight = positiveFinite(source.height, 'height');
  const maxWidth = positiveFinite(max.width, 'output width');
  const maxHeight = positiveFinite(max.height, 'output height');
  const normalizedRotation = normalizeCropRotation(rotation);
  const swapsDimensions = normalizedRotation === 90 || normalizedRotation === 270;
  const rotatedWidth = swapsDimensions ? sourceHeight : sourceWidth;
  const rotatedHeight = swapsDimensions ? sourceWidth : sourceHeight;

  let cropWidth = Math.min(positiveFinite(crop.width, 'crop width'), rotatedWidth);
  let cropHeight = Math.min(positiveFinite(crop.height, 'crop height'), rotatedHeight);
  if (cropWidth / cropHeight > CROP_ASPECT) cropWidth = cropHeight * CROP_ASPECT;
  else cropHeight = cropWidth / CROP_ASPECT;
  if (cropHeight > rotatedHeight) {
    cropHeight = rotatedHeight;
    cropWidth = cropHeight * CROP_ASPECT;
  }
  if (cropWidth > rotatedWidth) {
    cropWidth = rotatedWidth;
    cropHeight = cropWidth / CROP_ASPECT;
  }

  const scale = Math.min(1, maxWidth / cropWidth, maxHeight / cropHeight);
  return {
    rotation: normalizedRotation,
    rotatedWidth,
    rotatedHeight,
    sourceX: clamp(crop.x, 0, rotatedWidth - cropWidth),
    sourceY: clamp(crop.y, 0, rotatedHeight - cropHeight),
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    outputWidth: Math.max(1, Math.round(cropWidth * scale)),
    outputHeight: Math.max(1, Math.round(cropHeight * scale)),
  };
}

export function createDecorationCropFilename(originalName: string, mimeType: 'image/png' | 'image/jpeg') {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const lastSegment = originalName.split(/[/\\]/).pop() ?? '';
  const stem = lastSegment.replace(/\.[^.]+$/, '').trim();
  const safeStem = stem && !stem.startsWith('.') ? stem : 'decoration';
  return `${safeStem}-cropped.${extension}`;
}

const browserAdapters: DecorationCropAdapters = {
  decodeBitmap: (file, options) => createImageBitmap(file, options),
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas as unknown as CropCanvas;
  },
};

const requireContext = (canvas: CropCanvas) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image canvas is unavailable.');
  return context;
};

const canvasToBlob = (canvas: CropCanvas, type: 'image/png' | 'image/jpeg') =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to encode cropped image.'));
    }, type, type === 'image/jpeg' ? 0.88 : undefined);
  });

const containsTransparency = (context: CropCanvasContext, width: number, height: number) => {
  const data = context.getImageData(0, 0, width, height).data;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
};

export async function exportDecorationCrop(
  file: File,
  cropPixels: CropPixels,
  rotation: number,
  adapters: DecorationCropAdapters = browserAdapters,
): Promise<File> {
  let bitmap: CropBitmap | undefined;
  let rotatedCanvas: CropCanvas | undefined;
  let outputCanvas: CropCanvas | undefined;
  try {
    bitmap = await adapters.decodeBitmap(file, { imageOrientation: 'from-image' });
    positiveFinite(bitmap.width, 'dimensions');
    positiveFinite(bitmap.height, 'dimensions');
    const plan = calculateCropOutput(bitmap, cropPixels, rotation, DEFAULT_MAX);

    rotatedCanvas = adapters.createCanvas(plan.rotatedWidth, plan.rotatedHeight);
    const rotatedContext = requireContext(rotatedCanvas);
    rotatedContext.translate(plan.rotatedWidth / 2, plan.rotatedHeight / 2);
    rotatedContext.rotate((plan.rotation * Math.PI) / 180);
    rotatedContext.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    outputCanvas = adapters.createCanvas(plan.outputWidth, plan.outputHeight);
    const outputContext = requireContext(outputCanvas);
    outputContext.drawImage(
      rotatedCanvas,
      plan.sourceX,
      plan.sourceY,
      plan.sourceWidth,
      plan.sourceHeight,
      0,
      0,
      plan.outputWidth,
      plan.outputHeight,
    );
    const mimeType = containsTransparency(outputContext, plan.outputWidth, plan.outputHeight)
      ? 'image/png'
      : 'image/jpeg';
    const blob = await canvasToBlob(outputCanvas, mimeType);
    return new File([blob], createDecorationCropFilename(file.name, mimeType), { type: mimeType });
  } finally {
    bitmap?.close?.();
    rotatedCanvas?.release?.();
    outputCanvas?.release?.();
  }
}
