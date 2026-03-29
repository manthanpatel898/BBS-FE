import Image from 'next/image';
import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(246,173,28,0.2),transparent_30%),radial-gradient(circle_at_100%_8%,rgba(191,219,254,0.62),transparent_38%),radial-gradient(circle_at_18%_78%,rgba(254,226,226,0.55),transparent_32%),radial-gradient(circle_at_88%_72%,rgba(220,252,231,0.45),transparent_30%),linear-gradient(180deg,#fffef9_0%,#f8fafc_30%,#eef4ff_68%,#fdf2f8_100%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 rounded-[26px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,248,235,0.86),rgba(239,246,255,0.9))] px-4 py-3 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-xl border border-white/30 bg-white/80 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                <Image src="/logo.png" alt="Banquate Booking System" width={34} height={34} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.36em] text-[var(--accent)]">
                  Banquate
                </p>
                <p className="text-sm font-semibold text-[var(--ink)]">Booking System</p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <nav className="flex flex-wrap items-center gap-2 text-sm">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:border-[var(--accent)] hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/login"
                className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(246,173,28,0.4)] transition hover:brightness-105"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 py-8">{children}</main>

        <footer className="mt-8 rounded-[30px] border border-white/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.9),rgba(255,248,235,0.82),rgba(240,249,255,0.84))] p-6 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-md sm:p-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Banquate Booking System</p>
              <p className="mt-3 text-sm text-slate-600">
                Built for modern banquet teams to manage inquiries, bookings, menus, teams, and event timelines from one powerful panel.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Platform</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Inquiry to booking flow</p>
                <p>Calendar and list views</p>
                <p>Category and menu builder</p>
                <p>Role-based operations</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link href="/contact" className="text-slate-600 hover:text-slate-900">
                  Request product demo
                </Link>
                <Link href="/contact" className="text-slate-600 hover:text-slate-900">
                  Submit software inquiry
                </Link>
                <Link href="/about" className="text-slate-600 hover:text-slate-900">
                  Read product vision
                </Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Contact</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>+91 89809 38142</p>
                <p>info@zenoveltechnolab.com</p>
                <p>Ahmedabad, India</p>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Zenovel Technolab. All rights reserved.
            &nbsp;·&nbsp; Banquate Booking System &nbsp;·&nbsp; Developed by Zenovel Technolab
          </div>
        </footer>
      </div>
    </div>
  );
}
