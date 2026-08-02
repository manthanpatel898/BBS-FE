import { ReportMenuCategoryTrend } from '@/lib/auth/types';

export function resolveActiveMenuTrendCategory(
  groups: ReportMenuCategoryTrend[],
  requestedCategory: string,
): string {
  if (!groups.length) return '';
  return groups.some((group) => group.category === requestedCategory)
    ? requestedCategory
    : groups[0].category;
}
