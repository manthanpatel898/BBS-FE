import Link from 'next/link';

/* ─── Data ─────────────────────────────────────────── */

const features = [
  {
    color: 'amber',
    badge: 'Core Flow',
    title: 'Inquiry to Booking in 3 Steps',
    description:
      'Capture lead details, map package menus, and confirm with advance collection — all in one frictionless workflow built for speed.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    color: 'blue',
    badge: 'Operations',
    title: 'Calendar + List Command Center',
    description:
      'Flip between a timeline-focused monthly view and detailed operational tables without losing any context about your events.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    color: 'purple',
    badge: 'Configuration',
    title: 'Package + Menu Engine',
    description:
      'Build category pricing, dynamic menu sections, and reusable item groups — a fully configurable engine tailored for banquet scale.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 3.75 9v11.25A2.25 2.25 0 0 0 6 22.5h12a2.25 2.25 0 0 0 2.25-2.25V9A2.25 2.25 0 0 0 20.25 6.878" />
      </svg>
    ),
  },
  {
    color: 'emerald',
    badge: 'Access Control',
    title: 'Role-Driven Team Control',
    description:
      'Super admin, company admin, and employee each get precisely the access they need — no more, no less. Fast and safe by design.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: '01',
    color: 'amber',
    title: 'Capture Inquiry',
    description:
      'Log customer inquiry with event date, pax count, function type, and requirements — in under a minute.',
  },
  {
    number: '02',
    color: 'blue',
    title: 'Build the Order',
    description:
      'Attach packages, menu sections, and item-wise selections with dynamic pricing calculated in real time.',
  },
  {
    number: '03',
    color: 'emerald',
    title: 'Confirm & Lock',
    description:
      'Collect advance, lock the slot, and let conflict-detection protect you from double-bookings automatically.',
  },
];

const stats = [
  { value: '78%',  label: 'Inquiry Conversion',  sub: 'Industry avg. 41%' },
  { value: '4 min', label: 'Avg Setup Time',      sub: 'Inquiry → confirmed' },
  { value: '93%',  label: 'Conflict Reduction',   sub: 'Slot protection logic' },
  { value: '100%', label: 'Mobile-First',          sub: 'Every screen, every device' },
];

const ticker = [
  'Inquiry to Booking', 'Calendar View', 'Menu Engine', 'Role-Based Access',
  'Advance Collection', 'Conflict Guard', 'Print-Ready Orders', 'Multi-Restaurant',
  'Package Builder', 'Team Control', 'Event Timeline', 'Real-Time Ops',
];

/* ─── Color maps ─────────────────────────────────────── */

const featureColors = {
  amber:   { wrap: 'border-amber-100   hover:border-amber-200',   icon: 'bg-amber-50   text-amber-600',   badge: 'bg-amber-100   text-amber-700'   },
  blue:    { wrap: 'border-blue-100    hover:border-blue-200',    icon: 'bg-blue-50    text-blue-600',    badge: 'bg-blue-100    text-blue-700'    },
  purple:  { wrap: 'border-purple-100  hover:border-purple-200',  icon: 'bg-purple-50  text-purple-600',  badge: 'bg-purple-100  text-purple-700'  },
  emerald: { wrap: 'border-emerald-100 hover:border-emerald-200', icon: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
};

const stepColors = {
  amber:   { num: 'bg-amber-500   text-white shadow-[0_8px_24px_rgba(246,173,28,0.38)]',   border: 'border-amber-100',   dot: 'bg-amber-300'   },
  blue:    { num: 'bg-blue-500    text-white shadow-[0_8px_24px_rgba(59,130,246,0.30)]',    border: 'border-blue-100',    dot: 'bg-blue-300'    },
  emerald: { num: 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.30)]',   border: 'border-emerald-100', dot: 'bg-emerald-300' },
};

/* ─── Page ───────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden pb-12 pt-2 sm:pb-16">

        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="zb-orb      absolute -left-24  -top-24  h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(246,173,28,0.16),transparent_68%)]" />
          <div className="zb-orb-slow absolute -right-20  top-8    h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.11),transparent_68%)]" style={{ animationDelay: '1.2s' }} />
          <div className="zb-orb-d1   absolute  left-1/3  bottom-0  h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.10),transparent_68%)]" />
          <div className="zb-orb-d2   absolute  right-1/4 bottom-8  h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_68%)]" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-14">

          {/* ── Left: Copy ── */}
          <div className="zb-fade-up-1">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2 text-xs font-semibold text-amber-700 shadow-[0_4px_14px_rgba(246,173,28,0.14)]">
              <span className="relative flex h-2 w-2">
                <span className="zb-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Mobile-First Banquet Operations Platform
            </div>

            {/* Headline */}
            <h1 className="text-[2.6rem] font-bold leading-[1.10] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Manage Every{' '}
              <span className="zb-gradient-text">Booking, Menu</span>
              <br className="hidden sm:block" />
              {' '}& Team From One{' '}
              <span className="relative whitespace-nowrap">
                Cockpit
                <svg viewBox="0 0 180 10" className="absolute -bottom-1 left-0 w-full" preserveAspectRatio="none" aria-hidden>
                  <path d="M 0 9 Q 90 1 180 9" stroke="#f6ad1c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                </svg>
              </span>
              .
            </h1>

            {/* Sub */}
            <p className="mt-6 max-w-[520px] text-base leading-8 text-slate-500 sm:text-lg">
              ZenBooking gives your banquet business a precision-built workspace
              for leads, bookings, menus, staff, and event-day execution — all in one powerful panel.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/contact"
                className="zb-btn-primary group inline-flex items-center gap-2.5 rounded-full bg-(--zb-primary) px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(246,173,28,0.42)] sm:px-8"
              >
                Book a Demo
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(148,163,184,0.12)] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white sm:px-8"
              >
                Launch Platform
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* Trust bullets */}
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              {[
                'No credit card required',
                'Mobile-first design',
                'Built for banquet scale',
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-emerald-500">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: Dashboard preview ── */}
          <div className="zb-scale-in">
            <div className="relative zb-float mx-auto max-w-[400px] lg:max-w-none">

              {/* Main card */}
              <div className="zb-shimmer rounded-[28px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94),rgba(239,246,255,0.92))] p-5 shadow-[0_24px_72px_rgba(148,163,184,0.22),0_0_0_1px_rgba(255,255,255,0.7)] sm:p-6">

                {/* Status bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="zb-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-xs font-medium text-slate-400">Live Operations</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    All Systems Active
                  </div>
                </div>

                {/* Active booking */}
                <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white/80 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">Wedding Reception</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">Sharma Family · 28 April</p>
                      <p className="mt-0.5 text-xs text-slate-500">250 pax · Banquet Hall A · Dinner</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Confirmed</span>
                  </div>
                  <div className="mt-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Advance collected</span>
                      <span className="font-medium text-slate-600">₹75,000</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                    </div>
                  </div>
                </div>

                {/* Mini stat grid */}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <MiniStat label="Today's Bookings" value="12" trend="up" />
                  <MiniStat label="Open Inquiries"   value="5"  />
                  <MiniStat label="Month Revenue"    value="₹4.2L" trend="up" />
                  <MiniStat label="Hall Utilization" value="84%" trend="up" />
                </div>

                {/* Quick action row */}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <button className="rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100">
                    + New Inquiry
                  </button>
                  <button className="rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                    View Calendar
                  </button>
                </div>
              </div>

              {/* Floating badge: Team */}
              <div className="zb-float-d1 absolute -left-5 top-16 rounded-2xl border border-white/90 bg-white p-3 shadow-[0_12px_36px_rgba(148,163,184,0.22)] sm:-left-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5 h-4 w-4 text-purple-500">
                      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Staff on duty</p>
                    <p className="text-xs font-bold text-slate-800">8 Active</p>
                  </div>
                </div>
              </div>

              {/* Floating badge: Conversion */}
              <div className="zb-float-d2 absolute -right-5 bottom-20 rounded-2xl border border-white/90 bg-white p-3 shadow-[0_12px_36px_rgba(148,163,184,0.22)] sm:-right-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-500">
                      <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 0 1 .919-.53l4.78 1.281a.75.75 0 0 1 .531.919l-1.281 4.78a.75.75 0 0 1-1.449-.387l.81-3.022a19.407 19.407 0 0 0-5.594 5.203.75.75 0 0 1-1.139.093L7 10.06l-4.72 4.72a.75.75 0 0 1-1.06-1.061l5.25-5.25a.75.75 0 0 1 1.06 0l3.074 3.073a20.923 20.923 0 0 1 5.545-4.931l-3.042-.815a.75.75 0 0 1-.53-.918Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Conversion rate</p>
                    <p className="text-xs font-bold text-emerald-600">↑ 78%</p>
                  </div>
                </div>
              </div>

              {/* Floating badge: Conflict-free */}
              <div className="zb-float-d3 absolute -right-5 top-8 rounded-2xl border border-white/90 bg-white p-3 shadow-[0_12px_36px_rgba(148,163,184,0.22)] sm:-right-10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-blue-500">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Double-bookings</p>
                    <p className="text-xs font-bold text-blue-600">Zero conflicts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TICKER / MARQUEE
      ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white/50 py-3 backdrop-blur-sm">
        <div className="zb-marquee inline-flex w-max">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={i} className="inline-flex shrink-0 items-center gap-2.5 px-5 text-sm font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
              {item}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0  w-14 bg-gradient-to-r from-white/90 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white/90 to-transparent" />
      </div>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16">
        <div className="text-center zb-fade-up-1">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-(--zb-primary)">
            Platform Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything your team needs,{' '}
            <span className="zb-gradient-text-warm">nothing they don&apos;t</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-slate-500">
            Built ground-up for banquet operations. Every feature solves a real daily challenge.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {features.map((f, i) => {
            const c = featureColors[f.color as keyof typeof featureColors];
            return (
              <article
                key={f.title}
                className={`zb-feature-card zb-scale-in-d${Math.min(i + 1, 3) as 1 | 2 | 3} rounded-3xl border ${c.wrap} bg-[linear-gradient(155deg,rgba(255,255,255,0.98),rgba(255,255,255,0.90))] p-6 shadow-[0_8px_32px_rgba(148,163,184,0.11)] sm:p-7`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.icon}`}>
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 sm:text-[1.05rem]">{f.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${c.badge}`}>
                        {f.badge}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm leading-7 text-slate-500">{f.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-(--zb-primary)">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From inquiry to booking in{' '}
            <span className="zb-gradient-text-warm">3 clean steps</span>
          </h2>
        </div>

        <div className="relative mt-10">
          {/* Connecting line — desktop */}
          <div className="absolute top-8 left-[calc(50%/3+2rem)] right-[calc(50%/3+2rem)] hidden h-px bg-gradient-to-r from-amber-200 via-blue-200 to-emerald-200 sm:block" aria-hidden />

          <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, i) => {
              const c = stepColors[step.color as keyof typeof stepColors];
              return (
                <div
                  key={step.number}
                  className={`relative rounded-3xl border ${c.border} bg-[linear-gradient(155deg,rgba(255,255,255,0.98),rgba(255,255,255,0.88))] p-6 shadow-[0_8px_32px_rgba(148,163,184,0.11)] transition hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(148,163,184,0.18)]`}
                  style={{ transitionDuration: '280ms' }}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${c.num}`}>
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 sm:text-[1.05rem]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{step.description}</p>

                  {/* Arrow connector (mobile, between cards) */}
                  {i < steps.length - 1 && (
                    <div className="mt-4 flex justify-center sm:hidden" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-300" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAND
      ══════════════════════════════════════════ */}
      <section className="rounded-[32px] border border-white/80 bg-[linear-gradient(148deg,rgba(255,255,255,0.96),rgba(255,248,235,0.90),rgba(239,246,255,0.88))] p-8 shadow-[0_20px_64px_rgba(148,163,184,0.18)] sm:p-10 sm:py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{s.label}</p>
              <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DARK CTA
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden rounded-[32px] px-6 py-14 text-center sm:px-12 sm:py-20"
        style={{ background: 'linear-gradient(148deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)' }}
      >
        {/* BG orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="zb-orb      absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(246,173,28,0.14),transparent_68%)]" />
          <div className="zb-orb-slow absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.10),transparent_68%)]" />
          <div className="zb-orb-d1   absolute  left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.07),transparent_68%)]" />
        </div>

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-amber-400">
            Ready to upgrade?
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Transform your banquet operations{' '}
            <span className="zb-gradient-text">starting today</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-slate-400">
            Join banquet teams already using ZenBooking to streamline operations, eliminate conflicts,
            and close bookings faster than ever before.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="zb-btn-primary group inline-flex items-center gap-2.5 rounded-full bg-(--zb-primary) px-8 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(246,173,28,0.45)] sm:text-base"
            >
              Book a Demo
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-base"
            >
              Launch Platform
            </Link>
          </div>

          {/* Mini trust row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            {['No setup fees', 'Dedicated onboarding', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-amber-500">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

function MiniStat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/80 p-3 backdrop-blur-sm">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="text-sm font-bold text-slate-900">{value}</p>
        {trend === 'up' && (
          <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3 text-emerald-500">
            <path d="M6 1.5L10.5 8.5H1.5L6 1.5Z" />
          </svg>
        )}
      </div>
    </div>
  );
}
