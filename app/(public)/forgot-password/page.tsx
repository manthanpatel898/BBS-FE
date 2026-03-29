'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { forgotPasswordRequest } from '@/lib/auth/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      await forgotPasswordRequest(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_1fr] lg:items-stretch">

      {/* ── LEFT: dark brand panel ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(148deg,#0f172a_0%,#1e1b4b_60%,#0f172a_100%)] p-7 shadow-[0_24px_64px_rgba(15,23,42,0.28)] sm:p-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="zb-orb absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(246,173,28,0.18),transparent_65%)]" />
          <div className="zb-orb-slow absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_65%)]" />
        </div>
        <div className="relative z-10 flex h-full flex-col">
          {/* Brand */}
          <div className="zb-fade-up-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-400" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">Banquate</p>
              <p className="text-xs font-medium text-white/60">Booking System</p>
            </div>
          </div>

          {/* Headline */}
          <div className="zb-fade-up-2 mt-8">
            <h1 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
              Secure account<br />
              <span className="zb-gradient-text">recovery</span>
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Enter your email address and we'll send you a secure link to reset your password. The link expires in 15 minutes.
            </p>
          </div>

          {/* Security steps */}
          <div className="zb-fade-up-3 mt-7 space-y-4">
            {[
              { num: '01', text: 'Enter your registered email address' },
              { num: '02', text: 'Check your inbox for the reset link' },
              { num: '03', text: 'Set a new strong password and log in' },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-[10px] font-bold text-amber-400">
                  {step.num}
                </div>
                <p className="mt-0.5 text-xs text-white/60">{step.text}</p>
              </div>
            ))}
          </div>

          {/* Bottom info card */}
          <div className="mt-auto pt-8">
            <div className="zb-float rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">Security Notice</p>
              <p className="mt-2 text-xs leading-5 text-white/50">
                Reset links are single-use and expire after 15 minutes. Your current password remains unchanged until you complete the reset.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: form card ── */}
      <div className="zb-scale-in rounded-[28px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94),rgba(239,246,255,0.92))] p-7 shadow-[0_24px_64px_rgba(148,163,184,0.18)] sm:p-8">
        {!sent ? (
          <>
            <div className="zb-fade-up-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50 px-3.5 py-1.5 text-[10px] font-semibold text-amber-700">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-amber-500">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                </svg>
                Password Recovery
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Forgot your password?</h2>
              <p className="mt-2 text-sm text-slate-500">No worries. Enter your email and we'll send a secure reset link straight to your inbox.</p>
            </div>

            <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <form className="zb-fade-up-2 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                    <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                    <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                  </svg>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="light-form-field w-full rounded-2xl px-4 py-3.5 text-sm text-slate-900 outline-none"
                />
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="zb-btn-primary group w-full overflow-hidden rounded-2xl bg-(--zb-primary) px-4 py-4 text-sm font-bold text-slate-900 shadow-[0_12px_32px_rgba(246,173,28,0.38)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                <span className="flex items-center justify-center gap-2.5">
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                      </svg>
                      Sending reset link…
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                        <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.199-7.158.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
              </svg>
              <Link href="/login" className="font-medium text-slate-700 transition hover:text-slate-900">
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          /* ── Success state ── */
          <div className="flex h-full flex-col items-center justify-center py-8 text-center zb-fade-up">
            {/* Animated checkmark */}
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_16px_40px_rgba(16,185,129,0.35)]">
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-[0_4px_12px_rgba(246,173,28,0.4)]">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-white">
                  <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                  <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Check your email</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
              We've sent a password reset link to{' '}
              <span className="font-semibold text-slate-700">{email}</span>.
              Check your inbox (and spam folder) — it expires in <strong>15 minutes</strong>.
            </p>

            <div className="mt-6 w-full rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-xs font-semibold text-amber-700">Didn't receive it?</p>
              <p className="mt-1 text-xs text-amber-600/80">Check your spam folder, or</p>
              <button
                onClick={() => { setSent(false); setError(''); }}
                className="mt-2 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800"
              >
                try again with a different email
              </button>
            </div>

            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-[0_4px_12px_rgba(148,163,184,0.12)] transition hover:border-slate-300 hover:bg-slate-50"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
              </svg>
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
