'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { fetchMyRestaurant } from '@/lib/auth/api';
import { Restaurant } from '@/lib/auth/types';

type NavLinkItem = {
  type: 'link';
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroupItem = {
  type: 'group';
  label: string;
  icon: React.ReactNode;
  children: NavLinkItem[];
};

type NavItem = NavLinkItem | NavGroupItem;

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

function IconChevronDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
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

function IconReceipt() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h.01" strokeWidth={2.5} />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a3 3 0 0 0 3-3h12a3 3 0 0 0 3 3v2a3 3 0 0 0-3 3H6a3 3 0 0 0-3-3V9z" />
      <path d="M13 6v12" />
      <path d="M10 9h.01M10 15h.01" />
    </svg>
  );
}

function IconShieldList() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6l7-3z" />
      <path d="M9 10h6M9 13h6M9 16h4" />
    </svg>
  );
}

function buildNavItems(
  role: string,
  canAccessCancelledBookings?: boolean,
  canAccessVoucherFlow?: boolean,
): NavItem[] {
  if (role === 'super_admin') {
    return [
      { type: 'link', href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
      { type: 'link', href: '/restaurants', label: 'Restaurants', icon: <IconBuilding /> },
      { type: 'link', href: '/audit-logs', label: 'Audit Logs', icon: <IconShieldList /> },
    ];
  }

  if (role === 'company_admin') {
    const items: NavItem[] = [
      { type: 'link', href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
      { type: 'link', href: '/bookings', label: 'Bookings', icon: <IconCalendar /> },
      { type: 'link', href: '/followups', label: 'Followups', icon: <IconBell /> },
      ...(canAccessCancelledBookings
        ? [
            {
              type: 'link' as const,
              href: '/customer-wallet',
              label: 'Customer Wallet',
              icon: <IconWallet />,
            },
          ]
        : []),
      { type: 'link', href: '/reports', label: 'Reports', icon: <IconReport /> },
      {
        type: 'group',
        label: 'Configuration',
        icon: <IconSettings />,
        children: [
          { type: 'link', href: '/categories', label: 'Categories', icon: <IconTag /> },
          { type: 'link', href: '/menus', label: 'Menus', icon: <IconMenu /> },
          { type: 'link', href: '/employees', label: 'Employees', icon: <IconUsers /> },
          { type: 'link', href: '/settings', label: 'Settings', icon: <IconSettings /> },
          { type: 'link', href: '/audit-logs', label: 'Audit Logs', icon: <IconShieldList /> },
        ],
      },
    ];

    return items;
  }

  return [
    { type: 'link', href: '/bookings', label: 'Bookings', icon: <IconCalendar /> },
    { type: 'link', href: '/followups', label: 'Followups', icon: <IconBell /> },
  ];
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatContactNumbers(restaurant: Restaurant | null) {
  if (!restaurant) return 'Not available';
  return restaurant.contactNumbers?.filter(Boolean).join(', ') || restaurant.contactPersonNumber || 'Not available';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [configOpen, setConfigOpen] = useState(() =>
    ['/categories', '/menus', '/employees', '/settings'].some((href) => pathname === href || pathname.startsWith(`${href}/`)),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileRestaurant, setProfileRestaurant] = useState<Restaurant | null>(null);
  const [sidebarRestaurant, setSidebarRestaurant] = useState<Restaurant | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const canAccessCancelledBookings =
    user?.canAccessCancelledBookings ?? sidebarRestaurant?.enableCancelledBookings ?? false;
  const canAccessVoucherFlow =
    user?.canAccessVoucherFlow ??
    ((sidebarRestaurant?.enableCancelledBookings ?? false) &&
      (sidebarRestaurant?.enableVoucherFlow ?? false));

  const navItems = useMemo(
    () => buildNavItems(user?.role ?? '', canAccessCancelledBookings, canAccessVoucherFlow),
    [canAccessCancelledBookings, canAccessVoucherFlow, user?.role],
  );

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
    if (['/categories', '/menus', '/employees', '/settings'].some((href) => pathname === href || pathname.startsWith(`${href}/`))) {
      setConfigOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin' || !user.restaurantId) {
      setSidebarRestaurant(null);
      return;
    }

    let isMounted = true;

    fetchMyRestaurant(accessToken)
      .then((restaurant) => {
        if (isMounted) {
          setSidebarRestaurant(restaurant);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSidebarRestaurant(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, user?.restaurantId, user?.role]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  function checkActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isGroupActive(children: NavLinkItem[]) {
    return children.some((child) => checkActive(child.href));
  }

  async function openProfileModal() {
    setProfileOpen(false);
    setProfileModalOpen(true);
    setProfileError('');

    if (!accessToken || !user?.restaurantId) {
      setProfileRestaurant(null);
      return;
    }

    try {
      setProfileLoading(true);
      const restaurant = await fetchMyRestaurant(accessToken);
      setProfileRestaurant(restaurant);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load profile details.');
    } finally {
      setProfileLoading(false);
    }
  }

  function handleConfigToggle(isMobile: boolean) {
    if (!isMobile && desktopSidebarCollapsed) {
      setDesktopSidebarCollapsed(false);
      setConfigOpen(true);
      return;
    }

    setConfigOpen((current) => !current);
  }

  function renderNavItem(item: NavItem, isMobile: boolean) {
    if (item.type === 'link') {
      const active = checkActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          onClick={() => {
            if (isMobile) {
              setSidebarOpen(false);
            }
          }}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
            active
              ? 'border border-amber-300 bg-amber-50 text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className={active ? 'text-amber-600' : 'text-slate-500'}>
            {item.icon}
          </span>
          {isMobile || !desktopSidebarCollapsed ? item.label : null}
        </Link>
      );
    }

    const groupActive = isGroupActive(item.children);
    const showChildren = isMobile || !desktopSidebarCollapsed ? configOpen : false;

    return (
      <div key={item.label} className="space-y-1">
        <button
          type="button"
          onClick={() => handleConfigToggle(isMobile)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
            groupActive
              ? 'border border-amber-300 bg-amber-50 text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className={groupActive ? 'text-amber-600' : 'text-slate-500'}>
            {item.icon}
          </span>
          {isMobile || !desktopSidebarCollapsed ? (
            <>
              <span className="min-w-0 flex-1">{item.label}</span>
              <span className="text-slate-400">
                {configOpen ? <IconChevronDown /> : <IconChevronRight />}
              </span>
            </>
          ) : null}
        </button>

        {showChildren ? (
          <div className="space-y-1 pl-4">
            {item.children.map((child) => {
              const active = checkActive(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => {
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-slate-400'}>
                    {child.icon}
                  </span>
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'ZB';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 flex h-16 flex-none items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
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

        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
            <img
              src={user?.restaurantLogoUrl || '/logo.png'}
              alt="Banquate Booking System"
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none text-slate-900">Banquate Booking System</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Powered By Zenovel Technolab
            </p>
          </div>
        </Link>

        <div className="flex-1" />

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
                  <p className="truncate text-xs capitalize text-slate-400">
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => void openProfileModal()}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="app-shell-height flex flex-1 overflow-hidden">
        <aside
          className={`app-shell-height sticky top-16 hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex ${
            desktopSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => renderNavItem(item, false))}
            </div>
          </nav>

          <div className="border-t border-slate-100 p-4">
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

        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="safe-pad-bottom fixed inset-y-0 left-0 z-[60] flex h-screen w-full max-w-[18rem] flex-col overflow-hidden bg-white shadow-2xl lg:hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                    <img
                      src={user?.restaurantLogoUrl || '/logo.png'}
                      alt="Banquate Booking System"
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px] object-contain"
                    />
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

              <nav className="flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="flex flex-col gap-1">
                  {navItems.map((item) => renderNavItem(item, true))}
                </div>
              </nav>
            </aside>
          </>
        )}

        <main className="app-shell-height safe-pad-bottom flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>

      {profileModalOpen ? (
        <CommonModal
          title="Profile"
          description="Review your account details and assigned restaurant information."
          onClose={() => setProfileModalOpen(false)}
          widthClassName="max-w-3xl"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                User Account
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user ? `${user.firstName} ${user.lastName}` : 'Not available'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {user?.role.replace('_', ' ') || 'Not available'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {user?.email || 'Not available'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Contact Number</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user?.contactNo || 'Not available'}
                  </p>
                </div>
              </div>
            </section>

            {profileLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading profile details...
              </div>
            ) : profileError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {profileError}
              </div>
            ) : user?.restaurantId ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                  Restaurant Profile
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Restaurant Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profileRestaurant?.name || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Booking Prefix</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profileRestaurant?.bookingPrefix || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Contact Numbers</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatContactNumbers(profileRestaurant)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Website</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {profileRestaurant?.website || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profileRestaurant?.address || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Subscription Start</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(profileRestaurant?.startDate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Subscription End</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(profileRestaurant?.endDate)}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No restaurant is assigned to this account.
              </div>
            )}
          </div>
        </CommonModal>
      ) : null}
    </div>
  );
}
