import Link from 'next/link';
import type { CSSProperties } from 'react';
import { HomeMotion } from '@/components/public/home-motion';
import { HomeSolutionSwitcher } from '@/components/public/home-solution-switcher';
import { HomeFeedbackCarousel } from '@/components/public/home-feedback-carousel';
import { PwaInstallCta } from '@/components/pwa-install-cta';

const features = [
  ['Calendar & bookings', 'See inquiries, confirmed bookings, closed inquiries, hot dates, halls and time slots from one calendar.'],
  ['Follow-up workspace', 'Know who needs attention today, record every conversation and schedule the next action.'],
  ['Flexible menu planning', 'Use structured menus or flexible category builders, multiple meal packages, add-ons and custom prices.'],
  ['Payments & documents', 'Track advances and pending amounts, then create booking PDFs, reports and tax invoices.'],
  ['Decoration selection', 'Build visual decoration notes from catalog inventory or custom photos with descriptions and quantities.'],
  ['Reports & exports', 'Filter operational and financial reports, then export consistent CSV, Excel and PDF files.'],
  ['Teams & accountability', 'Use business-aware access, audit logs and employee activity without mixing company data.'],
  ['Partner inquiry pipeline', 'Share eligible banquet inquiries with connected decoration partners and remove manual handoffs.'],
];

const banquetStages = [
  { icon: '▣', label: 'Inquiry captured', description: 'Date, pax and event' },
  { icon: '▥', label: 'Hall confirmed', description: 'Slot availability checked' },
  { icon: '♨', label: 'Menu planned', description: 'Packages and add-ons' },
  { icon: '✓', label: 'Event ready', description: 'Order and invoice prepared' },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-20 pb-8 sm:space-y-28">
      <HomeMotion />

      <section className="relative overflow-hidden rounded-[32px] border border-white bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_45%,#eef6ff_100%)] px-5 py-10 shadow-[0_26px_80px_rgba(15,23,42,0.09)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="home-orb home-orb-one" aria-hidden="true" />
        <div className="home-orb home-orb-two" aria-hidden="true" />

        <div className="relative grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="home-hero-copy">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-bold text-amber-700 shadow-sm backdrop-blur">
              <span className="home-live-dot h-2 w-2 rounded-full bg-emerald-500" />
              Purpose-built for banquet and event teams
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              Turn every inquiry into a <span className="home-gradient-text">well-managed event.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              ZenBooking connects calendars, customers, follow-ups, menus, decoration selections,
              payments, reports, and documents—while keeping banquet and event-decoration companies
              completely separate.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-500 px-7 text-sm font-bold text-slate-950 shadow-[0_14px_34px_rgba(245,158,11,0.32)] transition hover:-translate-y-0.5 hover:bg-amber-400">Book a Free Demo</Link>
              <Link href="#solutions" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-bold text-slate-800 transition hover:border-slate-950">Explore Solutions</Link>
              <PwaInstallCta className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-bold text-slate-800 transition hover:border-slate-950" />
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {['Banquet operations', 'Event decoration', 'Mobile-first', 'Static-deployment ready'].map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-2">{item}</span>)}
            </div>
          </div>

          <div className="home-preview-wrap" aria-label="Illustrative ZenBooking workspace preview">
            <div className="home-product-preview rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_30px_70px_rgba(15,23,42,0.16)] sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Illustrative workspace</p><p className="mt-1 font-bold text-slate-950">Today&apos;s operations</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Live</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ['Calendar', 'Bookings by date'],
                  ['Follow-ups', 'Today’s actions'],
                  ['Payments', 'Advance tracking'],
                  ['Reports', 'Business overview'],
                ].map(([title, subtitle], index) => (
                  <div key={title} className="home-preview-card rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4" style={{ animationDelay: `${index * 180}ms` }}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-amber-400">{index + 1}</span>
                    <p className="mt-3 text-sm font-bold text-slate-950">{title}</p><p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">Next event</p><p className="mt-1 text-sm font-bold">Wedding Reception</p></div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px]">Confirmed</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="home-progress-bar h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" /></div>
              </div>
            </div>
            <div className="home-float-chip home-float-chip-one">Hall reserved</div>
            <div className="home-float-chip home-float-chip-two">Menu selected</div>
            <div className="home-float-chip home-float-chip-three">Advance received</div>
          </div>
        </div>
      </section>

      <section data-home-reveal className="home-reveal home-journey rounded-[30px] border border-slate-200 bg-white px-5 py-8 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:px-9 sm:py-10" aria-labelledby="banquet-flow-title">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">Built around the event journey</p>
          <h2 id="banquet-flow-title" className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">From inquiry to event-ready, one clear progression.</h2>
        </div>
        <div className="home-journey-track-wrap mt-9 sm:mt-11">
          <div className="home-journey-track" aria-hidden="true"><span className="home-journey-fill" /></div>
          <ul aria-label="Banquet event journey" className="home-journey-list">
            {banquetStages.map((stage, index) => (
              <li key={stage.label} role="listitem" className="home-journey-stage" style={{ '--journey-index': index } as CSSProperties}>
                <span className="home-journey-icon" aria-hidden="true">{stage.icon}</span>
                <div className="home-journey-copy">
                  <h3>{stage.label}</h3>
                  <p>{stage.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="solutions" data-home-reveal className="home-reveal scroll-mt-28">
        <div className="mb-8 text-center"><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">Two focused solutions</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">One platform. The right workflow for each business.</h2><p className="mx-auto mt-4 max-w-3xl leading-7 text-slate-600">Each company uses one business mode, with its own data, dashboard, settings, reports, and daily workflow.</p></div>
        <HomeSolutionSwitcher />
      </section>

      <section id="features" data-home-reveal className="home-reveal scroll-mt-28">
        <div className="grid gap-8 lg:grid-cols-[0.55fr_1fr]">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">Complete operations</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Everything your team needs to move an event forward.</h2><p className="mt-4 leading-7 text-slate-600">Use only the modules that match your company. Banquet and decoration businesses never see each other&apos;s unrelated tools.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map(([title, description], index) => (
              <article key={title} className="home-feature-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ transitionDelay: `${index * 30}ms` }}><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-xs font-black text-amber-800">{String(index + 1).padStart(2, '0')}</div><h3 className="mt-4 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" data-home-reveal className="home-reveal scroll-mt-28 rounded-[30px] border border-slate-200 bg-white p-5 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            ['Capture clearly', 'Start with the customer, event date, venue, timing, requirements, and the next follow-up.'],
            ['Plan confidently', 'Build menus or decorations with availability, pricing, payments, and operational context in view.'],
            ['Deliver professionally', 'Keep staff aligned and give customers consistent proposals, booking documents, and invoices.'],
          ].map(([title, description], index) => <article key={title} className="rounded-2xl bg-slate-50 p-5 sm:p-6"><p className="text-xs font-bold text-amber-700">STEP {index + 1}</p><h3 className="mt-3 text-xl font-bold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article>)}
        </div>
      </section>

      <section id="feedback" data-home-reveal className="home-reveal scroll-mt-28">
        <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">Customer stories</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Trusted by teams who run memorable events</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">Published only with customer approval, these stories reflect how banquet and decoration teams use ZenBooking in their daily work.</p></div>
        <HomeFeedbackCarousel />
      </section>

      <section data-home-reveal className="home-reveal overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a,#111827_55%,#92400e)] px-5 py-10 text-white sm:px-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">Built for the way your team works</p><h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Start on mobile at the entry desk. Continue on tablet or desktop in the office.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-300">Responsive screens, focused workflows, and company-specific modules keep the platform practical for daily operations.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-400 px-7 text-sm font-bold text-slate-950 transition hover:bg-amber-300">Book a Free Demo</Link><Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-bold text-white transition hover:bg-white/10">Login</Link></div>
        </div>
      </section>
    </div>
  );
}
