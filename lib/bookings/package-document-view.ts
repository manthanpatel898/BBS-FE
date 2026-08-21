import type {
  OrderAdditionalCategorySelection,
  OrderCategorySnapshot,
  OrderMenuSelectionSnapshot,
} from '@/lib/auth/types';

type PackageDocumentOrder = {
  pax: number | null;
  serviceSlot: string | null;
  startTime: string | null;
  endTime: string | null;
  pricePerPlate: number;
  baseTotal: number;
  categorySnapshot: OrderCategorySnapshot | null;
  menuSelectionSnapshot: OrderMenuSelectionSnapshot[];
  menuComment: string | null;
  additionalCategorySelections?: OrderAdditionalCategorySelection[];
};

export type PackageDocumentSection = {
  key: string;
  kind: 'PRIMARY' | 'ADDITIONAL';
  label: string;
  categoryName: string;
  pax: number;
  rate: number;
  subtotal: number;
  serviceSlot: string;
  startTime: string;
  endTime: string;
  time: string;
  menus: OrderMenuSelectionSnapshot[];
  comment: string | null;
};

function formatTime(value: string | null | undefined) {
  if (!value) return '';
  const [hourValue, minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatRange(startTime: string | null, endTime: string | null) {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Time pending';
}

export function buildPackageDocumentSections(
  order: PackageDocumentOrder,
): PackageDocumentSection[] {
  const primary: PackageDocumentSection[] = order.categorySnapshot
    ? [
        {
          key: 'primary',
          kind: 'PRIMARY',
          label: 'Primary package',
          categoryName: order.categorySnapshot.name,
          pax: Number(order.pax ?? 0),
          rate: Number(order.pricePerPlate ?? 0),
          subtotal: Number(order.baseTotal ?? 0),
          serviceSlot: order.serviceSlot ?? '',
          startTime: order.startTime ?? '',
          endTime: order.endTime ?? '',
          time: formatRange(order.startTime, order.endTime),
          menus: order.menuSelectionSnapshot ?? [],
          comment: order.menuComment?.trim() || null,
        },
      ]
    : [];

  const additional = [...(order.additionalCategorySelections ?? [])]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map<PackageDocumentSection>((selection, index) => ({
      key: selection.selectionId,
      kind: 'ADDITIONAL',
      label: `Additional package ${index + 1}`,
      categoryName: selection.categorySnapshot.name,
      pax: selection.pax,
      rate: selection.effectivePricePerPlate,
      subtotal: selection.subtotal,
      serviceSlot: selection.serviceSlot,
      startTime: selection.startTime,
      endTime: selection.endTime,
      time: formatRange(selection.startTime, selection.endTime),
      menus: selection.menuSelectionSnapshot,
      comment: selection.menuComment?.trim() || null,
    }));

  return [...primary, ...additional];
}
