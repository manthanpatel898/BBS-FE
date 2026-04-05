'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import {
  bulkUploadHotDates,
  createHotDate,
  deleteHotDate,
  fetchHotDates,
  updateHotDate,
} from '@/lib/auth/api';
import { BulkUploadError, BulkUploadResult, HotDate } from '@/lib/auth/types';

const CURRENT_YEAR = new Date().getFullYear();

function buildYearOptions(around = 5) {
  const years: number[] = [];
  for (let y = CURRENT_YEAR - around; y <= CURRENT_YEAR + around; y++) {
    years.push(y);
  }
  return years;
}

function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function dateMin(year: number) {
  return `${year}-01-01`;
}

function dateMax(year: number) {
  return `${year}-12-31`;
}

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const primaryBtn =
  'rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50';

const ghostBtn =
  'rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50';

const iconBtn =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800';

function generateSampleCSV(): string {
  return `date,description\n${CURRENT_YEAR}-01-26,Republic Day\n${CURRENT_YEAR}-08-15,Independence Day\n${CURRENT_YEAR}-10-02,Gandhi Jayanti\n`;
}

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateSampleExcel(year: number): Promise<Blob> {
  const { utils, write } = await import('xlsx');
  const rows = [
    { date: `${year}-01-26`, description: 'Republic Day' },
    { date: `${year}-08-15`, description: 'Independence Day' },
    { date: `${year}-10-02`, description: 'Gandhi Jayanti' },
  ];
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'HotDates');
  const buffer = write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M12 14v4M10 16h4" />
        </svg>
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">No hot dates found</p>
      <p className="mt-1 text-sm text-slate-400">Add dates that are in high demand for this year.</p>
      <button type="button" onClick={onAdd} className={`${primaryBtn} mt-5`}>
        Add Hot Date
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type FormState = { year: number; date: string; description: string };

const initialFormState = (year: number): FormState => ({
  year,
  date: '',
  description: '',
});

type BulkState = {
  year: number;
  file: File | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
  result: BulkUploadResult | null;
  errorMessage: string;
};

const initialBulkState = (year: number): BulkState => ({
  year,
  file: null,
  status: 'idle',
  result: null,
  errorMessage: '',
});

export function HotDatesManager() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [hotDates, setHotDates] = useState<HotDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HotDate | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState(CURRENT_YEAR));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<HotDate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<BulkState>(initialBulkState(CURRENT_YEAR));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yearOptions = buildYearOptions();

  const load = useCallback(
    async (year: number) => {
      if (!accessToken) return;
      setIsLoading(true);
      try {
        const data = await fetchHotDates(accessToken, year);
        setHotDates(data);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load hot dates.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, showToast],
  );

  useEffect(() => {
    void load(filterYear);
  }, [load, filterYear]);

  function openAdd() {
    setEditingRecord(null);
    setForm(initialFormState(filterYear));
    setIsFormOpen(true);
  }

  function openEdit(record: HotDate) {
    setEditingRecord(record);
    setForm({ year: record.year, date: record.date, description: record.description });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecord(null);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();

    const date = form.date.trim();
    const description = form.description.trim();

    if (!date) {
      showToast('Please select a date.', 'error');
      return;
    }
    if (!description) {
      showToast('Description is required.', 'error');
      return;
    }

    if (!accessToken) return;

    try {
      setIsSubmitting(true);
      if (editingRecord) {
        await updateHotDate(accessToken, editingRecord.id, { date, description });
        showToast('Hot date updated successfully.', 'success');
      } else {
        await createHotDate(accessToken, { year: form.year, date, description });
        showToast('Hot date added successfully.', 'success');
      }
      closeForm();
      await load(filterYear);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save hot date.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deletingRecord) return;
    try {
      setIsDeleting(true);
      await deleteHotDate(accessToken, deletingRecord.id);
      showToast('Hot date deleted.', 'success');
      setDeletingRecord(null);
      await load(filterYear);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete hot date.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  function openBulk() {
    setBulk(initialBulkState(filterYear));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsBulkOpen(true);
  }

  function closeBulk() {
    setIsBulkOpen(false);
  }

  async function handleBulkUpload(e: FormEvent) {
    e.preventDefault();
    if (!bulk.file) {
      showToast('Please select a file to upload.', 'error');
      return;
    }
    if (!accessToken) return;

    setBulk((prev) => ({ ...prev, status: 'uploading', result: null, errorMessage: '' }));

    try {
      const result = await bulkUploadHotDates(accessToken, bulk.year, bulk.file);
      setBulk((prev) => ({ ...prev, status: 'done', result }));
      if (result.inserted > 0) {
        showToast(`${result.inserted} record(s) uploaded successfully.`, 'success');
        await load(filterYear);
      }
      if (result.skipped > 0) {
        showToast(`${result.skipped} record(s) skipped due to errors.`, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk upload failed.';
      setBulk((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
      showToast(msg, 'error');
    }
  }

  async function handleDownloadSampleCSV() {
    downloadFile(generateSampleCSV(), 'hot-dates-sample.csv', 'text/csv');
  }

  async function handleDownloadSampleExcel() {
    try {
      const blob = await generateSampleExcel(bulk.year);
      downloadFile(blob, 'hot-dates-sample.xlsx', blob.type);
    } catch {
      showToast('Failed to generate sample Excel file.', 'error');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Settings
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Hot Dates</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage high-demand dates for your venue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openBulk} className={ghostBtn}>
              Bulk Upload
            </button>
            <button type="button" onClick={openAdd} className={primaryBtn}>
              + Add Date
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-slate-400">
            {hotDates.length} date{hotDates.length !== 1 ? 's' : ''} listed
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : hotDates.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Date</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Description</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hotDates.map((record) => (
                  <tr key={record.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {formatDisplayDate(record.date)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{record.description}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          title="Edit"
                          className={iconBtn}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRecord(record)}
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <CommonModal
          title={editingRecord ? 'Edit Hot Date' : 'Add Hot Date'}
          description="Mark a specific date as high demand and add a reason."
          onClose={closeForm}
          widthClassName="max-w-md"
        >
          <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Year
              </label>
              <select
                value={form.year}
                disabled={Boolean(editingRecord)}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setForm((prev) => ({ ...prev, year: y, date: '' }));
                }}
                className={inputCls}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                min={dateMin(form.year)}
                max={dateMax(form.year)}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className={inputCls}
                required
              />
              <p className="text-xs text-slate-400">
                Only dates within {form.year} are allowed.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="e.g. Independence Day — peak demand"
                className={inputCls}
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeForm} className={ghostBtn}>
                Cancel
              </button>
              <LoadingButton type="submit" disabled={isSubmitting} isLoading={isSubmitting} className={primaryBtn}>
                {editingRecord ? 'Update' : 'Add Date'}
              </LoadingButton>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {deletingRecord ? (
        <ConfirmModal
          title="Delete Hot Date"
          message={`Are you sure you want to delete "${formatDisplayDate(deletingRecord.date)}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeletingRecord(null)}
        />
      ) : null}

      {isBulkOpen ? (
        <CommonModal
          title="Bulk Upload Hot Dates"
          description="Upload a CSV or Excel file with date and description columns. Only dates within the selected year will be processed."
          onClose={closeBulk}
          widthClassName="max-w-lg"
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sample Files
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Download a sample file, fill in your data, then upload.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadSampleCSV()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Download CSV Sample
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadSampleExcel()}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Download Excel Sample
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Required columns:</strong> <code>date</code> (YYYY-MM-DD) and{' '}
              <code>description</code>
            </div>

            <form onSubmit={(e) => void handleBulkUpload(e)} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Year
                </label>
                <select
                  value={bulk.year}
                  disabled={bulk.status === 'uploading'}
                  onChange={(e) =>
                    setBulk((prev) => ({ ...prev, year: Number(e.target.value) }))
                  }
                  className={inputCls}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  File (CSV or Excel)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  disabled={bulk.status === 'uploading'}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setBulk((prev) => ({
                      ...prev,
                      file: f,
                      status: 'idle',
                      result: null,
                      errorMessage: '',
                    }));
                  }}
                  className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {bulk.status === 'uploading' ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Spinner />
                  <span className="text-sm font-medium text-amber-700">
                    Uploading and processing…
                  </span>
                </div>
              ) : null}

              {bulk.status === 'error' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bulk.errorMessage}
                </div>
              ) : null}

              {bulk.status === 'done' && bulk.result ? (
                <UploadResultSummary result={bulk.result} />
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeBulk}
                  disabled={bulk.status === 'uploading'}
                  className={ghostBtn}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!bulk.file || bulk.status === 'uploading'}
                  className={primaryBtn}
                >
                  {bulk.status === 'uploading' ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Uploading…
                    </span>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </CommonModal>
      ) : null}
    </>
  );
}

function UploadResultSummary({ result }: { result: BulkUploadResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Upload Result
      </p>
      <div className="grid gap-3 text-center sm:grid-cols-3">
        <Stat label="Total Rows" value={result.total} color="slate" />
        <Stat label="Inserted" value={result.inserted} color="emerald" />
        <Stat label="Skipped" value={result.skipped} color="red" />
      </div>

      {result.errors.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-2 font-semibold">Row Errors</p>
          <ul className="space-y-1">
            {result.errors.map((err: BulkUploadError) => (
              <li key={err.row}>
                Row {err.row}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'slate' | 'emerald' | 'red';
}) {
  const colorCls =
    color === 'emerald'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : color === 'red'
        ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-slate-700 bg-white border-slate-200';

  return (
    <div className={`rounded-xl border px-3 py-3 ${colorCls}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </p>
    </div>
  );
}
