'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import {
  fetchCancelledAdvanceDashboard,
  fetchDashboardRecords,
  fetchMyRestaurant,
  fetchOrderById,
  fetchRestaurantStats,
  fetchOrderReports,
  fetchOrderStats,
} from '@/lib/auth/api';
import {
  CancelledAdvanceDashboard,
  DashboardRecords,
  DashboardRecordType,
  Order,
  RestaurantStats,
  OrderReports,
  OrderStats,
  Restaurant,
} from '@/lib/auth/types';

// ─── Shared ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) {
    return '0m';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  return `${(minutes / 60).toFixed(1)}h`;
}

function formatDays(value: number) {
  if (!value || value <= 0) {
    return '0d';
  }

  return `${value.toFixed(1)}d`;
}

function SkeletonCard() {
  return <div className="animate-pulse rounded-2xl border border-slate-100 bg-white h-36 shadow-sm" />;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub?: string;
  detail?: string;
  progressPercent?: number;
  delay?: string;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  sub,
  detail,
  progressPercent,
  delay = '',
  onClick,
}: StatCardProps) {
  const content = (
    <div className="flex min-h-[78px] items-center gap-3 sm:gap-4">
      <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] sm:h-14 sm:w-14 ${iconBg}`}>
        <span className={`${iconColor} [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6`}>
          {icon}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-slate-400 sm:text-base">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-slate-900 sm:text-3xl">
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-xs font-medium text-slate-400">{sub}</p> : null}
        {detail ? (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">{detail}</p>
          {typeof progressPercent === 'number' ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
              />
            </div>
          ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`zb-fade-up-1 rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-2 focus:ring-amber-300 sm:p-4 ${delay}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`zb-fade-up-1 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.055)] transition-shadow hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] sm:p-4 ${delay}`}
    >
      {content}
    </div>
  );
}

function AdvanceBreakdownCard({
  total,
  items,
  title,
  subtitle,
}: {
  total: number;
  items: Array<{ label: string; amount: number; count: number }>;
  title: string;
  subtitle: string;
}) {
  const [isOnlineExpanded, setIsOnlineExpanded] = useState(false);
  const cashItem = items.find((item) => item.label.trim().toLowerCase() === 'cash');
  const onlineItems = items.filter((item) => item.label.trim().toLowerCase() !== 'cash');
  const cashAmount = cashItem?.amount ?? 0;
  const cashCount = cashItem?.count ?? 0;
  const onlineAmount = onlineItems.reduce((sum, item) => sum + item.amount, 0);
  const onlineCount = onlineItems.reduce((sum, item) => sum + item.count, 0);
  const maxOnlineAmount = Math.max(...onlineItems.map((item) => item.amount), 1);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-2.5">
            <span className="text-blue-600">
              <TrendingUpIcon />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{formatCurrency(total)}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
          <p className="mt-1 text-xs text-slate-500">{cashCount + onlineCount} payment{cashCount + onlineCount === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cash</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(cashAmount)}</p>
          <p className="mt-1 text-xs text-slate-500">{cashCount} payment{cashCount === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOnlineExpanded((current) => !current)}
          aria-expanded={isOnlineExpanded}
          className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Online</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(onlineAmount)}</p>
              <p className="mt-1 text-xs text-blue-600">{onlineCount} payment{onlineCount === 1 ? '' : 's'}</p>
            </div>
            <span className="mt-1 text-xs font-semibold text-blue-600">
              {isOnlineExpanded ? 'Hide' : 'View'}
            </span>
          </div>
        </button>
      </div>

      {isOnlineExpanded ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Online payment breakdown</p>
            <p className="mt-0.5 text-xs text-slate-500">All payment modes except Cash</p>
          </div>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming confirmed advance payments found.</p>
        ) : (
          onlineItems.length === 0 ? (
            <p className="text-sm text-slate-400">No online advance payments found.</p>
          ) : onlineItems.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-700">{item.label}</p>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-400">{item.count} payment{item.count === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-400"
                  style={{
                    width: `${Math.max((item.amount / maxOnlineAmount) * 100, item.amount > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
        </div>
      ) : null}
    </section>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M9 21V7l6-4v18M9 7H5a2 2 0 0 0-2 2v12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.31 8a6 6 0 0 0-4.62 0M9.69 16a6 6 0 0 0 4.62 0M12 8v1m0 6v1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function BarChart({
  title,
  subtitle,
  items,
  valuePrefix = '',
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; helper: string }>;
  valuePrefix?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400">{item.helper}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-700">
                {valuePrefix}{item.value.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VerticalBarChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; helper: string }>;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col items-center gap-3">
            <div className="flex h-48 w-full items-end justify-center rounded-2xl bg-slate-50 px-3 py-3">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-amber-400 via-orange-400 to-rose-400"
                style={{
                  height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0)}%`,
                }}
              />
            </div>
            <div className="w-full text-center">
              <p className="text-lg font-bold text-slate-900">{formatCurrency(item.value)}</p>
              <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500">{item.helper}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparisonChart({
  title,
  subtitle,
  current,
  previous,
}: {
  title: string;
  subtitle: string;
  current: { label: string; revenue: number; bookings: number };
  previous: { label: string; revenue: number; bookings: number };
}) {
  const maxRevenue = Math.max(current.revenue, previous.revenue, 1);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[current, previous].map((entry, index) => (
          <div
            key={entry.label}
            className={`rounded-2xl border p-4 ${index === 0 ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-slate-50'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {entry.label}
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {formatCurrency(entry.revenue)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{entry.bookings} bookings</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80">
              <div
                className={`h-full rounded-full ${index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`}
                style={{ width: `${Math.max((entry.revenue / maxRevenue) * 100, entry.revenue > 0 ? 10 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Super Admin Dashboard ────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ endDate }: { endDate: string }) {
  const days = daysUntil(endDate);
  if (days <= 7) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
        {days}d left
      </span>
    );
  }
  if (days <= 15) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
      {days}d left
    </span>
  );
}

function RestaurantRow({ restaurant, index }: { restaurant: Restaurant; index: number }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{restaurant.name}</p>
        <p className="truncate text-xs text-slate-400">{restaurant.address}</p>
      </div>
      <div className="shrink-0 text-right">
        <ExpiryBadge endDate={restaurant.endDate} />
        <p className="mt-0.5 text-xs text-slate-400">
          Ends {new Date(restaurant.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function RecentRow({ restaurant, index }: { restaurant: Restaurant; index: number }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{restaurant.name}</p>
        <p className="truncate text-xs text-slate-400">{restaurant.contactPersonName}</p>
      </div>
      <div className="shrink-0">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${restaurant.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          {restaurant.isActive ? 'Active' : 'Inactive'}
        </span>
        <p className="mt-0.5 text-right text-xs text-slate-400">
          {new Date(restaurant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </div>
    </div>
  );
}

function SuperAdminDashboard({ stats, loading }: { stats: RestaurantStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-400">Unable to load dashboard stats. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Restaurants"
          value={stats.total}
          icon={<BuildingIcon />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          sub="All time registered"
          delay="zb-fade-up-1"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<CheckCircleIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="Currently operational"
          delay="zb-fade-up-2"
        />
        <StatCard
          label="Added This Month"
          value={stats.addedThisMonth}
          icon={<PlusCircleIcon />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="New this billing cycle"
          delay="zb-fade-up-3"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.expiringSoon}
          icon={<ClockIcon />}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          sub="Within next 30 days"
          delay="zb-fade-up-4"
        />
      </div>

      {/* Expired */}
      {stats.expired > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-red-500"><AlertIcon /></span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {stats.expired} restaurant{stats.expired !== 1 ? 's' : ''} ha{stats.expired !== 1 ? 've' : 's'} expired
              </p>
              <p className="text-xs text-red-500 mt-0.5">These subscriptions need renewal to restore access.</p>
            </div>
            <Link href="/restaurants" className="ml-auto shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
              Manage
            </Link>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expiring soon list */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Renewals Coming Up</h3>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
              Next 30 days
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-400">Restaurants expiring soon — contact to renew</p>
          {stats.expiringSoonList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No restaurants expiring soon.</p>
          ) : (
            <div>
              {stats.expiringSoonList.map((r, i) => (
                <RestaurantRow key={r.id} restaurant={r} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Recently added */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recently Added</h3>
            <Link href="/restaurants" className="text-xs font-medium text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          <p className="mb-4 text-xs text-slate-400">Latest restaurants added to the platform</p>
          {stats.recentlyAdded.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No restaurants added yet.</p>
          ) : (
            <div>
              {stats.recentlyAdded.map((r, i) => (
                <RecentRow key={r.id} restaurant={r} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Advance Summary Card ─────────────────────────────────────────────────────

function CancelledAdvanceDashboardSection({
  data,
}: {
  data: CancelledAdvanceDashboard | null;
}) {
  if (!data) return null;

  const maxValue = Math.max(
    ...data.monthly.flatMap((item) => [
      item.cancelledAdvance,
      item.pendingAmount,
      item.paidBack,
    ]),
    1,
  );

  const pendingPct = data.totalCancelledAdvance > 0
    ? (data.totalPendingAmount / data.totalCancelledAdvance) * 100
    : 0;
  const paidBackPct = data.totalCancelledAdvance > 0
    ? (data.totalPaidBack / data.totalCancelledAdvance) * 100
    : 0;
  const maxMethodAmount = Math.max(
    ...(data.paidBackByMethod ?? []).map((item) => item.amount),
    1,
  );
  const maxPendingMethodAmount = Math.max(
    ...(data.pendingByMethod ?? []).map((item) => item.amount),
    1,
  );

  const summaryItems = [
    {
      label: 'Cancelled Advance',
      value: data.totalCancelledAdvance,
      helper: `${data.totalBookings} booking${data.totalBookings === 1 ? '' : 's'}`,
      color: 'text-slate-900',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
    },
    {
      label: 'Pending With Company',
      value: data.totalPendingAmount,
      helper: `${pendingPct.toFixed(1)}% still open`,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      label: 'Paid Back',
      value: data.totalPaidBack,
      helper: `${paidBackPct.toFixed(1)}% resolved`,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Cancelled Advance Dashboard</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {data.year}: cancelled booking advance, customer paybacks, and pending balance held by the company.
          </p>
        </div>
        <Link
          href="/reports/view"
          className="inline-flex w-fit items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700"
        >
          Open Treasury Report
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <div key={item.label} className={`rounded-xl border ${item.border} ${item.bg} p-4`}>
            <p className="text-xs font-semibold text-slate-600">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Paid Back Methods</h4>
            <p className="mt-0.5 text-xs text-slate-500">How the cancelled advance was settled.</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-blue-700">{formatCurrency(data.totalPaidBack)}</p>
        </div>
        {(data.paidBackByMethod ?? []).length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.paidBackByMethod.map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.count} entr{item.count === 1 ? 'y' : 'ies'}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-blue-700">{formatCurrency(item.amount)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.max((item.amount / maxMethodAmount) * 100, item.amount > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
            No paid back entries recorded for this year.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Pending With Company Methods</h4>
            <p className="mt-0.5 text-xs text-slate-500">Original advance payment methods still held by the company.</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-amber-700">{formatCurrency(data.totalPendingAmount)}</p>
        </div>
        {(data.pendingByMethod ?? []).length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.pendingByMethod.map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.count} pending entr{item.count === 1 ? 'y' : 'ies'}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-amber-700">{formatCurrency(item.amount)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.max((item.amount / maxPendingMethodAmount) * 100, item.amount > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
            No pending company balance recorded for this year.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Cancelled</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Pending</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Paid Back</span>
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="grid min-w-[900px] grid-cols-12 gap-3">
            {data.monthly.map((item) => {
              const bars = [
                { value: item.cancelledAdvance, cls: 'bg-slate-500', label: 'Cancelled' },
                { value: item.pendingAmount, cls: 'bg-amber-500', label: 'Pending' },
                { value: item.paidBack, cls: 'bg-blue-500', label: 'Paid Back' },
              ];

              return (
              <div key={item.month} className="flex min-w-0 flex-col items-center gap-3">
                <div className="flex h-56 w-full items-end justify-center gap-1.5 rounded-xl bg-white px-2 py-3">
                  {bars.map((bar) => (
                    <div
                      key={bar.label}
                      className="group/bar relative flex h-full w-1/3 items-end justify-center"
                    >
                      <div
                        className={`w-full rounded-t-md ${bar.cls} transition-opacity hover:opacity-80`}
                        style={{
                          height: `${Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 8 : 0)}%`,
                        }}
                        title={`${item.month} ${bar.label}: ${formatCurrency(bar.value)}`}
                      />
                      <div className="pointer-events-none absolute left-1/2 top-2 z-20 hidden min-w-max -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center shadow-lg group-hover/bar:block">
                        <p className="text-[11px] font-semibold text-slate-500">{item.month} · {bar.label}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">{formatCurrency(bar.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-full text-center">
                  <p className="text-sm font-bold text-slate-900">{item.month}</p>
                  <p className="text-xs text-slate-500">{item.bookings} booking{item.bookings === 1 ? '' : 's'}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{formatCurrency(item.pendingAmount)}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Company Admin Dashboard ──────────────────────────────────────────────────

const DASHBOARD_RECORD_LIMIT = 50;

const dashboardRecordMeta: Record<DashboardRecordType, {
  label: string;
  subtitle: string;
  empty: string;
  statusLabel: string;
  cardClassName: string;
  badgeClassName: string;
}> = {
  inquiries: {
    label: 'Total Inquiries',
    subtitle: 'Active inquiries from today onward',
    empty: 'No active inquiries from today onward.',
    statusLabel: 'INQUIRY',
    cardClassName: 'border-amber-300 bg-amber-50/35',
    badgeClassName: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  confirmed: {
    label: 'Confirm Bookings',
    subtitle: 'Confirmed bookings from today onward',
    empty: 'No confirmed bookings from today onward.',
    statusLabel: 'CONFIRMED',
    cardClassName: 'border-emerald-300 bg-emerald-50/45',
    badgeClassName: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  followups: {
    label: 'Follow Ups Due Today',
    subtitle: 'Due today, overdue, or waiting for a next date',
    empty: 'No follow ups are due today.',
    statusLabel: 'FOLLOW UP PENDING',
    cardClassName: 'border-slate-200 bg-white',
    badgeClassName: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  cancelled: {
    label: 'Cancelled Inquiries',
    subtitle: 'Cancelled bookings and closed inquiries from today onward',
    empty: 'No cancelled inquiries from today onward.',
    statusLabel: 'CANCELLED',
    cardClassName: 'border-red-300 bg-red-50/45',
    badgeClassName: 'border-red-300 bg-red-50 text-red-700',
  },
  completed: {
    label: 'Completed Event',
    subtitle: 'Past completed events',
    empty: 'No completed past events found.',
    statusLabel: 'COMPLETED',
    cardClassName: 'border-slate-300 bg-slate-50',
    badgeClassName: 'border-slate-300 bg-slate-900 text-white',
  },
};

function getRecordDate(order: Order) {
  return order.eventDate ?? order.inquiryDate ?? order.confirmedAt ?? null;
}

function getDateKey(value: string | null) {
  if (!value) return 'unknown';
  return value.slice(0, 10);
}

function hasFollowUpTakenToday(order: Order) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return order.followUps.some((followUp) => followUp.date.slice(0, 10) === todayKey);
}

function getFollowUpDueDate(order: Order) {
  const latestFollowUp = [...order.followUps].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  return latestFollowUp?.nextFollowUpDate ?? order.eventDate ?? order.inquiryDate ?? order.createdAt;
}

function formatRecordDate(dateKey: string) {
  if (dateKey === 'unknown') return 'Date not set';

  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return `Today, ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  if (date.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(value: string | null) {
  if (!value) return null;
  const [hoursValue, minutesValue] = value.split(':');
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getTimeRange(order: Order) {
  const start = formatTimeLabel(order.startTime);
  const end = formatTimeLabel(order.endTime);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} onwards`;
  if (end) return `Until ${end}`;
  return 'Time not set';
}

function getCustomerName(order: Order) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim() || 'Guest';
}

function formatDetailDate(value: string | null) {
  if (!value) return 'Not set';

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusPillClasses(order: Order) {
  if (order.status === 'INQUIRY' && order.inquiryClosed) {
    return 'border-slate-300 bg-slate-900 text-white';
  }

  if (order.status === 'CONFIRMED') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }

  if (order.status === 'CANCELLED') {
    return 'border-red-300 bg-red-50 text-red-700';
  }

  if (order.status === 'COMPLETED') {
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }

  return 'border-amber-300 bg-amber-50 text-amber-700';
}

function menuStatusLabel(order: Order) {
  return order.menuSelectionSnapshot.length > 0 ? 'Menu Selected' : 'Menu Pending';
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
        {value ?? 'Not set'}
      </p>
    </div>
  );
}

function groupOrdersByDate(orders: Order[], type: DashboardRecordType) {
  return orders.reduce<Array<{ dateKey: string; orders: Order[] }>>((groups, order) => {
    const dateKey = getDateKey(type === 'followups' ? getFollowUpDueDate(order) : getRecordDate(order));
    const existing = groups.find((group) => group.dateKey === dateKey);

    if (existing) {
      existing.orders.push(order);
    } else {
      groups.push({ dateKey, orders: [order] });
    }

    return groups;
  }, []);
}

function DashboardRecordCard({
  order,
  type,
  onOpen,
}: {
  order: Order;
  type: DashboardRecordType;
  onOpen: (orderId: string) => void;
}) {
  const meta = dashboardRecordMeta[type];
  const statusLabel =
    order.status === 'INQUIRY' && order.inquiryClosed
      ? 'CLOSED INQUIRY'
      : type === 'followups' && hasFollowUpTakenToday(order)
        ? 'FOLLOW UP TAKEN'
        : meta.statusLabel;
  const badgeClassName =
    type === 'followups' && hasFollowUpTakenToday(order)
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : meta.badgeClassName;
  const hasMenuSelection = order.menuSelectionSnapshot.length > 0;
  const eventLabel = order.functionName?.trim() || order.eventType?.trim() || 'Event details pending';

  return (
    <button
      type="button"
      onClick={() => onOpen(order.id)}
      className={`block w-full rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 sm:p-4 ${meta.cardClassName}`}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-bold text-slate-950 sm:text-[15px]">{getCustomerName(order)}</h4>
          <p className="mt-1.5 break-words text-sm font-medium text-slate-600">{eventLabel}</p>
          <p className="mt-1 break-words text-xs font-medium text-slate-500">
            {getTimeRange(order)} <span className="text-slate-400">•</span> {order.pax ? `${order.pax} pax` : 'pax not set'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-[180px] sm:justify-end">
          <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${badgeClassName}`}>
            {statusLabel}
          </span>
          {hasMenuSelection ? (
            <span className="inline-flex min-h-7 items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Menu Selected
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 space-y-1 text-xs text-slate-950 sm:text-sm">
        <p><span className="font-bold">Service Slot:</span> {order.serviceSlot || 'Not set'}</p>
        <p><span className="font-bold">Hall Details:</span> {order.hallDetails || 'Not set'}</p>
        <p className="text-[11px] font-semibold text-slate-500">Booking ID: {order.orderId}</p>
      </div>
    </button>
  );
}

function DashboardBookingDetailModal({
  order,
  loading,
  error,
  onClose,
}: {
  order: Order | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <CommonModal
      title="Event Detail"
      onClose={onClose}
      widthClassName="max-w-4xl"
      contentClassName="max-h-[72vh] overflow-y-auto pr-1"
    >
      {loading && !order ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-400">
          Loading booking details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : order ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClasses(order)}`}>
              {order.status === 'INQUIRY' && order.inquiryClosed ? 'CLOSED INQUIRY' : order.status}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {menuStatusLabel(order)}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Inquiry Details
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {order.functionName || order.eventType || 'Booking details pending'}
                </p>
              </div>
              <div className="min-w-[170px] rounded-xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Package</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {order.categorySnapshot?.name ||
                    (order.inquiryCustomPrice !== null ? 'Custom Price' : 'Package pending')}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <DetailField label="Customer" value={getCustomerName(order)} />
              <DetailField label="Mobile" value={order.customer.phone} />
              <DetailField label="Event Date" value={formatDetailDate(order.eventDate ?? order.inquiryDate)} />
              <DetailField label="Time" value={getTimeRange(order)} />
              <DetailField label="Service Slot" value={order.serviceSlot || 'Service slot pending'} />
              <DetailField label="Hall" value={order.hallDetails || 'Hall details pending'} />
              <DetailField label="PAX" value={order.pax ?? 'Pending'} />
              <DetailField
                label="Price"
                value={formatCurrency(
                  order.customPricePerPlate !== null
                    ? order.customPricePerPlate
                    : order.inquiryCustomPrice !== null
                      ? order.inquiryCustomPrice
                      : order.pricePerPlate,
                )}
              />
              <DetailField label="Booking ID" value={order.orderId} />
              <DetailField label="Booking Taken By" value={order.bookingTakenBy} />
              {order.confirmedAt ? (
                <DetailField label="Confirmed" value={formatDetailDate(order.confirmedAt)} />
              ) : null}
              {order.referenceBy ? <DetailField label="Reference" value={order.referenceBy} /> : null}
            </div>

            {order.addonServiceSnapshots.length > 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-slate-500">Addons: </span>
                {order.addonServiceSnapshots
                  .map((item) => `${item.label} (${formatCurrency(item.price)})`)
                  .join(', ')}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Menu Snapshot
              </p>
              {order.menuSelectionSnapshot.length > 0 ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {order.menuSelectionSnapshot.length} menu{order.menuSelectionSnapshot.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {order.menuSelectionSnapshot.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 md:col-span-2">
                  No menu selected yet.
                </p>
              ) : (
                order.menuSelectionSnapshot.map((menu) => (
                  <div key={menu.menuId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <h3 className="text-sm font-semibold text-slate-900">{menu.title}</h3>
                    <div className="mt-2 grid gap-x-4 gap-y-2 text-sm text-slate-700 xl:grid-cols-2">
                      {menu.sections.map((section) => (
                        <div key={`${menu.menuId}-${section.sectionTitle}`} className="min-w-0">
                          {section.sectionTitle.trim().toLowerCase() !== menu.title.trim().toLowerCase() ? (
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              {section.sectionTitle}
                            </p>
                          ) : null}
                          <p className="mt-0.5 leading-5">{section.items.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {order.additionalInformation || order.notes || order.cancelReason ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </p>
              {order.additionalInformation ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.additionalInformation}</p>
              ) : null}
              {order.notes && order.notes !== order.additionalInformation ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.notes}</p>
              ) : null}
              {order.cancelReason ? (
                <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Cancel reason: {order.cancelReason}
                </p>
              ) : null}
            </div>
          ) : null}

          {order.followUps.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Follow Ups
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-2 font-medium">By</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Next</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...order.followUps].reverse().map((followUp, index) => (
                      <tr key={`${followUp.createdAt}-${index}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-slate-700">{followUp.followUpByName}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDetailDate(followUp.date)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDetailDate(followUp.nextFollowUpDate)}</td>
                        <td className="px-3 py-3 text-slate-700">{followUp.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {order.status !== 'COMPLETED' ? (
          <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_-14px_30px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Actions
              </p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {order.orderId}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {order.status === 'CONFIRMED' ? (
                <>
                  <Link
                    href={`/print/order?id=${order.id}`}
                    target="_blank"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Print
                  </Link>
                  <Link
                    href={`/print/order?id=${order.id}&copy=kitchen`}
                    target="_blank"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Kitchen Print
                  </Link>
                  {order.status === 'CONFIRMED' ? (
                    <>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        Add Advance
                      </Link>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
                      >
                        Sign
                      </Link>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Transfer
                      </Link>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Select Menu
                      </Link>
                      <Link
                        href={`/bookings?open=${order.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                      >
                        Cancel
                      </Link>
                    </>
                  ) : null}
                </>
              ) : null}
              {order.status === 'INQUIRY' && !order.inquiryClosed ? (
                <>
                  <Link
                    href={`/bookings?open=${order.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  >
                    Confirm Inquiry
                  </Link>
                  <Link
                    href={`/bookings?open=${order.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Transfer
                  </Link>
                  <Link
                    href={`/bookings?open=${order.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Edit Inquiry
                  </Link>
                  <Link
                    href={`/bookings?open=${order.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Choose Category
                  </Link>
                  <Link
                    href={`/bookings?open=${order.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                  >
                    Cancel
                  </Link>
                </>
              ) : null}
              {order.status === 'CANCELLED' || order.inquiryClosed ? (
                <Link
                  href={order.status === 'CANCELLED' ? '/cancelled-bookings' : `/bookings?open=${order.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                >
                  {order.status === 'CANCELLED' ? 'Manage Cancellation' : 'View Closed Inquiry'}
                </Link>
              ) : null}
            </div>
          </div>
          ) : null}
        </div>
      ) : null}
    </CommonModal>
  );
}

function DashboardRecordsPanel({
  selectedType,
  records,
  loading,
  error,
  page,
  onBack,
  onPageChange,
  onOpenOrder,
}: {
  selectedType: DashboardRecordType;
  records: DashboardRecords | null;
  loading: boolean;
  error: string | null;
  page: number;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const meta = dashboardRecordMeta[selectedType];
  const groups = useMemo(
    () => groupOrdersByDate(records?.items ?? [], selectedType),
    [records?.items, selectedType],
  );
  const pagination = records?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <section className="space-y-5">
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
          {meta.empty}
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                  {formatRecordDate(group.dateKey)}
                </h3>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {group.orders.map((order) => (
                  <DashboardRecordCard
                    key={order.id}
                    order={order}
                    type={selectedType}
                    onOpen={onOpenOrder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.total > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            Showing page {pagination.page} of {totalPages}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CompanyAdminDashboard({
  stats,
  reports,
  restaurant,
  cancelledAdvanceDashboard,
  loading,
  selectedYear,
  selectedRecordType,
  dashboardRecords,
  dashboardRecordsLoading,
  dashboardRecordsError,
  dashboardRecordsPage,
  onSelectRecordType,
  onBackToDashboard,
  onDashboardRecordsPageChange,
  onOpenDashboardOrder,
}: {
  stats: OrderStats | null;
  reports: OrderReports | null;
  restaurant: Restaurant | null;
  cancelledAdvanceDashboard: CancelledAdvanceDashboard | null;
  loading: boolean;
  selectedYear: number;
  selectedRecordType: DashboardRecordType | null;
  dashboardRecords: DashboardRecords | null;
  dashboardRecordsLoading: boolean;
  dashboardRecordsError: string | null;
  dashboardRecordsPage: number;
  onSelectRecordType: (type: DashboardRecordType) => void;
  onBackToDashboard: () => void;
  onDashboardRecordsPageChange: (page: number) => void;
  onOpenDashboardOrder: (orderId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-400">Unable to load dashboard stats. Please refresh.</p>
      </div>
    );
  }

  const subDaysLeft = restaurant?.endDate ? daysUntil(restaurant.endDate) : null;
  const upcomingConfirmedAdvanceByPaymentMethod =
    stats.upcomingConfirmedAdvanceByPaymentMethod ?? [];
  const upcomingConfirmedAdvance =
    stats.upcomingConfirmedAdvance ??
    upcomingConfirmedAdvanceByPaymentMethod.reduce((sum, item) => sum + item.amount, 0);
  const dashboardCounts = stats.dashboardRecords;
  const followUpsTakenToday = stats.followUpsTakenToday ?? 0;
  const followUpsDueTotalToday = stats.followUpsDueTotalToday ?? stats.followUps;

  return (
    <div className="space-y-6">
      {restaurant?.subscriptionStatus?.message ? (
        <div
          className={`rounded-2xl border px-5 py-4 ${
            restaurant.subscriptionStatus.isInGracePeriod
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={
                  restaurant.subscriptionStatus.isInGracePeriod
                    ? 'text-red-600'
                    : 'text-amber-600'
                }
              >
                <AlertIcon />
              </span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    restaurant.subscriptionStatus.isInGracePeriod
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {restaurant.subscriptionStatus.isInGracePeriod
                    ? 'Subscription Expired'
                    : 'Subscription Renewal Reminder'}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    restaurant.subscriptionStatus.isInGracePeriod
                      ? 'text-red-600'
                      : 'text-amber-700'
                  }`}
                >
                  {restaurant.subscriptionStatus.message}
                </p>
              </div>
            </div>
            {subDaysLeft !== null && !restaurant.subscriptionStatus.isInGracePeriod && (
              <div className="shrink-0 text-right">
                <p className="text-3xl font-bold text-amber-700">{subDaysLeft}</p>
                <p className="text-xs font-medium text-amber-600">days left</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {selectedRecordType ? (
        <DashboardRecordsPanel
          selectedType={selectedRecordType}
          records={dashboardRecords}
          loading={dashboardRecordsLoading}
          error={dashboardRecordsError}
          page={dashboardRecordsPage}
          onBack={onBackToDashboard}
          onPageChange={onDashboardRecordsPageChange}
          onOpenOrder={onOpenDashboardOrder}
        />
      ) : (
        <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Inquiries"
          value={dashboardCounts?.inquiries ?? stats.inquiries}
          icon={<InboxIcon />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          delay="zb-fade-up-1"
          onClick={() => onSelectRecordType('inquiries')}
        />
        <StatCard
          label="Confirm Bookings"
          value={dashboardCounts?.confirmed ?? stats.confirmed}
          icon={<CheckCircleIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          delay="zb-fade-up-2"
          onClick={() => onSelectRecordType('confirmed')}
        />
        <StatCard
          label="Follow Ups"
          value={
            followUpsDueTotalToday > 0
              ? (
                <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                  <span>{followUpsTakenToday}/{followUpsDueTotalToday}</span>
                  <span className="text-base font-bold text-slate-500 sm:text-lg">completed</span>
                </span>
              )
              : '0'
          }
          icon={<InboxIcon />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          delay="zb-fade-up-3"
          onClick={() => onSelectRecordType('followups')}
        />
        <StatCard
          label="Cancelled Inquiries"
          value={dashboardCounts?.cancelled ?? stats.cancelled}
          icon={<XCircleIcon />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          delay="zb-fade-up-4"
          onClick={() => onSelectRecordType('cancelled')}
        />
        <StatCard
          label="Completed Event"
          value={dashboardCounts?.completed ?? stats.completed}
          icon={<CheckCircleIcon />}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
          delay="zb-fade-up-4"
          onClick={() => onSelectRecordType('completed')}
        />
      </div>

      <AdvanceBreakdownCard
        total={upcomingConfirmedAdvance}
        items={upcomingConfirmedAdvanceByPaymentMethod.filter(
          (item) => item.amount > 0 || item.count > 0,
        )}
        title="Upcoming Confirmed Advance"
        subtitle="Future confirmed bookings by payment mode"
      />

      <CancelledAdvanceDashboardSection data={cancelledAdvanceDashboard} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-3">
          <StatCard
            label={`${selectedYear} Revenue`}
            value={formatCurrency(stats.monthRevenue)}
            icon={<CoinIcon />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            sub="Confirmed booking value"
          />
          <StatCard
            label="Completion Pipeline"
            value={stats.completed}
            icon={<CheckCircleIcon />}
            iconBg="bg-slate-100"
            iconColor="text-slate-700"
            sub="Completed functions"
          />
          <StatCard
            label="Total Order Records"
            value={stats.total}
            icon={<InboxIcon />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            sub="All statuses combined"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard
          label="Avg Menu Selection"
          value={formatDuration(stats.avgMenuSelectionDurationSeconds)}
          icon={<ClockIcon />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          sub={`${stats.menuSelectionSampleCount} saved sessions`}
        />
        <StatCard
          label="Confirmation Rate"
          value={`${stats.confirmationConversionRate.toFixed(1)}%`}
          icon={<CoinIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="Inquiry to confirmed/completed"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avg Inquiry To Confirm"
          value={formatDays(stats.avgInquiryToConfirmationDays)}
          icon={<ClockIcon />}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          sub={`${stats.inquiryToConfirmationSampleCount} confirmed bookings`}
        />
        {subDaysLeft !== null && (
          <StatCard
            label="Subscription Days Left"
            value={subDaysLeft > 0 ? subDaysLeft : 'Expired'}
            icon={<CalendarIcon />}
            iconBg={subDaysLeft <= 7 ? 'bg-red-50' : subDaysLeft <= 15 ? 'bg-orange-50' : 'bg-emerald-50'}
            iconColor={subDaysLeft <= 7 ? 'text-red-500' : subDaysLeft <= 15 ? 'text-orange-500' : 'text-emerald-600'}
            sub={restaurant?.endDate ? `Expires ${new Date(restaurant.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          />
        )}
      </div>

      {reports ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <VerticalBarChart
              title="Category Performance"
              subtitle="Top categories by confirmed booking revenue."
              items={reports.highestSellingCategories.slice(0, 5).map((category) => ({
                label: category.name,
                value: category.revenue,
                helper: `${category.bookings} bookings`,
              }))}
            />
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Peak Sales Month</h3>
              <p className="mt-1 text-sm text-slate-500">Best performing month from confirmed bookings.</p>
              <div className="mt-5 rounded-[28px] border border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.25),transparent_45%),linear-gradient(145deg,#fffaf0,#ffffff)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  {reports.busiestMonth.label}
                </p>
                <p className="mt-4 text-4xl font-bold text-slate-900">
                  {reports.busiestMonth.bookings}
                </p>
                <p className="mt-1 text-sm text-slate-500">Bookings in the busiest month</p>
                <div className="mt-6 rounded-2xl bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Revenue</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(reports.busiestMonth.revenue)}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ComparisonChart
              title="Year on Year"
              subtitle={`${selectedYear} compared with ${selectedYear - 1}.`}
              current={reports.yearComparison.current}
              previous={reports.yearComparison.previous}
            />
            <ComparisonChart
              title="Month on Month"
              subtitle="Current month compared with the previous month."
              current={reports.monthComparison.current}
              previous={reports.monthComparison.previous}
            />
          </div>

          <BarChart
            title="Menu Item Trends"
            subtitle="Most selected menu items across confirmed bookings."
            items={reports.bestSellingMenuItems.slice(0, 6).map((item) => ({
              label: item.name,
              value: item.count,
              helper: item.categories.join(', ') || 'No category tag',
            }))}
          />
        </>
      ) : null}
        </>
      )}
    </div>
  );
}

function DashboardHeader({
  userFirstName,
  selectedYear,
  currentYear,
  isCompanyAdmin,
  selectedRecordType,
  dashboardRecords,
  onYearChange,
  onBackToDashboard,
}: {
  userFirstName?: string;
  selectedYear: number;
  currentYear: number;
  isCompanyAdmin: boolean;
  selectedRecordType: DashboardRecordType | null;
  dashboardRecords: DashboardRecords | null;
  onYearChange: (year: number) => void;
  onBackToDashboard: () => void;
}) {
  const meta = selectedRecordType ? dashboardRecordMeta[selectedRecordType] : null;
  const pagination = dashboardRecords?.pagination;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
        ? 'Good noon'
        : 'Good evening';
  const greetingName = userFirstName?.trim() || 'there';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {meta ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <ArrowLeftIcon />
                  Back
                </button>
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  {meta.label}
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {meta.subtitle}
                {pagination ? ` · ${pagination.total.toLocaleString('en-IN')} record${pagination.total === 1 ? '' : 's'}` : ''}
              </p>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {greeting}, {greetingName}
            </h1>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {pagination ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </div>
          ) : null}
          {isCompanyAdmin ? (
            <select
              value={selectedYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-amber-400"
            >
              {Array.from({ length: 7 }, (_, index) => currentYear - 3 + index).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [orderReports, setOrderReports] = useState<OrderReports | null>(null);
  const [myRestaurant, setMyRestaurant] = useState<Restaurant | null>(null);
  const [cancelledAdvanceDashboard, setCancelledAdvanceDashboard] =
    useState<CancelledAdvanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecordType, setSelectedRecordType] = useState<DashboardRecordType | null>(null);
  const [dashboardRecordsPage, setDashboardRecordsPage] = useState(1);
  const [dashboardRecords, setDashboardRecords] = useState<DashboardRecords | null>(null);
  const [dashboardRecordsLoading, setDashboardRecordsLoading] = useState(false);
  const [dashboardRecordsError, setDashboardRecordsError] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOrderLoading, setDetailOrderLoading] = useState(false);
  const [detailOrderError, setDetailOrderError] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        if (user?.role === 'super_admin') {
          const stats = await fetchRestaurantStats(accessToken);
          setRestaurantStats(stats);
        } else if (user?.role === 'company_admin') {
          const [stats, reports, restaurant, cancelledDashboard] = await Promise.all([
            fetchOrderStats(accessToken, selectedYear),
            fetchOrderReports(accessToken, selectedYear).catch(() => null),
            fetchMyRestaurant(accessToken).catch(() => null),
            fetchCancelledAdvanceDashboard(accessToken, selectedYear).catch(() => null),
          ]);
          setOrderStats(stats);
          setOrderReports(reports);
          setMyRestaurant(restaurant);
          setCancelledAdvanceDashboard(cancelledDashboard);
        } else if (user?.role === 'employee') {
          const restaurant = await fetchMyRestaurant(accessToken).catch(() => null);
          setMyRestaurant(restaurant);
        }
      } catch {
        // show null state in each dashboard
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken, user?.role, selectedYear]);

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin' || !selectedRecordType) {
      return;
    }

    let cancelled = false;

    const loadRecords = async () => {
      setDashboardRecordsLoading(true);
      setDashboardRecordsError(null);

      try {
        const records = await fetchDashboardRecords(accessToken, {
          type: selectedRecordType,
          page: dashboardRecordsPage,
          limit: DASHBOARD_RECORD_LIMIT,
        });

        if (!cancelled) {
          setDashboardRecords(records);
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardRecords(null);
          setDashboardRecordsError(error instanceof Error ? error.message : 'Unable to load records. Try again.');
        }
      } finally {
        if (!cancelled) {
          setDashboardRecordsLoading(false);
        }
      }
    };

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role, selectedRecordType, dashboardRecordsPage]);

  const openDashboardRecords = (type: DashboardRecordType) => {
    setSelectedRecordType(type);
    setDashboardRecordsPage(1);
    setDashboardRecords(null);
    setDashboardRecordsError(null);
  };

  const backToDashboard = () => {
    setSelectedRecordType(null);
    setDashboardRecordsPage(1);
    setDashboardRecords(null);
    setDashboardRecordsError(null);
  };

  const openDashboardOrder = async (orderId: string) => {
    if (!accessToken) return;

    setIsDetailOpen(true);
    setDetailOrder(null);
    setDetailOrderError(null);
    setDetailOrderLoading(true);

    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDetailOrder(order);
    } catch (error) {
      setDetailOrderError(error instanceof Error ? error.message : 'Unable to open booking.');
    } finally {
      setDetailOrderLoading(false);
    }
  };

  const closeDashboardOrder = () => {
    setIsDetailOpen(false);
    setDetailOrder(null);
    setDetailOrderError(null);
    setDetailOrderLoading(false);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        userFirstName={user?.firstName}
        selectedYear={selectedYear}
        currentYear={currentYear}
        isCompanyAdmin={user?.role === 'company_admin'}
        selectedRecordType={selectedRecordType}
        dashboardRecords={dashboardRecords}
        onYearChange={setSelectedYear}
        onBackToDashboard={backToDashboard}
      />

      {/* Role-based dashboard content */}
      {user?.role === 'super_admin' && (
        <SuperAdminDashboard stats={restaurantStats} loading={loading} />
      )}
      {user?.role === 'company_admin' && (
        <CompanyAdminDashboard
          stats={orderStats}
          reports={orderReports}
          restaurant={myRestaurant}
          cancelledAdvanceDashboard={cancelledAdvanceDashboard}
          loading={loading}
          selectedYear={selectedYear}
          selectedRecordType={selectedRecordType}
          dashboardRecords={dashboardRecords}
          dashboardRecordsLoading={dashboardRecordsLoading}
          dashboardRecordsError={dashboardRecordsError}
          dashboardRecordsPage={dashboardRecordsPage}
          onSelectRecordType={openDashboardRecords}
          onBackToDashboard={backToDashboard}
          onDashboardRecordsPageChange={setDashboardRecordsPage}
          onOpenDashboardOrder={openDashboardOrder}
        />
      )}
      {user?.role === 'employee' && (
        <div className="space-y-6">
          {myRestaurant?.subscriptionStatus?.message ? (
            <div
              className={`rounded-2xl border px-5 py-4 ${
                myRestaurant.subscriptionStatus.isInGracePeriod
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className={
                      myRestaurant.subscriptionStatus.isInGracePeriod
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }
                  >
                    <AlertIcon />
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        myRestaurant.subscriptionStatus.isInGracePeriod
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {myRestaurant.subscriptionStatus.isInGracePeriod
                        ? 'Subscription Expired'
                        : 'Subscription Renewal Reminder'}
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        myRestaurant.subscriptionStatus.isInGracePeriod
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {myRestaurant.subscriptionStatus.message}
                    </p>
                  </div>
                </div>
                {myRestaurant.endDate && !myRestaurant.subscriptionStatus.isInGracePeriod && (
                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-bold text-amber-700">{daysUntil(myRestaurant.endDate)}</p>
                    <p className="text-xs font-medium text-amber-600">days left</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Ready to manage bookings?
            </p>
            <Link
              href="/bookings"
              className="mt-4 inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            >
              Open Bookings
            </Link>
          </div>
        </div>
      )}
      {isDetailOpen ? (
        <DashboardBookingDetailModal
          order={detailOrder}
          loading={detailOrderLoading}
          error={detailOrderError}
          onClose={closeDashboardOrder}
        />
      ) : null}
    </div>
  );
}
