'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReportMenuCategoryTrend } from '@/lib/auth/types';
import { resolveActiveMenuTrendCategory } from '@/lib/dashboard/menu-category-trends';

export function MenuCategoryTrends({
  groups = [],
}: {
  groups?: ReportMenuCategoryTrend[];
}) {
  const [activeCategory, setActiveCategory] = useState(() =>
    resolveActiveMenuTrendCategory(groups, ''),
  );

  useEffect(() => {
    setActiveCategory((current) =>
      resolveActiveMenuTrendCategory(groups, current),
    );
  }, [groups]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.category === activeCategory) ?? groups[0],
    [activeCategory, groups],
  );
  const maxCount = Math.max(
    ...(activeGroup?.items.map((item) => item.count) ?? []),
    1,
  );

  return (
    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-semibold text-slate-900">Menu Category Trends</h3>
      <p className="mt-1 text-sm text-slate-500">
        Top five selected items in every menu category.
      </p>
      {!groups.length ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Menu trends will appear after confirmed bookings have saved menu selections.
        </p>
      ) : (
        <>
          <div className="app-scrollbar -mx-1 mt-4 overflow-x-auto px-1 pb-2">
            <div className="flex w-max min-w-full gap-2" role="group" aria-label="Menu trend categories">
              {groups.map((group) => {
                const active = group.category === activeGroup?.category;
                return (
                  <button
                    key={group.category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(group.category)}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-700'
                    }`}
                  >
                    {group.category}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 space-y-4">
            {activeGroup?.items.map((item, index) => (
              <div key={item.name} className="min-w-0">
                <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                    <span className="mr-2 text-xs font-bold text-amber-600">#{index + 1}</span>
                    {item.name}
                  </p>
                  <p className="shrink-0 text-sm font-bold text-slate-700">
                    {item.count.toLocaleString('en-IN')} selections
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                    style={{
                      width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 10 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
