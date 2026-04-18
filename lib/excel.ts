type ExcelFooterSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string | number | null;
  }>;
};

export async function createExcelBlobFromRecords(
  sheetName: string,
  rows: Array<Record<string, string | number | null>>,
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const headers = Object.keys(rows[0] ?? {});
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 2, 18),
  }));

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function createExcelBlobFromTable(
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | null>>,
  options?: {
    headerInfo?: {
      reportName: string;
      dateRange?: string;
    };
    footerSections?: ExcelFooterSection[];
  },
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  let headerRowIndex = 1;

  if (options?.headerInfo) {
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = options.headerInfo.reportName;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF111827' } };

    const dateRow = worksheet.getRow(2);
    dateRow.getCell(1).value = options.headerInfo.dateRange ?? 'Date Range: All Dates';
    dateRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };

    const blankRow = worksheet.getRow(3);
    blankRow.getCell(1).value = '';
    headerRowIndex = 4;
  }

  worksheet.getRow(headerRowIndex).values = headers;
  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: String(index),
    width: Math.max(header.length + 2, 18),
  }));

  if (options?.headerInfo) {
    worksheet.mergeCells(1, 1, 1, Math.max(headers.length, 2));
    worksheet.mergeCells(2, 1, 2, Math.max(headers.length, 2));
  }

  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index]?.length ?? 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value == null ? '' : String(cell.value);
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 14), 28);
  });

  if (options?.footerSections?.length) {
    let currentRow = worksheet.rowCount + 2;

    options.footerSections.forEach((section) => {
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = section.title;
      worksheet.mergeCells(currentRow, 1, currentRow, 2);
      titleRow.font = { bold: true, color: { argb: 'FF92400E' } };
      titleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      titleRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FFF59E0B' } },
        left: { style: 'thin', color: { argb: 'FFF59E0B' } },
        bottom: { style: 'thin', color: { argb: 'FFF59E0B' } },
        right: { style: 'thin', color: { argb: 'FFF59E0B' } },
      };
      currentRow += 1;

      section.rows.forEach((item) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = item.label;
        row.getCell(2).value = item.value;
        row.getCell(1).font = { bold: true };
        [1, 2].forEach((cellIndex) => {
          row.getCell(cellIndex).border = {
            top: { style: 'thin', color: { argb: 'FFFCD34D' } },
            left: { style: 'thin', color: { argb: 'FFFCD34D' } },
            bottom: { style: 'thin', color: { argb: 'FFFCD34D' } },
            right: { style: 'thin', color: { argb: 'FFFCD34D' } },
          };
          row.getCell(cellIndex).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cellIndex === 1 ? 'FFFFFBEB' : 'FFFFFFFF' },
          };
        });
        currentRow += 1;
      });

      currentRow += 1;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
