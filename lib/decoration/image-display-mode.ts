export type DecorationImageDisplayMode = "COVER" | "CONTAIN";

export function normalizeDecorationImageDisplayMode(
  value: unknown,
): DecorationImageDisplayMode {
  return value === "CONTAIN" ? "CONTAIN" : "COVER";
}

export function decorationImageFitClass(value: unknown) {
  return normalizeDecorationImageDisplayMode(value) === "CONTAIN"
    ? "object-contain"
    : "object-cover";
}
