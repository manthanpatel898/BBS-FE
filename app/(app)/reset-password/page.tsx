'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { changePasswordRequest } from '@/lib/auth/api';
import { getHomeRouteForUser } from '@/lib/auth/navigation';

const passwordChecks = [
  { label: 'At least 6 characters', test: (value: string) => value.length >= 6 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z\d]/.test(value) },
];

export default function ResetPasswordPage() {
  const { accessToken, setSession, user } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = useMemo(
    () =>
      passwordChecks.map((rule) => ({
        label: rule.label,
        passed: rule.test(newPassword),
      })),
    [newPassword],
  );
  const passedChecks = checks.filter((check) => check.passed).length;
  const strengthPercent = Math.round((passedChecks / checks.length) * 100);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!accessToken || !user) {
      setError('Your session is missing. Please log in again.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (checks.some((check) => !check.passed)) {
      setError('Password does not meet the required strength rules.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await changePasswordRequest(
        accessToken,
        currentPassword,
        newPassword,
      );
      setSession(session);
      router.replace(getHomeRouteForUser(session.user));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
      <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
        Reset Password
      </p>
      <h2 className="mt-4 text-4xl font-semibold">First login required</h2>
      <p className="mt-4 text-base leading-7 text-[var(--ink-soft)]">
        {user
          ? `${user.firstName}, update your temporary password before entering ZenBooking.`
          : 'Update your password before continuing.'}
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {!user?.isFirstLogin ? (
          <div>
            <label className="mb-2 block text-sm font-medium">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />
          </div>
        ) : null}
        <div>
          <label className="mb-2 block text-sm font-medium">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
        </div>
        <div className="rounded-2xl bg-black/20 p-4 text-sm text-stone-300">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-white">Password strength</p>
            <span className="text-xs uppercase tracking-[0.25em] text-stone-400">
              {passedChecks}/{checks.length} checks
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${strengthPercent}%` }}
            />
          </div>
          <ul className="mt-3 space-y-2">
            {checks.map((check) => (
              <li
                key={check.label}
                className={check.passed ? 'text-emerald-300' : 'text-stone-400'}
              >
                {check.passed ? '✓' : '•'} {check.label}
              </li>
            ))}
          </ul>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </section>
  );
}
