'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  createOdcCustomer,
  fetchOdcCustomers,
  fetchRestaurants,
  updateOdcCustomer,
} from '@/lib/auth/api';
import { OdcCustomer, Restaurant } from '@/lib/auth/types';

type CustomerFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
};

const initialFormState: CustomerFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';

export default function OdcCustomersPage() {
  useAppPageHeader({
    eyebrow: 'Outdoor Catering',
    title: 'ODC Customers',
  });

  const { accessToken, user } = useAuth();
  const [customers, setCustomers] = useState<OdcCustomer[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OdcCustomer | null>(null);
  const [formState, setFormState] = useState<CustomerFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';
  const hasOdcAccess = Boolean(user?.canAccessOdc);

  useEffect(() => {
    if (!accessToken || !isSuperAdmin) return;

    const token = accessToken;
    async function loadRestaurants() {
      try {
        const response = await fetchRestaurants(token, { page: 1, limit: 100, search: '' });
        const odcRestaurants = response.items.filter((restaurant) => restaurant.enableOdc);
        setRestaurants(odcRestaurants);
        setSelectedRestaurantId((current) => current || odcRestaurants[0]?.id || '');
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch restaurants.',
        );
      }
    }

    void loadRestaurants();
  }, [accessToken, isSuperAdmin]);

  useEffect(() => {
    if (!accessToken || !hasOdcAccess || !effectiveRestaurantId) return;

    const token = accessToken;
    async function loadCustomers() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchOdcCustomers(token, {
          page,
          limit,
          search,
          ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
        });
        setCustomers(response.items);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch ODC customers.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCustomers();
  }, [accessToken, effectiveRestaurantId, hasOdcAccess, isSuperAdmin, limit, page, search]);

  async function reloadCustomers(token: string, nextPage: number) {
    const response = await fetchOdcCustomers(token, {
      page: nextPage,
      limit,
      search,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    });
    setCustomers(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  function openCreateModal() {
    setEditingCustomer(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  }

  function openEditModal(customer: OdcCustomer) {
    setEditingCustomer(customer);
    setFormState({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    if (!effectiveRestaurantId) {
      setError('Select an ODC-enabled restaurant first.');
      return;
    }

    if (!/^\d{10}$/.test(formState.phone.trim())) {
      setError('Phone number must be 10 digits.');
      return;
    }

    const payload = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      phone: formState.phone.trim(),
      email: formState.email.trim() || null,
      address: formState.address.trim() || null,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    };

    try {
      setIsSubmitting(true);
      setError('');
      if (editingCustomer) {
        await updateOdcCustomer(accessToken, editingCustomer.id, payload);
        setSuccessMessage('ODC customer updated successfully.');
      } else {
        await createOdcCustomer(accessToken, payload);
        setSuccessMessage('ODC customer created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingCustomer ? page : 1;
      setPage(nextPage);
      await reloadCustomers(accessToken, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save ODC customer.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasOdcAccess) {
    return (
      <ConfigRoute>
        <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-800">
          Outdoor Catering is not enabled for your account.
        </section>
      </ConfigRoute>
    );
  }

  return (
    <ConfigRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-600">
              Outdoor Catering
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">ODC Customers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage outdoor catering customers separately from banquet customers.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!effectiveRestaurantId}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-50"
          >
            + Add ODC customer
          </button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <RoleBasedRestaurantSelector
            isVisible={isSuperAdmin}
            restaurants={restaurants}
            value={selectedRestaurantId}
            onChange={(value) => {
              setSelectedRestaurantId(value);
              setPage(1);
            }}
          />
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, phone, email..."
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Search
            </button>
          </form>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{totalItems}</span> total
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Address</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader colSpan={4} message="Loading ODC customers..." />
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                    No ODC customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{customer.firstName} {customer.lastName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{customer.phone}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.email || 'No email'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{customer.address || 'No address'}</td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => openEditModal(customer)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <PageLoader message="Loading ODC customers..." />
          ) : customers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400 shadow-sm">
              No ODC customers found.
            </div>
          ) : (
            customers.map((customer) => (
              <article key={`mobile-${customer.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{customer.firstName} {customer.lastName}</p>
                    <p className="mt-1 text-sm text-slate-600">{customer.phone}</p>
                    <p className="mt-1 text-xs text-slate-500">{customer.email || 'No email'}</p>
                    <p className="mt-2 text-xs text-slate-500">{customer.address || 'No address'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => openEditModal(customer)} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Edit</button>
              </article>
            ))
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 disabled:opacity-40">Next</button>
          </div>
        </div>

        {isModalOpen ? (
          <CommonModal
            title={editingCustomer ? 'Edit ODC customer' : 'Create ODC customer'}
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-2xl"
          >
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <input value={formState.firstName} onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" required className={inputCls} />
              <input value={formState.lastName} onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" className={inputCls} />
              <input value={formState.phone} onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))} placeholder="10 digit phone" required inputMode="numeric" className={inputCls} />
              <input value={formState.email} onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" className={inputCls} />
              <textarea value={formState.address} onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))} placeholder="Address" rows={3} className={`${inputCls} resize-none md:col-span-2`} />
              <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:w-auto">Cancel</button>
                <LoadingButton type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="w-full rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60 sm:w-auto">
                  {editingCustomer ? 'Save changes' : 'Create customer'}
                </LoadingButton>
              </div>
            </form>
          </CommonModal>
        ) : null}
      </section>
    </ConfigRoute>
  );
}
