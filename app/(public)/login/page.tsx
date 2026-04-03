'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { loginRequest } from '@/lib/auth/api';
import { getHomeRouteForUser } from '@/lib/auth/navigation';

/* ─── Feature bullets ─────────────────────────────── */
const brandPoints = [
  {
    color: 'amber',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Inquiry to Booking',
    desc: 'Capture, package and confirm in one workflow',
  },
  {
    color: 'blue',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Role-Based Access',
    desc: 'Super admin, company admin and employee roles',
  },
  {
    color: 'emerald',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
      </svg>
    ),
    title: 'Menu + Package Engine',
    desc: 'Fully configurable categories and item groups',
  },
];

const pointColors = {
  amber:   { wrap: 'bg-amber-50   border-amber-100',   icon: 'text-amber-600'   },
  blue:    { wrap: 'bg-blue-50    border-blue-100',    icon: 'text-blue-600'    },
  emerald: { wrap: 'bg-emerald-50 border-emerald-100', icon: 'text-emerald-600' },
};

/* ─── Page ────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const { isReady, setSession, user } = useAuth();

  const [identifier, setIdentifier]   = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [error, setError]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady || !user) return;
    router.replace(user.isFirstLogin ? '/reset-password' : getHomeRouteForUser(user));
  }, [isReady, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      const session = await loginRequest(identifier, password);
      setSession(session);
      router.replace(
        session.user.isFirstLogin ? '/reset-password' : getHomeRouteForUser(session.user),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative mx-auto grid w-full max-w-5xl gap-5 overflow-visible lg:grid-cols-[1fr_1fr] lg:items-stretch">

      {/* ══════════════════════════════
          LEFT — Brand Panel (order-2 on mobile so form comes first)
      ══════════════════════════════ */}
      <div className="order-2 lg:order-1 relative overflow-hidden rounded-[28px] bg-[linear-gradient(148deg,#0f172a_0%,#1e1b4b_60%,#0f172a_100%)] p-7 shadow-[0_24px_64px_rgba(15,23,42,0.28)] sm:p-8">

        {/* BG orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="zb-orb      absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(246,173,28,0.18),transparent_65%)]" />
          <div className="zb-orb-slow absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_65%)]" />
          <div className="zb-orb-d1   absolute right-1/4  top-1/2  h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.09),transparent_65%)]" />
        </div>

        <div className="relative z-10 flex h-full flex-col">

          {/* Brand mark */}
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
              Your entire banquet<br />
              operation in{' '}
              <span className="zb-gradient-text">one cockpit</span>
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Manage inquiries, bookings, menus, teams, and event-day execution — built for speed and mobile-first real operations.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="zb-fade-up-3 mt-7 space-y-3">
            {brandPoints.map((pt) => {
              const c = pointColors[pt.color as keyof typeof pointColors];
              return (
                <div key={pt.title} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${c.wrap} ${c.icon}`}>
                    {pt.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/90">{pt.title}</p>
                    <p className="text-[10px] text-white/45">{pt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating live stat card */}
          <div className="mt-auto pt-8">
            <div className="zb-float rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="zb-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <p className="text-[10px] font-medium text-white/50">Live platform snapshot</p>
                </div>
                <p className="text-[10px] text-white/35">Today</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { val: '12',  lbl: 'Bookings'  },
                  { val: '78%', lbl: 'Conversion' },
                  { val: '0',   lbl: 'Conflicts'  },
                ].map((s) => (
                  <div key={s.lbl} className="rounded-xl border border-white/10 bg-white/6 p-2.5 text-center">
                    <p className="text-base font-bold text-white">{s.val}</p>
                    <p className="mt-0.5 text-[9px] text-white/40">{s.lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT — Login Form (order-1 on mobile = renders first)
      ══════════════════════════════ */}
      <div className="order-1 lg:order-2 zb-scale-in rounded-[28px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94),rgba(239,246,255,0.92))] p-7 shadow-[0_24px_64px_rgba(148,163,184,0.18)] sm:p-8">

        {/* Form header */}
        <div className="zb-fade-up-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50 px-3.5 py-1.5 text-[10px] font-semibold text-amber-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="zb-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Secure Account Access
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your Banquate Booking System workspace and pick up right where you left off.
          </p>
        </div>

        {/* Divider */}
        <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Form */}
        <form className="zb-fade-up-2 space-y-5" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
              </svg>
              Email or Username
            </label>
            <input
              type="text"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              className="light-form-field w-full rounded-2xl px-4 py-3.5 text-[16px] text-slate-900 outline-none md:text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
              </svg>
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="light-form-field w-full rounded-2xl px-4 py-3.5 pr-12 text-[16px] text-slate-900 outline-none md:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                    <path d="M10.748 13.93l2.523 2.524a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-amber-600 transition hover:text-amber-700"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error */}
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="zb-btn-primary group relative w-full overflow-hidden rounded-2xl bg-(--zb-primary) px-4 py-4 text-sm font-bold text-slate-900 shadow-[0_12px_32px_rgba(246,173,28,0.38)] disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In to Banquate
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </form>

        {/* Footer note */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-emerald-500">
              <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
            </svg>
            JWT-secured session
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-emerald-500">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            Role-based workspace
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-emerald-500">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            Mobile-first platform
          </span>
        </div>
      </div>
    </section>
  );
}
