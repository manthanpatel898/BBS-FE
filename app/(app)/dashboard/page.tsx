'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchAdvanceSummary, fetchMyRestaurant, fetchRestaurantStats, fetchOrderReports, fetchOrderStats } from '@/lib/auth/api';
import { AdvanceSummary, RestaurantStats, OrderReports, OrderStats, Restaurant } from '@/lib/auth/types';

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
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub?: string;
  delay?: string;
}

function StatCard({ label, value, icon, iconBg, iconColor, delay = '' }: StatCardProps) {
  return (
    <div
      className={`zb-fade-up-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${delay}`}
    >
      <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function AdvanceBreakdownCard({
  total,
  items,
  yearLabel,
}: {
  total: number;
  items: Array<{ label: string; amount: number; count: number }>;
  yearLabel: string;
}) {
  const maxAmount = Math.max(...items.map((item) => item.amount), 1);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-2.5">
            <span className="text-blue-600">
              <TrendingUpIcon />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{formatCurrency(total)}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{yearLabel} Advance</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No advance payments recorded this month.</p>
        ) : (
          items.map((item) => (
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
                    width: `${Math.max((item.amount / maxAmount) * 100, item.amount > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
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

function AdvanceSummarySection({
  summary,
  yearLabel,
}: {
  summary: AdvanceSummary | null;
  yearLabel: string;
}) {
  if (!summary) return null;

  const {
    confirmedAdvance,
    completedConfirmedAdvance,
    upcomingConfirmedAdvance,
    cancelledAdvance,
    forfeitedAdvance,
    total,
  } = summary;
  const safeTotal = total || 1;

  const completedConfirmedPct = (completedConfirmedAdvance / safeTotal) * 100;
  const upcomingConfirmedPct = (upcomingConfirmedAdvance / safeTotal) * 100;
  const cancelledPct = (cancelledAdvance / safeTotal) * 100;
  const forfeitedPct = cancelledAdvance > 0 ? (forfeitedAdvance / cancelledAdvance) * 100 : 0;

  const buckets = [
    {
      label: 'Completed Confirmed',
      value: completedConfirmedAdvance,
      pct: completedConfirmedPct,
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      desc: 'Confirmed bookings with party date up to today',
    },
    {
      label: 'Upcoming Confirmed',
      value: upcomingConfirmedAdvance,
      pct: upcomingConfirmedPct,
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      desc: 'Confirmed bookings with future party date',
    },
    {
      label: 'Cancelled Advance',
      value: cancelledAdvance,
      pct: cancelledPct,
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      desc: 'Unresolved cancelled wallets',
    },
    {
      label: 'Forfeited Advance',
      value: forfeitedAdvance,
      pct: forfeitedPct,
      text: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      dot: 'bg-red-500',
      desc: 'Retained amount from cancelled advance',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Advance Overview</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {yearLabel}: Completed Confirmed + Upcoming Confirmed + Cancelled Advance = Total Advance
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {completedConfirmedAdvance > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${completedConfirmedPct}%` }}
            title={`Completed Confirmed: ${formatCurrency(completedConfirmedAdvance)}`}
          />
        )}
        {upcomingConfirmedAdvance > 0 && (
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${upcomingConfirmedPct}%` }}
            title={`Upcoming Confirmed: ${formatCurrency(upcomingConfirmedAdvance)}`}
          />
        )}
        {cancelledAdvance > 0 && (
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${cancelledPct}%` }}
            title={`Cancelled: ${formatCurrency(cancelledAdvance)}`}
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-xl border ${b.border} ${b.bg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
              <p className="text-xs font-semibold text-slate-600">{b.label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${b.text}`}>{formatCurrency(b.value)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {b.label === 'Forfeited Advance'
                ? `${b.pct.toFixed(1)}% of cancelled advance`
                : `${b.pct.toFixed(1)}% of total`}
              {' · '}
              {b.desc}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">
        {formatCurrency(completedConfirmedAdvance)} + {formatCurrency(upcomingConfirmedAdvance)} + {formatCurrency(cancelledAdvance)} = {formatCurrency(total)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Combined Confirmed Advance: {formatCurrency(confirmedAdvance)}
      </p>
    </section>
  );
}

// ─── Company Admin Dashboard ──────────────────────────────────────────────────

function CompanyAdminDashboard({
  stats,
  reports,
  restaurant,
  advanceSummary,
  loading,
  selectedYear,
}: {
  stats: OrderStats | null;
  reports: OrderReports | null;
  restaurant: Restaurant | null;
  advanceSummary: AdvanceSummary | null;
  loading: boolean;
  selectedYear: number;
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Inquiries"
          value={stats.inquiries}
          icon={<InboxIcon />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          sub="Current inquiry count"
          delay="zb-fade-up-1"
        />
        <StatCard
          label="Confirm Bookings"
          value={stats.confirmed}
          icon={<CheckCircleIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="Confirmed bookings"
          delay="zb-fade-up-2"
        />
        <StatCard
          label="Follow Ups Due Today"
          value={stats.followUps}
          icon={<InboxIcon />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          sub="Due today, overdue, or no next date"
          delay="zb-fade-up-3"
        />
        <StatCard
          label="Cancelled Inquiries"
          value={stats.cancelled}
          icon={<XCircleIcon />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          sub="Cancelled records"
          delay="zb-fade-up-4"
        />
      </div>

      <AdvanceSummarySection summary={advanceSummary} yearLabel={String(selectedYear)} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <AdvanceBreakdownCard
            total={stats.monthAdvance}
            items={stats.monthAdvanceByPaymentMethod.filter(
              (item) => item.amount > 0 || item.count > 0,
            )}
            yearLabel={String(selectedYear)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-6">
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
  const [advanceSummary, setAdvanceSummary] = useState<AdvanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        if (user?.role === 'super_admin') {
          const stats = await fetchRestaurantStats(accessToken);
          setRestaurantStats(stats);
        } else if (user?.role === 'company_admin') {
          const [stats, reports, restaurant, summary] = await Promise.all([
            fetchOrderStats(accessToken, selectedYear),
            fetchOrderReports(accessToken, selectedYear).catch(() => null),
            fetchMyRestaurant(accessToken).catch(() => null),
            fetchAdvanceSummary(accessToken, selectedYear).catch(() => null),
          ]);
          setOrderStats(stats);
          setOrderReports(reports);
          setMyRestaurant(restaurant);
          setAdvanceSummary(summary);
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {greeting()}, {user?.firstName ?? 'there'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'company_admin' ? (
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-amber-400"
              >
                {Array.from({ length: 7 }, (_, index) => currentYear - 3 + index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold capitalize text-amber-700">
              {user?.role.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Role-based dashboard content */}
      {user?.role === 'super_admin' && (
        <SuperAdminDashboard stats={restaurantStats} loading={loading} />
      )}
      {user?.role === 'company_admin' && (
        <CompanyAdminDashboard stats={orderStats} reports={orderReports} restaurant={myRestaurant} advanceSummary={advanceSummary} loading={loading} selectedYear={selectedYear} />
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
    </div>
  );
}
