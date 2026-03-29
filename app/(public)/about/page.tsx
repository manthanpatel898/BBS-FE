const pillars = [
  {
    title: 'AI-assisted operational design',
    description:
      'Banquate Booking System is crafted to reduce manual follow-ups and repetitive decision fatigue by guiding teams through structured workflows.',
  },
  {
    title: 'Real-world banquet logic',
    description:
      'From inquiry capture to slot conflict checks and payment progression, every screen reflects actual banquet execution scenarios.',
  },
  {
    title: 'Scalable architecture',
    description:
      'NestJS + Next.js + MongoDB gives us a modular backbone that evolves quickly while keeping data isolated per restaurant.',
  },
];

export default function AboutPage() {
  return (
    <section className="space-y-8">
      <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(255,248,235,0.84),rgba(239,246,255,0.84))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]">About Banquate Booking System</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
          We are building the intelligent operating layer for banquet teams.
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
          Banquate Booking System is an AI-informed banquet management product focused on execution excellence.
          We help hospitality businesses replace scattered spreadsheets and fragmented chats with one
          unified system for inquiries, bookings, menus, team roles, and event coordination. Our mission
          is simple: make every booking faster to process, safer to confirm, and easier to deliver.
        </p>
        <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
          The platform is intentionally designed mobile-first because most operations happen on the move.
          From floor managers to admins, users can run day-to-day workflows confidently from phones and tablets
          without sacrificing visibility or control.
        </p>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-3xl border border-white/80 bg-[linear-gradient(155deg,rgba(255,255,255,0.92),rgba(255,248,235,0.8),rgba(240,249,255,0.82))] p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
          >
            <h2 className="text-xl font-semibold text-slate-900">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.description}</p>
          </article>
        ))}
      </div>

      <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,#fff8eb,#ffffff,#f0f9ff)] p-6 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-8">
        <p className="text-sm leading-8 text-slate-600">
          Banquate Booking System is developed by Zenovel Technolab — a product-minded engineering team that blends
          practical hospitality insights, modern UX principles, and scalable backend architecture. We are focused
          on long-term reliability, not just quick feature additions.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} Zenovel Technolab. All rights reserved. &nbsp;·&nbsp; Developed by Zenovel Technolab
        </p>
      </article>
    </section>
  );
}
