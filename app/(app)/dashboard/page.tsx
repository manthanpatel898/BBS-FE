'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchRestaurantStats, fetchOrderReports, fetchOrderStats } from '@/lib/auth/api';
import { RestaurantStats, OrderReports, OrderStats, Restaurant } from '@/lib/auth/types';

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

function StatCard({ label, value, icon, iconBg, iconColor, sub, delay = '' }: StatCardProps) {
  return (
    <div
      className={`zb-fade-up-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${delay}`}
    >
      <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
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

// ─── Company Admin Dashboard ──────────────────────────────────────────────────

function CompanyAdminDashboard({
  stats,
  reports,
  loading,
}: {
  stats: OrderStats | null;
  reports: OrderReports | null;
  loading: boolean;
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

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="This Month Revenue"
          value={formatCurrency(stats.monthRevenue)}
          icon={<CoinIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="Confirmed booking value"
        />
        <StatCard
          label="This Month Advance"
          value={formatCurrency(stats.monthAdvance)}
          icon={<TrendingUpIcon />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="Collected advances"
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
      </div>

      {reports ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <BarChart
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
              subtitle="Current year compared with the previous year."
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
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [orderReports, setOrderReports] = useState<OrderReports | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        if (user?.role === 'super_admin') {
          const stats = await fetchRestaurantStats(accessToken);
          setRestaurantStats(stats);
        } else if (user?.role === 'company_admin') {
          const [stats, reports] = await Promise.all([
            fetchOrderStats(accessToken),
            fetchOrderReports(accessToken).catch(() => null),
          ]);
          setOrderStats(stats);
          setOrderReports(reports);
        }
      } catch {
        // show null state in each dashboard
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken, user?.role]);

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
          <span className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold capitalize text-amber-700">
            {user?.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Role-based dashboard content */}
      {user?.role === 'super_admin' && (
        <SuperAdminDashboard stats={restaurantStats} loading={loading} />
      )}
      {user?.role === 'company_admin' && (
        <CompanyAdminDashboard stats={orderStats} reports={orderReports} loading={loading} />
      )}
      {user?.role === 'employee' && (
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
      )}
    </div>
  );
}
