'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordWithTokenRequest } from '@/lib/auth/api';

const passwordChecks = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter',  test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter',  test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number',            test: (v: string) => /\d/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z\d]/.test(v) },
];

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];

function ResetPasswordForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const token    = params.get('token') ?? '';

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState('');
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [success,         setSuccess]         = useState(false);

  const checks = useMemo(
    () => passwordChecks.map((r) => ({ label: r.label, passed: r.test(newPassword) })),
    [newPassword],
  );
  const passedCount    = checks.filter((c) => c.passed).length;
  const strengthPct    = Math.round((passedCount / checks.length) * 100);
  const strengthLabel  = strengthLabels[passedCount] ?? '';
  const strengthColor  = strengthColors[passedCount] ?? 'bg-slate-200';
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (checks.some((c) => !c.passed)) {
      setError('Password does not meet all strength requirements.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPasswordWithTokenRequest(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md py-12 text-center">
        <div className="rounded-[28px] border border-red-100 bg-red-50 p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7 text-red-500">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invalid reset link</h2>
          <p className="mt-2 text-sm text-slate-500">This link is missing a token. Please use the exact link from your email.</p>
          <Link href="/forgot-password" className="mt-5 inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(246,173,28,0.35)]">
            Request new link
          </Link>
        </div>
      </section>
    );
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
              Create a strong<br />
              <span className="zb-gradient-text">new password</span>
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Choose a password that's unique to Banquate Booking System and not used elsewhere.
            </p>
          </div>

          {/* Password tips */}
          <div className="zb-fade-up-3 mt-7 space-y-3">
            {[
              { icon: '🔐', tip: 'Use at least 8 characters' },
              { icon: '🔠', tip: 'Mix uppercase and lowercase letters' },
              { icon: '🔢', tip: 'Include numbers and symbols' },
              { icon: '🚫', tip: "Don't reuse a previous password" },
            ].map((t) => (
              <div key={t.tip} className="flex items-center gap-3">
                <span className="text-base">{t.icon}</span>
                <p className="text-xs text-white/60">{t.tip}</p>
              </div>
            ))}
          </div>

          {/* Bottom card */}
          <div className="mt-auto pt-8">
            <div className="zb-float rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">One-Time Link</p>
              <p className="mt-2 text-xs leading-5 text-white/50">
                This reset link is single-use and was sent only to your registered email. It expires in 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: form or success ── */}
      <div className="zb-scale-in rounded-[28px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94),rgba(239,246,255,0.92))] p-7 shadow-[0_24px_64px_rgba(148,163,184,0.18)] sm:p-8">
        {success ? (
          /* ── Success ── */
          <div className="flex h-full flex-col items-center justify-center py-8 text-center zb-fade-up">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_16px_40px_rgba(16,185,129,0.35)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Password updated!</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
              Your password has been reset successfully. Redirecting you to the login page in a moment…
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
              <svg className="h-4 w-4 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
              Redirecting to login…
            </div>
            <Link href="/login" className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">
              Go now →
            </Link>
          </div>
        ) : (
          <>
            <div className="zb-fade-up-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50 px-3.5 py-1.5 text-[10px] font-semibold text-amber-700">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-amber-500">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                </svg>
                Set New Password
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create new password</h2>
              <p className="mt-2 text-sm text-slate-500">Choose a strong password you haven't used before.</p>
            </div>

            <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <form className="zb-fade-up-2 space-y-5" onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                    <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                  </svg>
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="light-form-field w-full rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Toggle visibility">
                    {showNew ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93l2.523 2.524a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-600">Password strength</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${passedCount >= 4 ? 'text-emerald-600' : passedCount >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all duration-500 ${strengthColor}`} style={{ width: `${strengthPct}%` }} />
                  </div>
                  <ul className="mt-3 grid grid-cols-1 gap-1.5">
                    {checks.map((c) => (
                      <li key={c.label} className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${c.passed ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <svg viewBox="0 0 12 12" fill="currentColor" className={`h-3 w-3 shrink-0 ${c.passed ? 'text-emerald-500' : 'text-slate-300'}`}>
                          {c.passed ? <path fillRule="evenodd" d="M10.22 2.97a.75.75 0 0 1 .06 1.06l-5.25 5.5a.75.75 0 0 1-1.08.02L1.72 7.3a.75.75 0 0 1 1.06-1.06l1.97 1.97 4.71-4.94a.75.75 0 0 1 1.06-.06Z" clipRule="evenodd" /> : <circle cx="6" cy="6" r="2.5" />}
                        </svg>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${passwordsMatch ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {passwordsMatch ? <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />}
                  </svg>
                  Confirm new password
                  {passwordsMatch && <span className="ml-auto text-[10px] font-semibold text-emerald-600">Passwords match ✓</span>}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`light-form-field w-full rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition ${confirmPassword.length > 0 && !passwordsMatch ? 'border-red-300' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Toggle visibility">
                    {showConfirm ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93l2.523 2.524a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-red-700">{error}</p>
                    {error.toLowerCase().includes('expired') && (
                      <Link href="/forgot-password" className="mt-1 block text-xs font-semibold text-red-600 underline underline-offset-2">
                        Request a new reset link →
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !passwordsMatch || checks.some((c) => !c.passed)}
                className="zb-btn-primary group w-full overflow-hidden rounded-2xl bg-(--zb-primary) px-4 py-4 text-sm font-bold text-slate-900 shadow-[0_12px_32px_rgba(246,173,28,0.38)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <span className="flex items-center justify-center gap-2.5">
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                      </svg>
                      Updating password…
                    </>
                  ) : (
                    <>
                      Set New Password
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
              </svg>
              <Link href="/login" className="font-medium text-slate-700 transition hover:text-slate-900">Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function ResetPasswordTokenPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
