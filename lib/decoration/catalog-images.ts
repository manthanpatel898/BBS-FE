type DecorationImage = { id: string; url: string; isCover: boolean };
type ImageFile = { type: string; size: number };
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function validateDecorationImageFile(file: ImageFile, currentCount: number): string | null {
  if (!file.size) return 'The selected image is empty.';
  if (!TYPES.has(file.type)) return 'Only JPEG, PNG or WebP images are allowed.';
  if (file.size > 8 * 1024 * 1024) return 'Image must be 8 MB or smaller.';
  if (currentCount >= 12) return 'A decoration item can contain at most 12 images.';
  return null;
}
export function getDecorationCoverImage<T extends DecorationImage>(images: T[]): T | null { return images.find((image) => image.isCover) ?? images[0] ?? null; }
