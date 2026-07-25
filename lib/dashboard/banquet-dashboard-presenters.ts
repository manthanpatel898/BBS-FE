import type { MonthlySalesMonth } from '@/lib/auth/types';

function finiteNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function buildInquiryJourney(input: {
  created: number;
  confirmed: number;
  conversionRate: number;
}) {
  const created = finiteNonNegative(input.created);
  const confirmed = finiteNonNegative(input.confirmed);
  return {
    created,
    confirmed,
    conversionRate: Math.min(finiteNonNegative(input.conversionRate), 100),
    pending: Math.max(created - confirmed, 0),
  };
}

export function buildMonthlySalesPresentation(
  month: MonthlySalesMonth,
  currentYear: number,
  currentMonth: number,
  selectedYear: number,
) {
  const effectiveRevenue = finiteNonNegative(month.effectiveRevenue);
  const actualRevenue = finiteNonNegative(month.actualRevenue);
  const estimatedRevenue = finiteNonNegative(month.estimatedRevenue);
  return {
    ...month,
    actualPercent:
      effectiveRevenue > 0 ? (actualRevenue / effectiveRevenue) * 100 : 0,
    estimatedPercent:
      effectiveRevenue > 0 ? (estimatedRevenue / effectiveRevenue) * 100 : 0,
    isCurrent: selectedYear === currentYear && month.month === currentMonth,
    isFuture:
      selectedYear > currentYear ||
      (selectedYear === currentYear && month.month > currentMonth),
  };
}
