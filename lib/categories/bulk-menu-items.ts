const HEADER_NAMES = new Set(['item', 'item name', 'menu item', 'menu item name']);
export const MAX_BULK_ITEM_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BULK_ITEMS = 2000;

function key(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function clean(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function parseBulkItemText(text: string) {
  const values = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .flatMap((line) => line.includes(',') ? parseCsvRow(line).slice(0, 1) : [line])
    .map(clean)
    .filter(Boolean);
  if (values.length && HEADER_NAMES.has(key(values[0]!))) values.shift();
  return unique(values);
}

function parseCsvRow(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      cells.push(current); current = '';
    } else current += character;
  }
  cells.push(current);
  return cells;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = key(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function buildBulkItemPreview(incoming: string[], existing: string[]) {
  const existingKeys = new Set(existing.map(key));
  const acceptedKeys = new Set<string>();
  const itemsToAdd: string[] = [];
  const duplicates: string[] = [];
  let blankCount = 0;
  for (const raw of incoming) {
    const value = clean(raw);
    if (!value) { blankCount += 1; continue; }
    const normalized = key(value);
    if (existingKeys.has(normalized) || acceptedKeys.has(normalized)) duplicates.push(value);
    else { acceptedKeys.add(normalized); itemsToAdd.push(value); }
  }
  return { itemsToAdd, duplicates, blankCount };
}

export async function parseBulkItemFile(file: File) {
  if (file.size > MAX_BULK_ITEM_FILE_BYTES) throw new Error('File must be 5 MB or smaller.');
  const extension = file.name.split('.').pop()?.toLocaleLowerCase();
  let items: string[];
  if (extension === 'csv') {
    items = parseBulkItemText(await file.text());
  } else if (extension === 'xlsx') {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('The Excel file does not contain a worksheet.');
    const values: string[] = [];
    worksheet.eachRow((row) => {
      const value = row.getCell(1).text;
      values.push(value);
    });
    if (values.length && HEADER_NAMES.has(key(values[0]!))) values.shift();
    items = unique(values.map(clean).filter(Boolean));
  } else {
    throw new Error('Upload a CSV or XLSX file.');
  }
  if (items.length > MAX_BULK_ITEMS) throw new Error(`A maximum of ${MAX_BULK_ITEMS} items can be imported at once.`);
  return items;
}
