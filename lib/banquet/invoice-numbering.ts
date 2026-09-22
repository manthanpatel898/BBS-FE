export interface InvoiceNumberingConfig {
  format:
    | "PREFIX_YEAR_NUMBER"
    | "NUMBER_YEAR"
    | "PREFIX_NUMBER_YEAR"
    | "PREFIX_NUMBER";
  prefix: string;
  minimumDigits: number;
  yearStyle: "SHORT" | "FULL";
  resetAnnually: boolean;
  startingNumber: number;
}

export interface InvoiceNumberingSettings {
  config: InvoiceNumberingConfig;
  nextNumber: number;
  financialYear: string;
  revision: number;
  legacy: boolean;
  preview: string[];
  previewError?: string | null;
}

export type UpdateInvoiceNumbering = InvoiceNumberingConfig &
  Pick<InvoiceNumberingSettings, "nextNumber" | "revision" | "financialYear">;

export function previewInvoiceNumbers(
  config: InvoiceNumberingConfig,
  year: string,
  next: number,
): string[] {
  if (!Number.isSafeInteger(next) || next < 1 || next > 99999997)
    throw new Error("Enter a whole next number between 1 and 99999997.");
  if (
    !Number.isSafeInteger(config.startingNumber) ||
    config.startingNumber < 1 ||
    config.startingNumber > 99999999
  )
    throw new Error("Enter a valid starting number.");
  if (
    !Number.isInteger(config.minimumDigits) ||
    config.minimumDigits < 1 ||
    config.minimumDigits > 8
  )
    throw new Error("Minimum digits must be between 1 and 8.");
  if (!/^[A-Z0-9-]{0,10}$/i.test(config.prefix.trim()))
    throw new Error("Use up to 10 letters, numbers or hyphens for the prefix.");
  if (config.resetAnnually && config.format === "PREFIX_NUMBER")
    throw new Error("Include the financial year to restart annually.");
  const fy =
    config.yearStyle === "FULL"
      ? `${year.slice(0, 4)}-${Number(year.slice(0, 4)) + 1}`
      : year;
  return Array.from({ length: 3 }, (_, index) => {
    const number = String(next + index).padStart(config.minimumDigits, "0");
    const prefix = config.prefix.trim().toUpperCase();
    const parts =
      config.format === "NUMBER_YEAR"
        ? [number, fy]
        : config.format === "PREFIX_NUMBER_YEAR"
          ? [prefix, number, fy]
          : config.format === "PREFIX_NUMBER"
            ? [prefix, number]
            : [prefix, fy, number];
    const value = parts.filter(Boolean).join("/");
    if (value.length > 16)
      throw new Error(
        "Invoice number exceeds 16 characters. Shorten the prefix, padding or year format.",
      );
    return value;
  });
}
