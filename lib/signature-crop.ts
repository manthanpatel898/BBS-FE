export type SignatureInkBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CropSignatureOptions = {
  paddingPixels?: number;
  alphaThreshold?: number;
};

export function findSignatureInkBounds(
  rgbaData: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 8,
): SignatureInkBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgbaData[(y * width + x) * 4 + 3] ?? 0;
      if (alpha <= alphaThreshold) continue;

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

export function cropSignatureCanvasToDataUrl(
  canvas: HTMLCanvasElement | null,
  options: CropSignatureOptions = {},
) {
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  if (!context || canvas.width < 1 || canvas.height < 1) return null;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findSignatureInkBounds(
    imageData.data,
    canvas.width,
    canvas.height,
    options.alphaThreshold,
  );

  if (!bounds) return null;

  const padding = Math.max(0, Math.floor(options.paddingPixels ?? 18));
  const sourceX = Math.max(bounds.left - padding, 0);
  const sourceY = Math.max(bounds.top - padding, 0);
  const sourceRight = Math.min(bounds.right + padding, canvas.width - 1);
  const sourceBottom = Math.min(bounds.bottom + padding, canvas.height - 1);
  const sourceWidth = sourceRight - sourceX + 1;
  const sourceHeight = sourceBottom - sourceY + 1;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceWidth;
  outputCanvas.height = sourceHeight;

  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) return null;

  outputContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  return outputCanvas.toDataURL('image/png');
}
