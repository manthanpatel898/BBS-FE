'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  bulkUploadMenus,
  createMenu,
  deleteMenu,
  fetchMenus,
  fetchRestaurants,
  updateMenu,
} from '@/lib/auth/api';
import { BulkUploadError, BulkUploadResult, Menu, MenuSection, Restaurant } from '@/lib/auth/types';
import { PageLoader } from '@/components/ui/page-loader';
import { createExcelBlobFromRecords } from '@/lib/excel';

type MenuFormState = {
  sectionTitle: string;
  displayOrder: string;
  items: string[];
  hotSellingItems: string[];
};

const initialFormState: MenuFormState = {
  sectionTitle: '',
  displayOrder: '',
  items: [],
  hotSellingItems: [],
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

// ─── Bulk import helpers ──────────────────────────────────────────────────────

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateSampleCSV(): string {
  return [
    'Item Name,SubItem Name',
    'MOCKTAIL,MINT MOJITO',
    'MOCKTAIL,BLUE LAGOON',
    'MOCKTAIL,WATERMELON COOLER',
    'SOUP,TOMATO SOUP',
    'SOUP,SWEET CORN SOUP',
    'SOUP,MANCHOW SOUP',
    'DESSERTS,GULAB JAMUN',
    'DESSERTS,RASGULLA',
    'DESSERTS,ICE CREAM',
  ].join('\n');
}

async function generateSampleExcel(): Promise<Blob> {
  const rows = [
    { 'Item Name': 'MOCKTAIL', 'SubItem Name': 'MINT MOJITO' },
    { 'Item Name': 'MOCKTAIL', 'SubItem Name': 'BLUE LAGOON' },
    { 'Item Name': 'MOCKTAIL', 'SubItem Name': 'WATERMELON COOLER' },
    { 'Item Name': 'SOUP', 'SubItem Name': 'TOMATO SOUP' },
    { 'Item Name': 'SOUP', 'SubItem Name': 'SWEET CORN SOUP' },
    { 'Item Name': 'SOUP', 'SubItem Name': 'MANCHOW SOUP' },
    { 'Item Name': 'DESSERTS', 'SubItem Name': 'GULAB JAMUN' },
    { 'Item Name': 'DESSERTS', 'SubItem Name': 'RASGULLA' },
  ];
  return createExcelBlobFromRecords('Menus', rows);
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function UploadResultSummary({ result }: { result: BulkUploadResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upload Result</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        {(
          [
            { label: 'Total Rows', value: result.total, cls: 'border-slate-200 bg-white text-slate-700' },
            { label: 'Inserted', value: result.inserted, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { label: 'Skipped', value: result.skipped, cls: 'border-red-200 bg-red-50 text-red-700' },
          ] as const
        ).map(({ label, value, cls }) => (
          <div key={label} className={`rounded-xl border px-3 py-3 ${cls}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
          </div>
        ))}
      </div>
      {result.errors.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-2 font-semibold">Row Errors</p>
          <ul className="space-y-1">
            {result.errors.map((err: BulkUploadError) => (
              <li key={err.row}>
                Row {err.row}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type BulkState = {
  file: File | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
  result: BulkUploadResult | null;
  errorMessage: string;
};

const initialBulkState: BulkState = {
  file: null,
  status: 'idle',
  result: null,
  errorMessage: '',
};

// ─────────────────────────────────────────────────────────────────────────────

function parseSubitems(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function countSubitems(sections: MenuSection[]) {
  return sections.reduce((count, section) => count + section.items.length, 0);
}

export default function MenusPage() {
  useAppPageHeader({
    eyebrow: 'Menus',
    title: 'Menus',
  });
  const { accessToken, user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(initialFormState);
  const [itemDraft, setItemDraft] = useState('');
  const [subitemSearch, setSubitemSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<BulkState>(initialBulkState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';

  function getMenuQueryParams(requestedPage: number) {
    return {
      page: requestedPage,
      limit,
      search,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    };
  }

  async function loadMenusPage(token: string, displayPage: number) {
    const response = await fetchMenus(token, getMenuQueryParams(displayPage));
    setMenus(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  useEffect(() => {
    if (!accessToken || !isSuperAdmin) {
      return;
    }

    const token = accessToken;

    async function loadRestaurants() {
      try {
        const response = await fetchRestaurants(token, { page: 1, limit: 100, search: '' });
        setRestaurants(response.items);
        setSelectedRestaurantId((current) => current || response.items[0]?.id || '');
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
    if (!accessToken || !effectiveRestaurantId) {
      setMenus([]);
      setTotalPages(1);
      setTotalItems(0);
      setIsLoading(false);
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');
        await loadMenusPage(token, page);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to fetch menus.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, effectiveRestaurantId, isSuperAdmin, limit, page, search]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length === 0) {
      setSearch('');
      setPage(1);
      return;
    }
    if (trimmed.length < 3) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  async function reloadMenus(token: string, nextPage: number) {
    if (!effectiveRestaurantId) {
      return;
    }

    await loadMenusPage(token, nextPage);
  }

  function openCreateModal() {
    setEditingMenu(null);
    setFormState(initialFormState);
    setItemDraft('');
    setSubitemSearch('');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(menu: Menu) {
    setEditingMenu(menu);
    setFormState({
      sectionTitle: menu.sections[0]?.sectionTitle ?? menu.title,
      displayOrder:
        typeof menu.displayOrder === 'number' && menu.displayOrder > 0
          ? String(menu.displayOrder)
          : '',
      items: [...(menu.sections[0]?.items ?? [])],
      hotSellingItems: [...(menu.sections[0]?.hotSellingItems ?? [])],
    });
    setItemDraft('');
    setSubitemSearch('');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function addItems(rawValue?: string) {
    const values = parseSubitems(rawValue ?? itemDraft);
    if (!values.length) {
      return;
    }

    setFormState((current) => ({
      ...current,
      items: Array.from(new Set([...current.items, ...values])),
    }));
    setItemDraft('');
  }

  function removeItem(item: string) {
    setFormState((current) => ({
      ...current,
      items: current.items.filter((currentItem) => currentItem !== item),
      hotSellingItems: current.hotSellingItems.filter((currentItem) => currentItem !== item),
    }));
  }

  function toggleHotSellingItem(item: string) {
    setFormState((current) => {
      const exists = current.hotSellingItems.includes(item);
      return {
        ...current,
        hotSellingItems: exists
          ? current.hotSellingItems.filter((currentItem) => currentItem !== item)
          : [...current.hotSellingItems, item],
      };
    });
  }

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();

    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    if (!effectiveRestaurantId) {
      setError('Select a restaurant first.');
      return;
    }

    const token = accessToken;

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        title: formState.sectionTitle.trim(),
        sections: [
          {
            sectionTitle: formState.sectionTitle.trim(),
            items: Array.from(new Set(formState.items.map((item) => item.trim()))).filter(
              Boolean,
            ),
            hotSellingItems: Array.from(
              new Set(formState.hotSellingItems.map((item) => item.trim())),
            ).filter(Boolean),
          },
        ],
        ...(formState.displayOrder.trim()
          ? { displayOrder: Number(formState.displayOrder) }
          : {}),
        ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
      };

      if (editingMenu) {
        await updateMenu(token, editingMenu.id, payload);
        setSuccessMessage('Menu updated successfully.');
      } else {
        await createMenu(token, payload);
        setSuccessMessage('Menu created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingMenu ? page : 1;
      setPage(nextPage);
      await reloadMenus(token, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save menu.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !menuToDelete) {
      return;
    }

    const token = accessToken;

    try {
      setIsDeleting(true);
      setError('');
      await deleteMenu(token, menuToDelete.id);
      setMenuToDelete(null);
      setSuccessMessage('Menu deleted successfully.');
      await reloadMenus(token, page);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to delete menu.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function openBulkModal() {
    setBulk(initialBulkState);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsBulkOpen(true);
  }

  function closeBulkModal() {
    setIsBulkOpen(false);
  }

  async function handleBulkUpload(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!bulk.file || !accessToken) return;

    setBulk((prev) => ({ ...prev, status: 'uploading', result: null, errorMessage: '' }));

    try {
      const result = await bulkUploadMenus(
        accessToken,
        bulk.file,
        isSuperAdmin ? effectiveRestaurantId : undefined,
      );
      setBulk((prev) => ({ ...prev, status: 'done', result }));
      if (result.inserted > 0) {
        await reloadMenus(accessToken, 1);
        setPage(1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk upload failed.';
      setBulk((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
    }
  }

  function handleDownloadSampleCSV() {
    downloadFile(generateSampleCSV(), 'menus-sample.csv', 'text/csv');
  }

  async function handleDownloadSampleExcel() {
    try {
      const blob = await generateSampleExcel();
      downloadFile(blob, 'menus-sample.xlsx', blob.type);
    } catch {
      // ignore
    }
  }

  const totalConfiguredSubitems = formState.items.length;
  const filteredSubitems = useMemo(() => {
    const query = subitemSearch.trim().toLowerCase();
    if (!query) return formState.items;
    return formState.items.filter((item) => item.toLowerCase().includes(query));
  }, [formState.items, subitemSearch]);

  return (
    <ConfigRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Create item groups like Mocktail or Soups and manage multiple subitems under each one.
            </p>
          </div>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={openBulkModal}
              disabled={!effectiveRestaurantId}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Bulk Import
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!effectiveRestaurantId}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add menu
            </button>
          </div>
        </div>

        {isSuperAdmin ? (
          <RoleBasedRestaurantSelector
            isVisible={isSuperAdmin}
            restaurants={restaurants}
            value={selectedRestaurantId}
            onChange={(value) => {
              setSelectedRestaurantId(value);
              setPage(1);
              setSearchInput('');
            }}
          />
        ) : null}

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by menu name or subitem… (min. 3 characters)"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
          {searchInput.length > 0 && searchInput.length < 3 ? (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              {3 - searchInput.length} more character{3 - searchInput.length !== 1 ? 's' : ''}…
            </span>
          ) : null}
          {searchInput.length >= 3 ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
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

        <div className="space-y-4">
          {!effectiveRestaurantId ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              Select a restaurant to view menus.
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading menus…" />
          ) : menus.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              No menus found.
            </div>
          ) : (
            menus.map((menu) => {
              const isOpen = openAccordionId === menu.id;
              const subitemCount = countSubitems(menu.sections);

              return (
                <div
                  key={menu.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenAccordionId(isOpen ? null : menu.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Order #{menu.displayOrder ?? 0}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {menu.sections[0]?.sectionTitle || menu.title || 'Untitled item'}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {subitemCount} subitem{subitemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                      {isOpen ? 'Collapse' : 'Expand'}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-100 px-5 py-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        {menu.sections.map((section, index) => (
                          <div
                            key={`${menu.id}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Item
                                </p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                  {section.sectionTitle}
                                </h3>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {section.items.length} subitem{section.items.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {section.items.map((item, itemIndex) => (
                                <span
                                  key={`${menu.id}-${index}-${itemIndex}`}
                                  className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(menu)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuToDelete(menu)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p>
            <span className="text-slate-500">Page {page} of {totalPages} · {totalItems} total</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {isModalOpen ? (
          <CommonModal
            title={editingMenu ? 'Edit item' : 'Create item'}
            description="Create one item at a time and manage its subitems."
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-3xl"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Item name</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Example: Mocktail, Soups, Desserts.
                  </p>
                </div>
                <input
                  value={formState.sectionTitle}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      sectionTitle: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Item name, e.g. Mocktail"
                  className={inputCls}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Order number</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Lower numbers show first in the menu list.
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.displayOrder}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      displayOrder: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Add subitems</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Type a subitem and press Enter.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={itemDraft}
                    onChange={(event) => setItemDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addItems();
                      }
                    }}
                    placeholder="MINT MOJITO"
                    className={inputCls}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => addItems()}
                      className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
                    >
                      Add subitems
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Current subitems</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Added subitems appear here one by one.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {totalConfiguredSubitems}
                    </span>
                  </div>
                  <div className="mt-4">
                    <input
                      value={subitemSearch}
                      onChange={(event) => setSubitemSearch(event.target.value)}
                      placeholder="Search current subitems"
                      className={`${inputCls} bg-white`}
                    />
                  </div>
                  <div className="mt-4 max-h-64 overflow-y-auto pr-1">
                    {formState.items.length === 0 ? (
                      <p className="text-sm text-slate-400">No subitems added yet.</p>
                    ) : filteredSubitems.length === 0 ? (
                      <p className="text-sm text-slate-400">No subitems match your search.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredSubitems.map((item) => (
                          <div
                            key={`${formState.sectionTitle}-${item}`}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 md:flex-row md:items-center md:justify-between"
                          >
                            <span className="min-w-0 flex-1 break-words">{item}</span>
                            <div className="flex shrink-0 flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                                <input
                                  type="checkbox"
                                  checked={formState.hotSellingItems.includes(item)}
                                  onChange={() => toggleHotSellingItem(item)}
                                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                                />
                                Hot selling
                              </label>
                              <button
                                type="button"
                                onClick={() => removeItem(item)}
                                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {editingMenu ? 'Save changes' : 'Create menu'}
                </LoadingButton>
              </div>
            </form>
          </CommonModal>
        ) : null}

        {menuToDelete ? (
          <ConfirmModal
            title={`Delete ${menuToDelete.title || 'menu'}?`}
            message="This removes the menu and all configured items and subitems."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setMenuToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        ) : null}

        {isBulkOpen ? (
          <CommonModal
            title="Bulk Import Menus"
            description="Upload a CSV or Excel file to create multiple menus at once."
            onClose={closeBulkModal}
            widthClassName="max-w-lg"
          >
            <div className="space-y-5">
              {/* Sample download */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sample Files
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Download a sample, fill in your data, then upload.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Download CSV Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadSampleExcel()}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Download Excel Sample
                  </button>
                </div>
              </div>

              {/* Format hint */}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                <p><strong>Required columns:</strong> <code>title</code>, <code>items</code></p>
                <p><strong>Optional:</strong> <code>hotSellingItems</code></p>
                <p className="text-amber-700">Separate multiple items within a cell using <code>|</code> (pipe). Example: <code>MINT MOJITO|BLUE LAGOON</code></p>
              </div>

              {/* Upload form */}
              <form onSubmit={(e) => void handleBulkUpload(e)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    File (CSV or Excel)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    disabled={bulk.status === 'uploading'}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setBulk((prev) => ({
                        ...prev,
                        file: f,
                        status: 'idle',
                        result: null,
                        errorMessage: '',
                      }));
                    }}
                    className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                {/* Live progress */}
                {bulk.status === 'uploading' ? (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Spinner />
                    <span className="text-sm font-medium text-amber-700">
                      Uploading and processing…
                    </span>
                  </div>
                ) : null}

                {/* Error */}
                {bulk.status === 'error' ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {bulk.errorMessage}
                  </div>
                ) : null}

                {/* Result summary */}
                {bulk.status === 'done' && bulk.result ? (
                  <UploadResultSummary result={bulk.result} />
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeBulkModal}
                    disabled={bulk.status === 'uploading'}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!bulk.file || bulk.status === 'uploading'}
                    className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulk.status === 'uploading' ? (
                      <span className="flex items-center gap-2">
                        <Spinner /> Uploading…
                      </span>
                    ) : (
                      'Upload'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </CommonModal>
        ) : null}
      </section>
    </ConfigRoute>
  );
}
