'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

type NavItem = { href: string; label: string; icon: React.ReactNode };

function IconGrid() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M9 21V7l6-4v18M9 7H5a2 2 0 0 0-2 2v12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.3.43.65.6 1 .1.31.15.64.15 1s-.05.69-.15 1c-.17.35-.36.7-.6 1Z" />
    </svg>
  );
}

function IconList() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconHamburger() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconPanelLeft() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="m14 12 3-3" />
      <path d="m14 12 3 3" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M10 19V10" />
      <path d="M16 19V7" />
      <path d="M22 19V3" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const NAV_CONFIG: Record<string, NavItem[]> = {
  super_admin: [
    { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
    { href: '/restaurants', label: 'Restaurants', icon: <IconBuilding /> },
  ],
  company_admin: [
    { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
    { href: '/bookings', label: 'Bookings', icon: <IconCalendar /> },
    { href: '/followups', label: 'Followups', icon: <IconBell /> },
    { href: '/categories', label: 'Categories', icon: <IconTag /> },
    { href: '/menus', label: 'Menus', icon: <IconMenu /> },
    { href: '/employees', label: 'Employees', icon: <IconUsers /> },
    { href: '/settings', label: 'Settings', icon: <IconSettings /> },
    { href: '/reports', label: 'Reports', icon: <IconReport /> },
  ],
  employee: [
    { href: '/bookings', label: 'Bookings', icon: <IconCalendar /> },
    { href: '/followups', label: 'Followups', icon: <IconBell /> },
  ],
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navItems = NAV_CONFIG[user?.role ?? ''] ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileOpen]);

  useEffect(() => {
    setSidebarOpen(false);
    setDesktopSidebarCollapsed(true);
  }, [pathname]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  function checkActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'ZB';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 flex h-16 flex-none items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
        {/* Navigation toggle */}
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth >= 1024) {
              setDesktopSidebarCollapsed((current) => !current);
            } else {
              setSidebarOpen(true);
            }
          }}
          aria-label="Open navigation"
          className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <span className="lg:hidden">
            <IconHamburger />
          </span>
          <span className="hidden lg:block">
            <IconPanelLeft />
          </span>
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
            <Image src="/logo.png" alt="Banquate Booking System" width={22} height={22} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none text-slate-900">Banquate Booking System</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Powered By Zenovel Technolab
            </p>
          </div>
        </Link>

        <div className="flex-1" />

        {/* User profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-none text-slate-900">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="mt-0.5 text-xs capitalize text-slate-400">
                {user?.role.replace('_', ' ')}
              </p>
            </div>
            <span className="text-slate-400">
              <IconChevronDown />
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="flex items-center gap-3 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] flex-1 overflow-hidden">
        {/* Sidebar — desktop */}
        <aside
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex ${
            desktopSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const active = checkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border border-amber-300 bg-amber-50 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={active ? 'text-amber-600' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  {!desktopSidebarCollapsed ? item.label : null}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="mt-auto border-t border-slate-100 p-4">
            <div className={`flex rounded-xl bg-slate-50 px-3 py-2.5 ${desktopSidebarCollapsed ? 'justify-center' : 'items-center gap-3'}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-bold text-white">
                {initials}
              </div>
              {!desktopSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="truncate text-[10px] capitalize text-slate-400">
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-x-0 bottom-0 left-0 top-16 z-50 flex w-72 flex-col bg-white shadow-2xl lg:hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                    <Image src="/logo.png" alt="Banquate Booking System" width={22} height={22} />
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <IconX />
                </button>
              </div>

              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((item) => {
                  const active = checkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'border border-amber-300 bg-amber-50 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className={active ? 'text-amber-600' : 'text-slate-500'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Sign out
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="h-[calc(100vh-4rem)] flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
