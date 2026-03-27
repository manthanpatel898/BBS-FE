'use client';

import { FormEvent, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type InquiryForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  useCase: string;
  message: string;
};

const initialForm: InquiryForm = {
  fullName: '',
  email: '',
  phone: '',
  company: '',
  useCase: '',
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState<InquiryForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          useCase: form.useCase.trim() || undefined,
          message: form.message.trim(),
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Unable to submit inquiry.');
      }

      setSuccessMessage('Thanks for your interest. Our team will contact you shortly.');
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit inquiry.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(255,248,235,0.84),rgba(239,246,255,0.84))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]">Contact Us</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Let’s discuss your software setup.
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-600">
          This form is for ZenBooking software inquiries, product demos, implementation
          discussions, and support planning.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#fff8eb,#ffffff,#f0f9ff)] p-5">
          <Info label="Contact Number" value="+91 89809 38142" />
          <Info label="Email" value="info@zenoveltechnolab.com" />
          <Info label="Working Hours" value="Mon - Sat | 10:00 AM - 7:00 PM IST" />
        </div>
      </article>

      <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(240,249,255,0.84),rgba(253,242,248,0.82))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)] sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-900">Inquiry Form</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share your requirement and our team will get back with a tailored walkthrough.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Full name"
            required
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email address"
              required
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
            />
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Phone number"
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              placeholder="Company / Brand"
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
            />
            <input
              value={form.useCase}
              onChange={(event) => setForm((current) => ({ ...current, useCase: event.target.value }))}
              placeholder="Use case (multi-location, events/month, etc.)"
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
            />
          </div>
          <textarea
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            placeholder="Tell us what you need from ZenBooking"
            required
            className="min-h-36 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-white outline-none"
          />

          {successMessage ? (
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(246,173,28,0.45)] disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </article>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--accent)]">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}
