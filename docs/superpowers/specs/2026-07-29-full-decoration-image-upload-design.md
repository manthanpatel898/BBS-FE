# Full Decoration Image Upload Design

## Problem

“Use Full Image” uploads the original mobile photo unchanged. Production Nginx currently rejects requests larger than approximately 1 MB with `413 Request Entity Too Large`, before the request reaches NestJS. The NestJS custom-decoration upload endpoint allows files up to 8 MB.

## Approved Behavior

- “Use Full Image” preserves the complete image and its original aspect ratio; it does not crop.
- Before upload, the browser corrects image orientation, bounds the image to 2400 pixels on its longest edge, and encodes an opaque result as JPEG at 88% quality.
- Images requiring transparency remain PNG. If the optimized result still exceeds 8 MB, the UI rejects it locally with a clear message.
- “Crop & Use” retains its existing 4:3 crop and 1600×1200 output behavior.
- Catalog and custom-note image workflows use the same full-image optimizer.
- The API continues enforcing an 8 MB file limit and returns a stable, user-friendly message for oversized files.
- Production Nginx must allow multipart requests up to 10 MB, leaving space for the 8 MB file plus multipart overhead.

## Data Flow

1. User chooses an image and opens the existing editor.
2. “Crop & Use” follows the existing crop exporter.
3. “Use Full Image” runs the full-image optimizer.
4. The optimized `File` is validated against the shared 8 MB maximum.
5. The existing multipart upload sends the optimized file.
6. Nginx permits requests up to 10 MB; Nest/Multer enforces the 8 MB file limit.
7. The existing S3 upload and audit flow remain unchanged.

## Error Handling

- Unsupported or undecodable images show a local image-processing error.
- An optimized file over 8 MB is not uploaded and shows “Image must be 8 MB or smaller.”
- Multer limit errors return HTTP 413 with the same friendly file-size message.
- Nginx remains a final transport guard at 10 MB.

## Testing

- Unit tests cover output geometry, aspect-ratio preservation, transparency handling, JPEG encoding, cleanup, and no unnecessary upscaling.
- Modal behavior tests prove “Use Full Image” calls the optimizer rather than uploading original bytes.
- Backend tests prove the upload limit and friendly 413 response.
- Frontend decoration regression, lint, static build, backend lint, and backend build must pass.
