type DecorationImage = { id: string; url: string; isCover: boolean };
type ImageFile = { type: string; size: number };
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export function validateDecorationImageFile(file: ImageFile, currentCount: number): string | null {
  if (!file.size) return 'The selected image is empty.';
  if (!TYPES.has(file.type)) return 'Only JPEG, PNG or WebP images are allowed.';
  if (file.size > 8 * 1024 * 1024) return 'Image must be 8 MB or smaller.';
  if (currentCount >= 12) return 'A decoration item can contain at most 12 images.';
  return null;
}

export async function materializeDecorationImageFile(file: File): Promise<File> {
  const validation = validateDecorationImageFile(file, 0);
  if (validation) throw new Error(validation);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(bytes, file.type)) {
    const label = file.type.replace('image/', '').toUpperCase();
    throw new Error(`The selected file does not contain valid ${label} image data.`);
  }

  return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
}

export function getDecorationCoverImage<T extends DecorationImage>(images: T[]): T | null { return images.find((image) => image.isCover) ?? images[0] ?? null; }
