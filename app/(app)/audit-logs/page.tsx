'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { fetchAuditLogs } from '@/lib/auth/api';
import { AuditLogItem } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

function prettyJson(value: Record<string, unknown> | null) {
  if (!value) return '—';
  return JSON.stringify(value, null, 2);
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('en-IN') : String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return '—';
    }

    const parsedDate = Date.parse(trimmed);
    if (!Number.isNaN(parsedDate) && /T|\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return new Date(parsedDate).toLocaleString('en-IN');
    }

    return trimmed;
  }

  return String(value);
}

function flattenDetails(
  value: Record<string, unknown> | unknown[] | null | undefined,
  prefix = '',
): Array<{ label: string; value: string }> {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return prefix ? [{ label: titleCase(prefix), value: 'No items' }] : [];
    }

    const primitiveValues = value.every(
      (item) =>
        item === null ||
        item === undefined ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean',
    );

    if (primitiveValues) {
      return prefix
        ? [{ label: titleCase(prefix), value: value.map((item) => formatPrimitive(item)).join(', ') }]
        : [];
    }

    return value.flatMap((item, index) =>
      flattenDetails(
        item as Record<string, unknown> | unknown[],
        prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`,
      ),
    );
  }

  if (typeof value !== 'object') {
    return prefix ? [{ label: titleCase(prefix), value: formatPrimitive(value) }] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix} ${key}` : key;

    if (
      nestedValue === null ||
      nestedValue === undefined ||
      typeof nestedValue === 'string' ||
      typeof nestedValue === 'number' ||
      typeof nestedValue === 'boolean'
    ) {
      return [{ label: titleCase(nextPrefix), value: formatPrimitive(nestedValue) }];
    }

    return flattenDetails(nestedValue as Record<string, unknown> | unknown[], nextPrefix);
  });
}

function DetailSection({
  title,
  emptyMessage,
  value,
}: {
  title: string;
  emptyMessage: string;
  value: Record<string, unknown> | null;
}) {
  const rows = flattenDetails(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={`${title}-${row.label}`} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
              <p className="text-sm text-slate-700 break-words">{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function operationBadge(operation: AuditLogItem['operation']) {
  const tone =
    operation === 'create'
      ? 'bg-emerald-50 text-emerald-700'
      : operation === 'update'
        ? 'bg-amber-50 text-amber-700'
        : operation === 'delete'
          ? 'bg-red-50 text-red-700'
          : 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${tone}`}>
      {operation}
    </span>
  );
}

export default function AuditLogsPage() {
  const { accessToken, isReady, user } = useAuth();
  useAppPageHeader({
    eyebrow: 'Audit Logs',
    title: 'Audit Logs',
  });
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState<'' | 'create' | 'read' | 'update' | 'delete'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchAuditLogs(accessToken, {
          page,
          limit: 20,
          search,
          module: moduleFilter,
          operation: operationFilter,
          dateFrom,
          dateTo,
        });
        setItems(response.items);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load audit logs.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [accessToken, dateFrom, dateTo, moduleFilter, operationFilter, page, search]);

  const moduleOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.module))).sort();
    return values;
  }, [items]);

  if (!isReady || !user) {
    return null;
  }

  if (user.role !== 'super_admin' && user.role !== 'company_admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mt-2 text-sm text-slate-500">
              Review activity history with actor, module, action, and clear before/after values.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {totalItems.toLocaleString('en-IN')} entries
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <input
          className={inputCls}
          placeholder="Search module, action, actor"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select className={inputCls} value={moduleFilter} onChange={(event) => { setModuleFilter(event.target.value); setPage(1); }}>
          <option value="">All modules</option>
          {moduleOptions.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <select className={inputCls} value={operationFilter} onChange={(event) => { setOperationFilter(event.target.value as typeof operationFilter); setPage(1); }}>
          <option value="">All operations</option>
          <option value="create">Create</option>
          <option value="read">Read</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input className={inputCls} type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
        <input className={inputCls} type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading audit logs…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const expanded = expandedId === item.id;

                  return (
                    <Fragment key={item.id}>
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(item.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.module}</td>
                        <td className="px-4 py-3 text-slate-700">{item.action}</td>
                        <td className="px-4 py-3">{operationBadge(item.operation)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{item.actor?.name || 'System'}</div>
                          <div className="text-xs text-slate-400">{item.actor?.role || 'system'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.summary || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : item.id)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            {expanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <DetailSection title="Before Values" emptyMessage="No old values recorded." value={item.before} />
                              <DetailSection title="After Values" emptyMessage="No new values recorded." value={item.after} />
                              <DetailSection title="Context" emptyMessage="No extra context recorded." value={item.metadata} />
                            </div>
                            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</p>
                                <p className="mt-1 text-sm text-slate-700">{item.entityType || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entity Id</p>
                                <p className="mt-1 break-all text-sm text-slate-700">{item.entityId || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Route</p>
                                <p className="mt-1 break-all text-sm text-slate-700">{item.route || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</p>
                                <p className="mt-1 text-sm text-slate-700">{item.method || '—'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            disabled={page >= totalPages}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
