export type ImportRowFilter = 'all' | 'valid' | 'invalid' | 'warning';
export type FilterableImportRow = { isValid: boolean; warnings: string[] };

export function validateImportFile(file: { name: string; size: number }) {
  if (!/\.(csv|xlsx)$/i.test(file.name)) return 'Choose a CSV or XLSX file.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > 5 * 1024 * 1024) return 'The selected file exceeds the 5 MB limit.';
  return null;
}

export function filterImportRows<T extends FilterableImportRow>(rows: T[], filter: ImportRowFilter) {
  if (filter === 'valid') return rows.filter((row) => row.isValid);
  if (filter === 'invalid') return rows.filter((row) => !row.isValid);
  if (filter === 'warning') return rows.filter((row) => row.warnings.length > 0);
  return rows;
}
