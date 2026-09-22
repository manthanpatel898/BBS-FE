"use client";

import "./invoice-surface.css";
import { FormEvent, useEffect, useState } from "react";
import { fetchInvoiceNumbering, updateInvoiceNumbering } from "@/lib/auth/api";
import {
  InvoiceNumberingConfig,
  InvoiceNumberingSettings,
  previewInvoiceNumbers,
} from "@/lib/banquet/invoice-numbering";
import { LoadingButton } from "@/components/ui/loading-button";
import { useToast } from "@/components/ui/toast";

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900";
const label = "grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700";

export function InvoiceNumberingSettingsCard({
  accessToken,
}: {
  accessToken: string;
}) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<InvoiceNumberingSettings | null>(null);
  const [config, setConfig] = useState<InvoiceNumberingConfig | null>(null);
  const [next, setNext] = useState("");
  const [start, setStart] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  function apply(value: InvoiceNumberingSettings) {
    setSaved(value);
    setConfig(value.config);
    setNext(String(value.nextNumber));
    setStart(String(value.config.startingNumber));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSaved(null);
    setConfig(null);
    fetchInvoiceNumbering(accessToken)
      .then((value) => {
        if (active) apply(value);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load invoice numbering.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, reload]);

  const draft = config ? { ...config, startingNumber: Number(start) } : null;
  const dirty =
    saved &&
    draft &&
    (JSON.stringify(draft) !== JSON.stringify(saved.config) ||
      Number(next) !== saved.nextNumber);
  let validation = "";
  let preview: string[] = [];
  if (saved && draft) {
    try {
      preview = previewInvoiceNumbers(draft, saved.financialYear, Number(next));
      if (Number(next) < saved.nextNumber)
        validation = `Next number must be at least ${saved.nextNumber}. Used or reserved numbers cannot be reused.`;
      if (Number(next) < draft.startingNumber)
        validation = "Next number cannot be lower than the starting number.";
    } catch (reason) {
      validation =
        reason instanceof Error ? reason.message : "Check the number format.";
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!saved || !draft || validation || !dirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const value = await updateInvoiceNumbering(accessToken, {
        ...draft,
        prefix: draft.prefix.trim().toUpperCase(),
        nextNumber: Number(next),
        revision: saved.revision,
        financialYear: saved.financialYear,
      });
      apply(value);
      showToast(
        "Invoice numbering saved. Existing invoices are unchanged.",
        "success",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save invoice numbering.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      data-invoice-surface="true"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-100 p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Tax Invoice
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Invoice numbering
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Choose this restaurant’s invoice series or continue from invoices
          issued elsewhere. Only future invoices are affected.
        </p>
      </header>
      <div className="p-4 sm:p-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {loading ? (
          <p role="status" className="text-sm text-slate-600">
            Loading invoice numbering…
          </p>
        ) : saved && config ? (
          <form onSubmit={submit}>
            <p className="mb-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Financial year: <strong>{saved.financialYear}</strong> ·{" "}
              {saved.legacy
                ? "Existing numbering is active until you save changes."
                : "Restaurant-specific numbering is active."}
            </p>
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-4 md:grid-cols-2"
            >
              <label className={label}>
                Number format
                <select
                  className={field}
                  value={config.format}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      format: e.target
                        .value as InvoiceNumberingConfig["format"],
                    })
                  }
                >
                  <option value="PREFIX_YEAR_NUMBER">
                    Prefix / financial year / number
                  </option>
                  <option value="NUMBER_YEAR">Number / financial year</option>
                  <option value="PREFIX_NUMBER_YEAR">
                    Prefix / number / financial year
                  </option>
                  <option value="PREFIX_NUMBER">
                    Prefix / number (no year)
                  </option>
                </select>
              </label>
              <label className={label}>
                Prefix (optional)
                <input
                  className={field}
                  value={config.prefix}
                  maxLength={10}
                  disabled={config.format === "NUMBER_YEAR"}
                  placeholder="e.g. INV"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      prefix: e.target.value.toUpperCase(),
                    })
                  }
                />
                <span className="text-xs font-normal text-slate-500">
                  Letters, numbers or hyphens. Omitted in number / year format.
                </span>
              </label>
              <label className={label}>
                Next sequence number
                <input
                  aria-label="Next sequence number"
                  aria-describedby="invoice-next-number-help"
                  className={field}
                  type="number"
                  min={saved.nextNumber}
                  max={99999997}
                  step="1"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                />
                <span
                  id="invoice-next-number-help"
                  className="text-xs font-normal text-slate-500"
                >
                  If your last invoice was 11, enter 12. Include invoices issued
                  outside Zenbooking.
                </span>
              </label>
              <label className={label}>
                Minimum digits
                <select
                  className={field}
                  value={config.minimumDigits}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minimumDigits: Number(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} — {String(1).padStart(i + 1, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Financial year display
                <select
                  className={field}
                  value={config.yearStyle}
                  disabled={config.format === "PREFIX_NUMBER"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      yearStyle: e.target.value as "SHORT" | "FULL",
                    })
                  }
                >
                  <option value="SHORT">Short — 2026-27</option>
                  <option value="FULL">Full — 2026-2027</option>
                </select>
              </label>
              <label className={label}>
                New financial year
                <select
                  className={field}
                  value={config.resetAnnually ? "RESET" : "CONTINUE"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      resetAnnually: e.target.value === "RESET",
                    })
                  }
                >
                  <option value="RESET">Restart from starting number</option>
                  <option value="CONTINUE">Continue the sequence</option>
                </select>
              </label>
              <label className={label}>
                Starting number
                <input
                  className={field}
                  type="number"
                  min={1}
                  max={99999999}
                  step="1"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
                <span className="text-xs font-normal text-slate-500">
                  The minimum sequence for a new series
                  {config.resetAnnually
                    ? " and each new financial year (1 April)"
                    : ""}
                  . Does not reset invoices already issued.
                </span>
              </label>
            </fieldset>
            <section
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
              aria-label="Invoice number preview"
              aria-live="polite"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Next three invoice numbers
              </h3>
              {validation ? (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  {validation}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {preview.map((number) => (
                    <span
                      key={number}
                      className="max-w-full break-all rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900"
                    >
                      {number}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-600">
                Preview only—not reserved. Numbers are allocated when an invoice
                is issued. New formats must fit within 16 characters.
              </p>
            </section>
            <p className="mt-4 text-sm text-slate-600">
              Issued and cancelled invoices retain their numbers. Changes are
              logged, and numbering cannot move backward.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setReload((value) => value + 1)}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                Reload saved settings (discards edits)
              </button>
              <LoadingButton
                type="submit"
                isLoading={saving}
                disabled={!dirty || Boolean(validation)}
                className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950"
              >
                Save numbering settings
              </LoadingButton>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700"
          >
            Retry loading settings
          </button>
        )}
      </div>
    </section>
  );
}
