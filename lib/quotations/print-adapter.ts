import type { Order } from '@/lib/auth/types';
import type { BanquetQuotation } from './types';

export function quotationToPrintableOrder(
  order: Order,
  quotation: BanquetQuotation,
): Order {
  const primary = quotation.packages.find((item) => item.packageType === 'PRIMARY');
  const additional = quotation.packages.filter((item) => item.packageType === 'ADDITIONAL');

  if (!primary) return order;

  return {
    ...order,
    status: 'CONFIRMED',
    pax: primary.pax,
    categorySnapshot: {
      categoryId: primary.categoryId,
      name: primary.categoryName,
      pricePerPlate: primary.configuredRatePaise / 100,
      description: null,
    },
    menuSelectionSnapshot: primary.menuSelections.map((menu) => ({
      menuId: menu.menuId,
      title: menu.title,
      directItems: menu.directItems ?? [],
      sections: menu.sections ?? [],
    })),
    additionalCategorySelections: additional.map((item, index) => ({
      selectionId: `${quotation.id}-${index}`,
      categoryId: item.categoryId,
      categorySnapshot: {
        categoryId: item.categoryId,
        name: item.categoryName,
        pricePerPlate: item.configuredRatePaise / 100,
        description: null,
      },
      pax: item.pax,
      configuredPricePerPlate: item.configuredRatePaise / 100,
      customPricePerPlate: item.customRatePaise === null ? null : item.customRatePaise / 100,
      effectivePricePerPlate: item.effectiveRatePaise / 100,
      serviceSlot: item.serviceSlot,
      subtotal: item.subtotalPaise / 100,
      startTime: item.startTime,
      endTime: item.endTime,
      menuSelectionSnapshot: item.menuSelections.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        directItems: menu.directItems ?? [],
        sections: menu.sections ?? [],
      })),
      menuComment: item.menuComment,
      displayOrder: index,
    })),
    addonServiceSnapshots: quotation.addOns.map((addon) => ({
      addonServiceId: addon.id ?? 'custom',
      label: addon.label,
      price: addon.amountPaise / 100,
    })),
    menuComment: primary.menuComment,
    pricePerPlate: primary.effectiveRatePaise / 100,
    customPricePerPlate:
      primary.customRatePaise === null ? null : primary.customRatePaise / 100,
    baseTotal: primary.subtotalPaise / 100,
    additionalCategoryTotal: additional.reduce(
      (total, item) => total + item.subtotalPaise / 100,
      0,
    ),
    extrasTotal: quotation.addOns.reduce(
      (total, addon) => total + addon.amountPaise / 100,
      0,
    ),
    grandTotal: Number(quotation.totals.grandTotalPaise ?? 0) / 100,
    pendingAmount: Number(quotation.totals.grandTotalPaise ?? 0) / 100,
    advanceAmount: 0,
    advancePayments: [],
  };
}
