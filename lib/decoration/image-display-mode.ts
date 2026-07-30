export type DecorationImageDisplayMode = "COVER" | "CONTAIN";

export function normalizeDecorationImageDisplayMode(
  value: unknown,
): DecorationImageDisplayMode {
  return value === "CONTAIN" ? "CONTAIN" : "COVER";
}

export function decorationImageFitClass(
  value: unknown,
  legacyFallback: DecorationImageDisplayMode = "COVER",
) {
  const mode =
    value === "COVER" || value === "CONTAIN" ? value : legacyFallback;
  return mode === "CONTAIN"
    ? "object-contain"
    : "object-cover";
}
