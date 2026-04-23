'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { changePasswordRequest, fetchActiveTerms } from '@/lib/auth/api';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { TcModal } from '@/components/auth/tc-modal';
import type { ActiveTermsAndConditions } from '@/lib/auth/types';

const passwordChecks = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z\d]/.test(v) },
];

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];

type ConsentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function captureConsentLocation(): Promise<ConsentLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location access is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        reject(
          new Error(
            'Allow location access so we can record where the Terms & Conditions were accepted.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

export default function ResetPasswordPage() {
  const { accessToken, setSession, user } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword,     setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showNew,         setShowNew]           = useState(false);
  const [showConfirm,     setShowConfirm]       = useState(false);
  const [tcAccepted,      setTcAccepted]        = useState(false);
  const [showTcModal,     setShowTcModal]       = useState(false);
  const [activeTc,        setActiveTc]          = useState<ActiveTermsAndConditions | null>(null);
  const [consentLocation, setConsentLocation]   = useState<ConsentLocation | null>(null);
  const [error,           setError]             = useState('');
  const [isSubmitting,    setIsSubmitting]      = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const isFirstLogin = user?.isFirstLogin ?? true;

  useEffect(() => {
    if (isFirstLogin) {
      fetchActiveTerms()
        .then(setActiveTc)
        .catch(() => null);
    }
  }, [isFirstLogin]);

  const checks = useMemo(
    () => passwordChecks.map((r) => ({ label: r.label, passed: r.test(newPassword) })),
    [newPassword],
  );
  const passedCount   = checks.filter((c) => c.passed).length;
  const strengthPct   = Math.round((passedCount / checks.length) * 100);
  const strengthLabel = strengthLabels[passedCount] ?? '';
  const strengthColor = strengthColors[passedCount] ?? 'bg-slate-200';
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const canSubmit =
    passwordsMatch &&
    checks.every((c) => c.passed) &&
    (!isFirstLogin || (tcAccepted && !!activeTc));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!accessToken || !user) {
      setError('Session missing. Please log in again.');
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
    if (isFirstLogin && !tcAccepted) {
      setError('You must accept the Terms & Conditions to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      let nextConsentLocation = consentLocation;

      if (isFirstLogin) {
        setIsCapturingLocation(true);
        nextConsentLocation = await captureConsentLocation();
        setConsentLocation(nextConsentLocation);
      }

      const session = await changePasswordRequest(
        accessToken,
        currentPassword,
        newPassword,
        isFirstLogin && activeTc ? activeTc.id : undefined,
        nextConsentLocation ?? undefined,
      );
      setSession(session);
      router.replace(getHomeRouteForUser(session.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setIsCapturingLocation(false);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {showTcModal && activeTc && (
        <TcModal tc={activeTc} onClose={() => setShowTcModal(false)} />
      )}

      <section className="relative mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_1fr] lg:items-stretch">

        {/* LEFT: dark brand panel */}
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">ZenBooking</p>
                <p className="text-xs font-medium text-white/60">by Zenovel Technolab</p>
              </div>
            </div>

            {/* Headline */}
            <div className="zb-fade-up-2 mt-8">
              <h1 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
                {isFirstLogin ? (
                  <>Secure your account<br /><span className="zb-gradient-text">first login setup</span></>
                ) : (
                  <>Update your<br /><span className="zb-gradient-text">password</span></>
                )}
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/55">
                {user
                  ? `${user.firstName}, ${isFirstLogin ? 'please set a new password and accept our Terms & Conditions to activate your account.' : 'enter your current password and choose a new one.'}`
                  : 'Set a strong password to protect your account.'}
              </p>
            </div>

            {/* Tips */}
            <div className="zb-fade-up-3 mt-7 space-y-3">
              {[
                { icon: '🔐', tip: 'Use at least 8 characters' },
                { icon: '🔠', tip: 'Mix uppercase and lowercase letters' },
                { icon: '🔢', tip: 'Include numbers and special symbols' },
                { icon: '🚫', tip: "Don't reuse a previous password" },
              ].map((t) => (
                <div key={t.tip} className="flex items-center gap-3">
                  <span className="text-base">{t.icon}</span>
                  <p className="text-xs text-white/60">{t.tip}</p>
                </div>
              ))}
            </div>

            {/* Bottom card */}
            {isFirstLogin && (
              <div className="mt-auto pt-8">
                <div className="zb-float rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">First Login</p>
                  <p className="mt-2 text-xs leading-5 text-white/50">
                    Your temporary password was sent by Zenovel Technolab. After setup, use your new password to sign in.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: form */}
        <div className="zb-scale-in rounded-[28px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94),rgba(239,246,255,0.92))] p-7 shadow-[0_24px_64px_rgba(148,163,184,0.18)] sm:p-8">

          <div className="zb-fade-up-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50 px-3.5 py-1.5 text-[10px] font-semibold text-amber-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-amber-500">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
              </svg>
              {isFirstLogin ? 'First Login Setup' : 'Change Password'}
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isFirstLogin ? 'Activate your account' : 'Update password'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isFirstLogin
                ? 'Set a new password and accept the Terms & Conditions to get started.'
                : 'Enter your current password and choose a new one.'}
            </p>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <form className="zb-fade-up-2 space-y-5" onSubmit={handleSubmit} noValidate>

            {/* Current password — only for non-first-login */}
            {!isFirstLogin && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                    <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                  </svg>
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                  className="light-form-field w-full rounded-2xl px-4 py-3.5 text-sm text-slate-900 outline-none"
                />
              </div>
            )}

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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="light-form-field w-full rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
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
                        {c.passed
                          ? <path fillRule="evenodd" d="M10.22 2.97a.75.75 0 0 1 .06 1.06l-5.25 5.5a.75.75 0 0 1-1.08.02L1.72 7.3a.75.75 0 0 1 1.06-1.06l1.97 1.97 4.71-4.94a.75.75 0 0 1 1.06-.06Z" clipRule="evenodd" />
                          : <circle cx="6" cy="6" r="2.5" />}
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
                  {passwordsMatch
                    ? <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />}
                </svg>
                Confirm new password
                {passwordsMatch && <span className="ml-auto text-[10px] font-semibold text-emerald-600">Passwords match ✓</span>}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className={`light-form-field w-full rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition ${confirmPassword.length > 0 && !passwordsMatch ? 'border-red-300' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showConfirm ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93l2.523 2.524a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* T&C checkbox — first login only */}
            {isFirstLogin && (
              <div className={`rounded-2xl border p-4 transition ${tcAccepted ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <input
                    id="tc-acceptance"
                    type="checkbox"
                    checked={tcAccepted}
                    onChange={(e) => setTcAccepted(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="tc-acceptance" className="cursor-pointer text-sm leading-6 text-slate-600">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setShowTcModal(true);
                      }}
                      className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                      Terms &amp; Conditions
                    </button>
                    {activeTc && (
                      <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {activeTc.version}
                      </span>
                    )}
                  </label>
                </div>

                {!tcAccepted && (
                  <p className="mt-2 ml-8 text-[11px] text-slate-400">
                    You must read and accept the Terms &amp; Conditions to activate your account.
                  </p>
                )}

                {tcAccepted && !consentLocation && (
                  <p className="mt-2 ml-8 text-[11px] text-slate-500">
                    We will ask for your location when you activate the account so the T&amp;C acceptance record includes geo coordinates.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isCapturingLocation || !canSubmit}
              className="zb-btn-primary group w-full overflow-hidden rounded-2xl bg-(--zb-primary) px-4 py-4 text-sm font-bold text-slate-900 shadow-[0_12px_32px_rgba(246,173,28,0.38)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <span className="flex items-center justify-center gap-2.5">
                {isSubmitting || isCapturingLocation ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                    {isCapturingLocation
                      ? 'Capturing consent location…'
                      : isFirstLogin
                        ? 'Activating account…'
                        : 'Updating password…'}
                  </>
                ) : (
                  <>
                    {isFirstLogin ? 'Activate Account & Sign In' : 'Update Password'}
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
