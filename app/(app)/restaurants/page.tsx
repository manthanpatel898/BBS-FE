'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SuperAdminRoute } from '@/components/auth/super-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  activateRestaurant,
  createRestaurant,
  deactivateRestaurant,
  deleteRestaurant,
  fetchRestaurants,
  updateRestaurant,
  uploadLogo,
} from '@/lib/auth/api';
import { Restaurant, SubscriptionLog } from '@/lib/auth/types';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';

type RestaurantFormState = {
  name: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonNumber: string;
  contactNumbers: string;
  website: string;
  logoUrl: string;
  address: string;
  startDate: string;
  endDate: string;
  bookingPrefix: string;
  enableCancelledBookings: boolean;
};

const initialFormState: RestaurantFormState = {
  name: '',
  contactPersonName: '',
  contactPersonEmail: '',
  contactPersonNumber: '',
  contactNumbers: '',
  website: '',
  logoUrl: '',
  address: '',
  startDate: '',
  endDate: '',
  bookingPrefix: '',
  enableCancelledBookings: false,
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-none outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 [color-scheme:light] [&::-webkit-datetime-edit]:text-slate-900';

function actionLogBadge(action: string) {
  if (action === 'activated') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Activated
      </span>
    );
  }
  if (action === 're-subscribed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Re-subscribed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
      Deactivated
    </span>
  );
}

export default function RestaurantsPage() {
  const { accessToken } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit / Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'subscription'>('info');
  const [formState, setFormState] = useState<RestaurantFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Delete
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deactivate
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Re-subscription modal
  const [resubRestaurant, setResubRestaurant] = useState<Restaurant | null>(null);
  const [resubEndDate, setResubEndDate] = useState('');
  const [resubNotes, setResubNotes] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubError, setResubError] = useState('');

  // Search / filters
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const token: string = accessToken;

    async function loadRestaurants() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchRestaurants(token, { page, limit, search });
        setRestaurants(response.items);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to fetch restaurants.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRestaurants();
  }, [accessToken, limit, page, search]);

  async function refreshList() {
    if (!accessToken) return;
    const response = await fetchRestaurants(accessToken, { page, limit, search });
    setRestaurants(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  function openCreateModal() {
    setEditingRestaurant(null);
    setFormState(initialFormState);
    setActiveModalTab('info');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(restaurant: Restaurant) {
    setEditingRestaurant(restaurant);
    setFormState({
      name: restaurant.name,
      contactPersonName: restaurant.contactPersonName,
      contactPersonEmail: restaurant.contactPersonEmail,
      contactPersonNumber: restaurant.contactPersonNumber,
      contactNumbers: (restaurant.contactNumbers ?? []).join('\n'),
      website: restaurant.website ?? '',
      logoUrl: restaurant.logoUrl ?? '',
      address: restaurant.address,
      startDate: restaurant.startDate.slice(0, 10),
      endDate: restaurant.endDate.slice(0, 10),
      bookingPrefix: restaurant.bookingPrefix,
      enableCancelledBookings: restaurant.enableCancelledBookings ?? false,
    });
    setActiveModalTab('info');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openResubModal(restaurant: Restaurant) {
    setResubRestaurant(restaurant);
    setResubEndDate(restaurant.endDate.slice(0, 10));
    setResubNotes('');
    setResubError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) { setError('Missing session token.'); return; }
    const token: string = accessToken;

    try {
      setIsSubmitting(true);
      setError('');
      const payload = {
        ...formState,
        contactNumbers: parseContactNumbers(formState.contactNumbers),
        website: formState.website.trim() || null,
        logoUrl: formState.logoUrl.trim() || null,
      };

      if (editingRestaurant) {
        await updateRestaurant(token, editingRestaurant.id, payload);
        setSuccessMessage('Restaurant updated successfully.');
      } else {
        await createRestaurant(token, payload);
        setSuccessMessage('Restaurant created. Company admin credentials were emailed.');
      }

      setIsModalOpen(false);
      setPage(1);
      await refreshList();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save restaurant.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !restaurantToDelete) return;

    try {
      setIsDeleting(true);
      setError('');
      await deleteRestaurant(accessToken, restaurantToDelete.id);
      setRestaurantToDelete(null);
      setSuccessMessage('Restaurant deleted successfully.');
      await refreshList();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to delete restaurant.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeactivate(restaurant: Restaurant) {
    if (!accessToken) return;
    setDeactivatingId(restaurant.id);
    setError('');
    try {
      await deactivateRestaurant(accessToken, restaurant.id);
      setSuccessMessage(`${restaurant.name} has been deactivated.`);
      await refreshList();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to deactivate restaurant.',
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleResub() {
    if (!accessToken || !resubRestaurant) return;
    if (!resubEndDate) { setResubError('End date is required.'); return; }

    try {
      setIsResubmitting(true);
      setResubError('');
      await activateRestaurant(accessToken, resubRestaurant.id, resubEndDate, resubNotes || undefined);
      setSuccessMessage(`${resubRestaurant.name} subscription updated successfully.`);
      setResubRestaurant(null);
      await refreshList();
    } catch (requestError) {
      setResubError(
        requestError instanceof Error ? requestError.message : 'Unable to update subscription.',
      );
    } finally {
      setIsResubmitting(false);
    }
  }

  function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function statusBadge(restaurant: Restaurant) {
    const days = daysUntil(restaurant.endDate);
    if (!restaurant.isActive) {
      return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>;
    }
    if (days < 0) {
      return <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Expired</span>;
    }
    if (days <= 30) {
      return <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">Exp. in {days}d</span>;
    }
    return <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Active</span>;
  }

  function ActionButtons({ r, size = 8 }: { r: Restaurant; size?: number }) {
    const btnCls = `flex h-${size} w-${size} items-center justify-center rounded-lg border transition`;
    return (
      <div className="flex items-center gap-1.5">
        {/* Edit */}
        <button
          type="button"
          onClick={() => openEditModal(r)}
          title="Edit"
          className={`${btnCls} border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Deactivate (only when active) */}
        <button
          type="button"
          disabled={!r.isActive || deactivatingId === r.id}
          onClick={() => void handleDeactivate(r)}
          title={r.isActive ? 'Deactivate' : 'Inactive'}
          className={`${btnCls} ${
            r.isActive
              ? 'border-orange-200 text-orange-500 hover:bg-orange-50'
              : 'border-slate-100 text-slate-300 cursor-default'
          } disabled:opacity-40`}
        >
          {deactivatingId === r.id ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          )}
        </button>

        {/* Re-subscription */}
        <button
          type="button"
          onClick={() => openResubModal(r)}
          title="Re-subscription"
          className={`${btnCls} border-blue-200 text-blue-500 hover:bg-blue-50`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setRestaurantToDelete(r)}
          title="Delete"
          className={`${btnCls} border-red-200 text-red-500 hover:bg-red-50`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <SuperAdminRoute>
      <section className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Super Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Restaurants</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage all restaurants and their company admin accounts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {isFiltersOpen ? 'Hide search' : 'Search'}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            >
              + Add restaurant
            </button>
          </div>
        </div>

        {/* Search / filter bar */}
        {isFiltersOpen && (
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">Total restaurants</p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">{totalItems}</p>
            </div>
            <form
              className="flex w-full max-w-xl gap-2"
              onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput); }}
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, contact, email, or prefix…"
                className={inputCls}
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Alerts */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Restaurant</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Dates</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableLoader colSpan={6} message="Loading restaurants…" />
                ) : restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No restaurants found.
                    </td>
                  </tr>
                ) : (
                  restaurants.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{r.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{r.address}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700">{r.contactPersonName}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{r.contactPersonEmail}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{r.contactPersonNumber}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700">
                          {r.bookingPrefix}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        <p>{r.startDate.slice(0, 10)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">to {r.endDate.slice(0, 10)}</p>
                      </td>
                      <td className="px-5 py-4">{statusBadge(r)}</td>
                      <td className="px-5 py-4">
                        <ActionButtons r={r} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <PageLoader message="Loading restaurants…" />
          ) : restaurants.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              No restaurants found.
            </div>
          ) : (
            restaurants.map((r) => (
              <article key={`mob-${r.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{r.address}</p>
                  </div>
                  {statusBadge(r)}
                </div>
                <div className="mt-3 space-y-0.5 text-xs text-slate-500">
                  <p>{r.contactPersonName} · {r.contactPersonEmail}</p>
                  <p>{r.contactPersonNumber} · <span className="font-mono font-semibold text-slate-700">{r.bookingPrefix}</span></p>
                  <p>{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}</p>
                </div>
                <div className="mt-3">
                  <ActionButtons r={r} size={9} />
                </div>
              </article>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages} · {totalItems} total
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {/* Create / Edit modal */}
        {isModalOpen && (
          <CommonModal
            title={editingRestaurant ? 'Edit restaurant' : 'Create restaurant & company admin'}
            description={
              editingRestaurant
                ? undefined
                : 'Creating a restaurant provisions its company admin and sends first-login credentials over email.'
            }
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-3xl"
          >
            {/* Tabs — only for edit */}
            {editingRestaurant && (
              <div className="-mt-2 mb-6 flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('info')}
                  className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    activeModalTab === 'info'
                      ? 'border-amber-400 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Information
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('subscription')}
                  className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    activeModalTab === 'subscription'
                      ? 'border-amber-400 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Subscription &amp; Notes
                </button>
              </div>
            )}

            {/* Info tab / Create form */}
            {(!editingRestaurant || activeModalTab === 'info') && (
              <>
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                  <input
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Restaurant name"
                    required
                    className={inputCls}
                  />
                  <input
                    value={formState.bookingPrefix}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, bookingPrefix: e.target.value.toUpperCase() }))
                    }
                    placeholder="Booking prefix (e.g. BNQ)"
                    required
                    className={inputCls}
                  />
                  <input
                    value={formState.contactPersonName}
                    onChange={(e) => setFormState((s) => ({ ...s, contactPersonName: e.target.value }))}
                    placeholder="Contact person name"
                    required
                    className={inputCls}
                  />
                  <input
                    value={formState.contactPersonEmail}
                    onChange={(e) => setFormState((s) => ({ ...s, contactPersonEmail: e.target.value }))}
                    placeholder="Contact person email"
                    type="email"
                    required
                    className={inputCls}
                  />
                  <input
                    value={formState.contactPersonNumber}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, contactPersonNumber: e.target.value }))
                    }
                    placeholder="Contact person number"
                    required
                    className={inputCls}
                  />
                  <textarea
                    value={formState.contactNumbers}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, contactNumbers: e.target.value }))
                    }
                    placeholder={'Restaurant contact numbers\n8980938142\n9876543210'}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                  <input
                    value={formState.website}
                    onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
                    placeholder="Website (optional)"
                    className={inputCls}
                  />
                  <div className="flex items-center gap-3">
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-amber-400 hover:text-amber-600 ${isLogoUploading ? 'pointer-events-none opacity-60' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                      </svg>
                      {isLogoUploading ? 'Uploading…' : formState.logoUrl ? 'Change logo' : 'Upload logo (optional)'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={isLogoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            setError('Image must be under 5 MB.');
                            return;
                          }
                          if (!accessToken) return;
                          try {
                            setIsLogoUploading(true);
                            const url = await uploadLogo(accessToken, file);
                            setFormState((s) => ({ ...s, logoUrl: url }));
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Upload failed.');
                          } finally {
                            setIsLogoUploading(false);
                          }
                        }}
                      />
                    </label>
                    {formState.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormState((s) => ({ ...s, logoUrl: '' }))}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF · max 2 MB</p>
                  {formState.logoUrl && (
                    <img src={formState.logoUrl} alt="Logo preview" className="h-12 w-12 rounded-xl border border-slate-200 object-contain p-1" />
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={formState.startDate}
                      onChange={(e) => setFormState((s) => ({ ...s, startDate: e.target.value }))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      End date
                    </label>
                    <input
                      type="date"
                      value={formState.endDate}
                      onChange={(e) => setFormState((s) => ({ ...s, endDate: e.target.value }))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <textarea
                    value={formState.address}
                    onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
                    placeholder="Address"
                    required
                    rows={3}
                    className={`${inputCls} md:col-span-2 resize-none`}
                  />
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={formState.enableCancelledBookings}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          enableCancelledBookings: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span>Show Cancel Bookings feature for this restaurant</span>
                  </label>
                  <div className="flex items-center justify-end gap-3 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                    >
                      {isSubmitting
                        ? 'Saving…'
                        : editingRestaurant
                          ? 'Save changes'
                          : 'Create restaurant'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Subscription & Notes tab */}
            {editingRestaurant && activeModalTab === 'subscription' && (
              <div className="space-y-6">
                {/* Current subscription info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {editingRestaurant.startDate.slice(0, 10)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {editingRestaurant.endDate.slice(0, 10)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
                    <div className="mt-1">{statusBadge(editingRestaurant)}</div>
                  </div>
                  {editingRestaurant.notes && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{editingRestaurant.notes}</p>
                    </div>
                  )}
                </div>

                {/* Subscription history */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Subscription History
                  </p>
                  {!editingRestaurant.subscriptionLogs?.length ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
                      No subscription activity recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {[...(editingRestaurant.subscriptionLogs ?? [])].reverse().map((log: SubscriptionLog, i: number) => (
                        <div
                          key={i}
                          className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="space-y-1">
                            {actionLogBadge(log.action)}
                            {log.endDate && (
                              <p className="text-xs text-slate-500">
                                End date set to{' '}
                                <span className="font-medium text-slate-700">
                                  {log.endDate.slice(0, 10)}
                                </span>
                              </p>
                            )}
                            {log.notes && (
                              <p className="text-xs text-slate-500">
                                Note: <span className="text-slate-700">{log.notes}</span>
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-xs text-slate-400">
                            {new Date(log.performedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </CommonModal>
        )}

        {/* Re-subscription modal */}
        {resubRestaurant && (
          <CommonModal
            title="Re-subscription"
            description={`Update the subscription end date for ${resubRestaurant.name}. This will activate the restaurant if it was inactive.`}
            onClose={() => setResubRestaurant(null)}
            widthClassName="max-w-lg"
          >
            {resubError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resubError}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  New End Date
                </label>
                <input
                  type="date"
                  value={resubEndDate}
                  onChange={(e) => setResubEndDate(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={resubNotes}
                  onChange={(e) => setResubNotes(e.target.value)}
                  placeholder="e.g. Annual renewal, extended plan, etc."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResubRestaurant(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResubmitting}
                  onClick={() => void handleResub()}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {isResubmitting ? 'Saving…' : 'Confirm re-subscription'}
                </button>
              </div>
            </div>
          </CommonModal>
        )}

        {/* Delete confirm */}
        {restaurantToDelete && (
          <ConfirmModal
            title={`Delete ${restaurantToDelete.name}?`}
            message="This removes the restaurant and its company admin account. This action cannot be undone."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setRestaurantToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        )}
      </section>
    </SuperAdminRoute>
  );
}

function parseContactNumbers(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
