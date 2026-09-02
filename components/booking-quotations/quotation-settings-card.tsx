'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { AppSettings } from '@/lib/auth/types';
import { updateInquiryQuotationSettings } from '@/lib/quotations/api';
import {
  InquiryQuotationSettings,
  InquiryQuotationTaxTreatment,
} from '@/lib/quotations/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100';

const defaultSettings: InquiryQuotationSettings = {
  enableInquiryQuotations: false,
  validityDays: 15,
  taxTreatment: 'ADD_CONFIGURED_GST',
  gstPercentage: 5,
  terms: 'This quotation is valid only for the selected event date and subject to hall availability.',
  paymentTerms: 'Booking confirmation requires advance payment as agreed with the venue.',
  cancellationPolicy: 'Cancellation and refund are subject to the venue policy.',
  footer: 'This is a quotation and not a tax invoice.',
};

type Props = {
  accessToken: string;
  settings: AppSettings;
  onSaved: (settings: AppSettings) => void;
};

function resolveSettings(settings: AppSettings): InquiryQuotationSettings {
  return { ...defaultSettings, ...(settings.inquiryQuotationSettings ?? {}) };
}

export function QuotationSettingsCard({ accessToken, settings, onSaved }: Props) {
  const { showToast } = useToast();
  const savedSettings = useMemo(() => resolveSettings(settings), [settings]);
  const [form, setForm] = useState<InquiryQuotationSettings>(savedSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(savedSettings), [savedSettings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(savedSettings);
  const update = <K extends keyof InquiryQuotationSettings>(
    key: K,
    value: InquiryQuotationSettings[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    if (form.validityDays < 1 || form.validityDays > 90) {
      showToast('Quotation validity must be between 1 and 90 days.', 'error');
      return;
    }
    if (form.gstPercentage < 0 || form.gstPercentage > 28) {
      showToast('GST percentage must be between 0 and 28.', 'error');
      return;
    }
    try {
      setSaving(true);
      const next = await updateInquiryQuotationSettings(accessToken, {
        ...form,
        terms: form.terms.trim(),
        paymentTerms: form.paymentTerms.trim(),
        cancellationPolicy: form.cancellationPolicy.trim(),
        footer: form.footer.trim(),
      });
      onSaved(next);
      showToast('Inquiry quotation settings updated.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save quotation settings.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-5 border-b border-slate-100 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
            Inquiry quotation
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Quotation Settings
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Allow inquiry-stage menu selection and quotation PDFs before booking confirmation.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enableInquiryQuotations}
          onClick={() => update('enableInquiryQuotations', !form.enableInquiryQuotations)}
          className={`flex min-h-12 shrink-0 items-center gap-3 rounded-full border px-4 py-2 font-bold transition ${form.enableInquiryQuotations ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}
        >
          <span className={`relative h-6 w-11 rounded-full transition ${form.enableInquiryQuotations ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${form.enableInquiryQuotations ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
          {form.enableInquiryQuotations ? 'Enabled' : 'Disabled'}
        </button>
      </header>

      <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-6">
        <label className="text-sm font-bold text-slate-700">
          Validity days
          <input
            type="number"
            min={1}
            max={90}
            value={form.validityDays}
            onChange={(event) => update('validityDays', Number(event.target.value))}
            className={`${inputCls} mt-2`}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Tax treatment
          <select
            value={form.taxTreatment}
            onChange={(event) => update('taxTreatment', event.target.value as InquiryQuotationTaxTreatment)}
            className={`${inputCls} mt-2`}
          >
            <option value="EXCLUDE_TAX">Exclude tax</option>
            <option value="ADD_CONFIGURED_GST">Add configured GST</option>
            <option value="TAX_INCLUDED">Tax included</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          GST percentage
          <input
            type="number"
            min={0}
            max={28}
            value={form.gstPercentage}
            onChange={(event) => update('gstPercentage', Number(event.target.value))}
            className={`${inputCls} mt-2`}
          />
        </label>
        {(['terms', 'paymentTerms', 'cancellationPolicy', 'footer'] as const).map((field) => (
          <label key={field} className="text-sm font-bold text-slate-700 sm:col-span-2">
            {field === 'paymentTerms'
              ? 'Payment terms'
              : field === 'cancellationPolicy'
                ? 'Cancellation policy'
                : field.charAt(0).toUpperCase() + field.slice(1)}
            <textarea
              value={form[field]}
              onChange={(event) => update(field, event.target.value)}
              rows={field === 'terms' ? 4 : 3}
              className={`${inputCls} mt-2 resize-y font-medium leading-6`}
            />
          </label>
        ))}
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-sm font-semibold text-slate-500">
          {dirty ? 'Unsaved quotation settings' : 'Quotation settings saved'}
        </p>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="min-h-12 rounded-xl bg-amber-400 px-6 font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300 disabled:shadow-none disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save quotation settings'}
        </button>
      </footer>
    </section>
  );
}
