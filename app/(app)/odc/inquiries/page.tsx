'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  addOdcAdvancePayment,
  addOdcOrderFollowUp,
  createOdcOrder,
  fetchOdcCalendarOrders,
  fetchOdcCategories,
  fetchOdcMenus,
  fetchOdcOrderById,
  fetchOdcOrders,
  fetchRestaurants,
  fetchSettings,
  saveOdcOrderSignature,
  updateOdcOrder,
  updateOdcOrderStatus,
} from '@/lib/auth/api';
import {
  AppSettings,
  OdcCategory,
  OdcCalendarOrder,
  OdcMenu,
  OdcOrder,
  OdcOrderStatus,
  PaymentMode,
  Restaurant,
  SignatureLocationPermissionStatus,
} from '@/lib/auth/types';

type InquiryFormState = {
  customerName: string;
  mobileNumber: string;
  inquiryDate: string;
  serviceSlot: string;
  eventName: string;
  customEventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  pax: string;
  jainSwaminarayanPax: string;
  jainSwaminarayanDetails: string;
  categoryId: string;
  customPricePerPlate: string;
  eventAddress: string;
  area: string;
  city: string;
  venueType: string;
  setupRequirement: string;
  transportNotes: string;
  notes: string;
};

type PendingOdcCreatePayload = Parameters<typeof createOdcOrder>[1];

type FollowUpFormState = {
  note: string;
  date: string;
  nextFollowUpDate: string;
};

type PaymentFormState = {
  amount: string;
  paymentMode: string;
  date: string;
  remark: string;
};

type CancelPopupState = {
  order: OdcOrder;
  reason: string;
};

type OdcTransferPopupState = {
  order: OdcOrder;
  newDate: string;
  serviceSlot: string;
  startTime: string;
  endTime: string;
};

type OdcCategoryPopupState = {
  order: OdcOrder;
  categoryId: string;
  customPricePerPlate: string;
  selectedMenus: OdcSelectedMenu[];
  menuComment: string;
  expandedRuleKeys: string[];
  skippedRuleKeys: string[];
  ruleSearches: Record<string, string>;
  headerExpanded: {
    summary: boolean;
    customer: boolean;
    category: boolean;
    price: boolean;
  };
};

type OdcAddonPopupState = {
  menuId: string;
  menuTitle: string;
  sectionTitle: string;
  value: string;
};

type OdcCustomMenuPopupState = {
  sectionTitle: string;
  itemsText: string;
};

type OdcSignaturePopupState = {
  order: OdcOrder;
  confirmationAccepted: boolean;
  hasSignature: boolean;
  locationMessage: string;
};

type ViewMode = 'list' | 'calendar';

type OdcSelectedMenu = {
  menuId: string;
  title: string;
  sections: Array<{ sectionTitle: string; items: string[] }>;
};

const CUSTOM_MENU_ID = 'custom:manual';

const initialFormState: InquiryFormState = {
  customerName: '',
  mobileNumber: '',
  inquiryDate: toDateInputValue(new Date()),
  serviceSlot: '',
  eventName: '',
  customEventName: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  pax: '',
  jainSwaminarayanPax: '',
  jainSwaminarayanDetails: '',
  categoryId: '',
  customPricePerPlate: '',
  eventAddress: '',
  area: '',
  city: 'Ahmedabad',
  venueType: 'Party Plot',
  setupRequirement: '',
  transportNotes: '',
  notes: '',
};

const initialFollowUpFormState: FollowUpFormState = {
  note: '',
  date: toDateInputValue(new Date()),
  nextFollowUpDate: '',
};

const initialPaymentFormState: PaymentFormState = {
  amount: '',
  paymentMode: '',
  date: toDateInputValue(new Date()),
  remark: '',
};

const statusOptions: Array<{ label: string; value: '' | OdcOrderStatus }> = [
  { label: 'All statuses', value: '' },
  { label: 'Inquiry', value: 'INQUIRY' },
  { label: 'Quotation sent', value: 'QUOTATION_SENT' },
  { label: 'Follow up', value: 'FOLLOW_UP' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const fallbackPaymentOptions = ['Cash', 'UPI', 'Card', 'Bank', 'Cheque'];
const fallbackEventOptions = [
  'Marriage',
  'Baby shower',
  'Reception',
  'Ring Ceremony',
  'Birthday',
  'Get together',
  'Anniversary',
];
const EVENT_OTHER_VALUE = '__other__';
const SIGNATURE_CONFIRMATION_TEXT = 'I confirm the above booking details are correct.';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const dateTimeInputCls = `${inputCls} text-slate-900 [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;

const ghostButtonCls =
  'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50';

const primaryButtonCls =
  'rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60';

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeMenuText(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? '';
}

function resolveOdcMenuForRule(
  menus: OdcMenu[],
  menuId: string,
  menuTitle: string,
  sectionTitle: string,
) {
  const byId = menus.find((menu) => menu.id === menuId);
  if (byId) return byId;

  const normalizedMenuTitle = normalizeMenuText(menuTitle);
  const normalizedSectionTitle = normalizeMenuText(sectionTitle);

  return menus.find(
    (menu) =>
      normalizeMenuText(menu.title) === normalizedMenuTitle &&
      menu.sections.some(
        (section) => normalizeMenuText(section.sectionTitle) === normalizedSectionTitle,
      ),
  );
}

function resolveOdcRuleDisplayOrder(
  menus: OdcMenu[],
  menuId: string,
  menuTitle: string,
  sectionTitle: string,
) {
  return (
    resolveOdcMenuForRule(menus, menuId, menuTitle, sectionTitle)?.displayOrder ??
    Number.MAX_SAFE_INTEGER
  );
}

function canAddOdcPayment(status: OdcOrderStatus) {
  return status === 'CONFIRMED';
}

function canShowOdcAdvanceSection(status: OdcOrderStatus) {
  return status === 'CONFIRMED' || status === 'CANCELLED';
}

function canConfirmOdcInquiry(status: OdcOrderStatus) {
  return status === 'INQUIRY' || status === 'QUOTATION_SENT' || status === 'FOLLOW_UP';
}

function canAddOdcFollowUp(status: OdcOrderStatus) {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

function canShowOdcInquiryActions(status: OdcOrderStatus) {
  return status === 'INQUIRY' || status === 'CONFIRMED';
}

function statusBadgeClass(status: OdcOrderStatus) {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'QUOTATION_SENT':
    case 'FOLLOW_UP':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    default:
      return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  }
}

function compactStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function monthRange(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function dateKey(value: string | null | undefined) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return toDateInputValue(new Date(value));
}

function buildMonthGrid(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = start.getDay();
  const totalCells = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), dayNumber);
  });
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || 'Time pending';
}

function splitFullName(value: string) {
  return { firstName: value.trim(), lastName: '' };
}

function getResolvedEventName(selectedValue: string, customValue: string) {
  if (selectedValue === EVENT_OTHER_VALUE) {
    return customValue.trim();
  }

  return selectedValue.trim();
}

function isValidTimeRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return true;
  return startTime !== endTime;
}

function withCurrentOption(options: string[], current?: string | null) {
  const normalized = options.filter(Boolean);
  if (!current?.trim()) return normalized;
  return normalized.includes(current) ? normalized : [current, ...normalized];
}

function getOdcMonthTileStatusCounts(orders: OdcCalendarOrder[]) {
  return orders.reduce(
    (counts, order) => {
      if (order.status === 'CANCELLED') {
        counts.cancelled += 1;
      } else if (order.status === 'CONFIRMED' || order.status === 'COMPLETED') {
        counts.booked += 1;
      } else if (order.status === 'QUOTATION_SENT' || order.status === 'FOLLOW_UP') {
        counts.followUp += 1;
      } else {
        counts.inquiry += 1;
      }

      return counts;
    },
    { inquiry: 0, followUp: 0, booked: 0, cancelled: 0 },
  );
}

function odcCalendarCardClass(status: OdcOrderStatus) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') {
    return 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]';
  }

  if (status === 'CANCELLED') {
    return 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
  }

  if (status === 'QUOTATION_SENT' || status === 'FOLLOW_UP') {
    return 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]';
  }

  return 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]';
}

function IconGlyph({ icon }: { icon: 'previous' | 'next' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
      {icon === 'previous' ? <path d="m12.5 4.5-5 5 5 5" /> : <path d="m7.5 4.5 5 5-5 5" />}
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FormSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  children,
  label,
  required,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function OdcInquiriesPage() {
  useAppPageHeader({
    eyebrow: 'Outdoor Catering',
    title: 'ODC Inquiries',
  });

  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OdcOrder[]>([]);
  const [calendarOrders, setCalendarOrders] = useState<OdcCalendarOrder[]>([]);
  const [categories, setCategories] = useState<OdcCategory[]>([]);
  const [menus, setMenus] = useState<OdcMenu[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => toDateInputValue(new Date()));
  const [dayRecordsPopup, setDayRecordsPopup] = useState<{
    dateKey: string;
    orders: OdcCalendarOrder[];
  } | null>(null);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCalendarDateForInquiry, setSelectedCalendarDateForInquiry] = useState('');
  const [formState, setFormState] = useState<InquiryFormState>(initialFormState);
  const [editingOrder, setEditingOrder] = useState<OdcOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingCreatePayload = useRef<PendingOdcCreatePayload | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<OdcOrder | null>(null);
  const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [advanceDate, setAdvanceDate] = useState(toDateInputValue(new Date()));
  const [advanceRemark, setAdvanceRemark] = useState('');
  const [isAdvanceSubmitting, setIsAdvanceSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [followUpOrder, setFollowUpOrder] = useState<OdcOrder | null>(null);
  const [followUpFormState, setFollowUpFormState] = useState<FollowUpFormState>(initialFollowUpFormState);
  const [paymentOrder, setPaymentOrder] = useState<OdcOrder | null>(null);
  const [paymentFormState, setPaymentFormState] = useState<PaymentFormState>(initialPaymentFormState);
  const [cancelPopup, setCancelPopup] = useState<CancelPopupState | null>(null);
  const [transferPopup, setTransferPopup] = useState<OdcTransferPopupState | null>(null);
  const [categoryPopup, setCategoryPopup] = useState<OdcCategoryPopupState | null>(null);
  const [odcAddonPopup, setOdcAddonPopup] = useState<OdcAddonPopupState | null>(null);
  const [odcCustomMenuPopup, setOdcCustomMenuPopup] =
    useState<OdcCustomMenuPopupState | null>(null);
  const [signaturePopup, setSignaturePopup] = useState<OdcSignaturePopupState | null>(null);
  const [isSignatureSubmitting, setIsSignatureSubmitting] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);
  const [subitemDescriptionKey, setSubitemDescriptionKey] = useState<string | null>(null);
  const subitemDescriptionPopoverRef = useRef<HTMLSpanElement | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OdcOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';
  const hasOdcAccess = Boolean(user?.canAccessOdc);
  const selectedCategory = categories.find((category) => category.id === formState.categoryId);
  const paymentOptions =
    settings?.paymentOptions.map((option) => option.label) ?? fallbackPaymentOptions;
  const defaultPaymentMode = paymentOptions[0] ?? 'Cash';
  const paymentModeChoices = withCurrentOption(paymentOptions, paymentMode);
  const eventOptions =
    settings?.eventOptions.map((option) => option.label) ?? fallbackEventOptions;
  const eventChoices = [...eventOptions, 'Other'];
  const isCustomEventSelected = formState.eventName === EVENT_OTHER_VALUE;
  const calendarOrdersByDate = useMemo(() => {
    const groups = new Map<string, OdcCalendarOrder[]>();
    for (const order of calendarOrders) {
      const key = dateKey(order.eventDate);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), order]);
    }
    return groups;
  }, [calendarOrders]);
  const calendarDays = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const todayKey = toDateInputValue(new Date());

  useEffect(() => {
    if (!subitemDescriptionKey) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        target &&
        subitemDescriptionPopoverRef.current &&
        subitemDescriptionPopoverRef.current.contains(target)
      ) {
        return;
      }

      setSubitemDescriptionKey(null);
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [subitemDescriptionKey]);

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
    if (!accessToken || !hasOdcAccess || !effectiveRestaurantId) {
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');
        const restaurantScope = isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {};
        const [ordersResponse, categoriesResponse, menusResponse, settingsResponse] =
          await Promise.all([
            fetchOdcOrders(token, {
              page,
              limit,
              search,
              status,
              ...restaurantScope,
            }),
            fetchOdcCategories(token, {
              page: 1,
              limit: 100,
              search: '',
              ...restaurantScope,
            }),
            fetchOdcMenus(token, {
              page: 1,
              limit: 100,
              search: '',
              ...restaurantScope,
            }),
            fetchSettings(token),
          ]);

        setOrders(ordersResponse.items);
        setTotalPages(ordersResponse.pagination.totalPages);
        setTotalItems(ordersResponse.pagination.total);
        setCategories(categoriesResponse.items);
        setMenus(menusResponse.items);
        setSettings(settingsResponse);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch ODC inquiries.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, effectiveRestaurantId, hasOdcAccess, isSuperAdmin, limit, page, search, status]);

  useEffect(() => {
    if (!accessToken || !hasOdcAccess || !effectiveRestaurantId || viewMode !== 'calendar') {
      return;
    }

    const token = accessToken;

    async function loadCalendar() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchOdcCalendarOrders(token, {
          ...monthRange(calendarMonth),
          ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
        });
        setCalendarOrders(response);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch ODC calendar.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCalendar();
  }, [accessToken, calendarMonth, effectiveRestaurantId, hasOdcAccess, isSuperAdmin, viewMode]);

  async function reloadOrders(token: string, nextPage: number) {
    const response = await fetchOdcOrders(token, {
      page: nextPage,
      limit,
      search,
      status,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    });
    setOrders(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  async function refreshOdcViews(token: string) {
    await reloadOrders(token, 1);
    if (viewMode === 'calendar') {
      const calendarResponse = await fetchOdcCalendarOrders(token, {
        ...monthRange(calendarMonth),
        ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
      });
      setCalendarOrders(calendarResponse);
    }
  }

  function openCreateModal(selectedDate?: string) {
    setEditingOrder(null);
    setSelectedCalendarDateForInquiry(selectedDate ?? '');
    setFormState({
      ...initialFormState,
      inquiryDate: toDateInputValue(new Date()),
      eventDate: selectedDate ?? '',
    });
    setIsModalOpen(true);
  }

  function openCreateModalFromCalendar(selectedDate: string) {
    openCreateModal(selectedDate);
    setDayRecordsPopup(null);
  }

  function goToCalendarMonth(nextMonth: Date) {
    setCalendarMonth(nextMonth);
    setSelectedCalendarDay(toDateInputValue(nextMonth));
  }

  function closeCreateModal() {
    setIsModalOpen(false);
    setEditingOrder(null);
    setSelectedCalendarDateForInquiry('');
  }

  function openEditOdcInquiry(order: OdcOrder) {
    setEditingOrder(order);
    setSelectedCalendarDateForInquiry('');
    setFormState({
      customerName: `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`.trim(),
      mobileNumber: order.customerSnapshot.phone ?? '',
      inquiryDate: dateKey(order.inquiryDate) || toDateInputValue(new Date()),
      serviceSlot: order.serviceSlot ?? '',
      eventName: order.eventName ?? '',
      customEventName: '',
      eventDate: dateKey(order.eventDate),
      startTime: order.startTime ?? '',
      endTime: order.endTime ?? '',
      pax: order.pax ? String(order.pax) : '',
      jainSwaminarayanPax:
        order.jainSwaminarayanPax !== null ? String(order.jainSwaminarayanPax) : '',
      jainSwaminarayanDetails: order.jainSwaminarayanDetails ?? '',
      categoryId: order.categorySnapshot?.categoryId ?? '',
      customPricePerPlate:
        order.customPricePerPlate !== null ? String(order.customPricePerPlate) : '',
      eventAddress: order.eventAddress ?? '',
      area: order.area ?? '',
      city: order.city ?? 'Ahmedabad',
      venueType: order.venueType ?? 'Party Plot',
      setupRequirement: order.setupRequirement ?? '',
      transportNotes: order.transportNotes ?? '',
      notes: order.notes ?? '',
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  }

  function openTransferPopup(order: OdcOrder) {
    if (!isCompanyAdmin) {
      setError('Contact company admin to transfer this ODC booking.');
      return;
    }

    setTransferPopup({
      order,
      newDate: dateKey(order.eventDate),
      serviceSlot: order.serviceSlot ?? '',
      startTime: order.startTime ?? '',
      endTime: order.endTime ?? '',
    });
  }

  function openSignaturePopup(order: OdcOrder) {
    setSignaturePopup({
      order,
      confirmationAccepted: false,
      hasSignature: false,
      locationMessage: '',
    });
    window.setTimeout(() => resetSignatureCanvas(), 0);
  }

  function resetSignatureCanvas() {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    prepareSignatureCanvas(canvas, true);
    isDrawingSignatureRef.current = false;
    setSignaturePopup((current) =>
      current ? { ...current, hasSignature: false } : current,
    );
  }

  function prepareSignatureCanvas(canvas: HTMLCanvasElement, forceClear = false) {
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(Math.floor(rect.width * ratio), 1);
    const nextHeight = Math.max(Math.floor(rect.height * ratio), 1);

    if (forceClear || canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (forceClear) {
      context.clearRect(0, 0, rect.width, rect.height);
    }
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0f172a';
  }

  function getSignaturePoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleSignaturePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      prepareSignatureCanvas(canvas);
    }
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getSignaturePoint(event);
    isDrawingSignatureRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handleSignaturePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) return;

    const context = signatureCanvasRef.current?.getContext('2d');
    if (!context) return;

    const point = getSignaturePoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setSignaturePopup((current) =>
      current?.hasSignature ? current : current ? { ...current, hasSignature: true } : current,
    );
  }

  function handleSignaturePointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingSignatureRef.current = false;
  }

  async function captureSignatureLocation(): Promise<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    locationPermissionStatus: SignatureLocationPermissionStatus;
    message: string;
  }> {
    if (!navigator.geolocation) {
      return {
        locationPermissionStatus: 'UNAVAILABLE',
        message: 'Location is unavailable. Signature will be saved without coordinates.',
      };
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        locationPermissionStatus: 'GRANTED',
        message: 'Location captured with signature.',
      };
    } catch (locationError) {
      const permissionDenied =
        locationError instanceof GeolocationPositionError &&
        locationError.code === locationError.PERMISSION_DENIED;

      return {
        locationPermissionStatus: permissionDenied ? 'DENIED' : 'UNAVAILABLE',
        message: permissionDenied
          ? 'Location permission denied. Signature will be saved without coordinates.'
          : 'Location is unavailable. Signature will be saved without coordinates.',
      };
    }
  }

  async function handleSaveSignature() {
    if (!accessToken || !signaturePopup) return;

    if (!signaturePopup.confirmationAccepted) {
      setError('Confirm the ODC booking details before signing.');
      return;
    }

    if (!signaturePopup.hasSignature) {
      setError('Add a signature before saving.');
      return;
    }

    const signatureImage = signatureCanvasRef.current?.toDataURL('image/png');
    if (!signatureImage) {
      setError('Unable to read signature.');
      return;
    }

    try {
      setIsSignatureSubmitting(true);
      const location = await captureSignatureLocation();
      setSignaturePopup((current) =>
        current ? { ...current, locationMessage: location.message } : current,
      );
      const signature = await saveOdcOrderSignature(accessToken, signaturePopup.order.id, {
        signatureImage,
        confirmationAccepted: signaturePopup.confirmationAccepted,
        confirmationText: SIGNATURE_CONFIRMATION_TEXT,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        locationPermissionStatus: location.locationPermissionStatus,
      });
      setSuccessMessage('ODC signature saved successfully.');
      setSignaturePopup(null);
      setDetailOrder((current) =>
        current?.id === signaturePopup.order.id
          ? { ...current, activeSignature: signature }
          : current,
      );
      setOrders((current) =>
        current.map((order) =>
          order.id === signaturePopup.order.id ? { ...order, activeSignature: signature } : order,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save signature.',
      );
    } finally {
      setIsSignatureSubmitting(false);
    }
  }

  function openCategoryPopup(order: OdcOrder) {
    setCategoryPopup({
      order,
      categoryId: order.categorySnapshot?.categoryId ?? '',
      customPricePerPlate:
        order.customPricePerPlate !== null ? String(order.customPricePerPlate) : '',
      selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        sections: menu.sections.map((section) => ({
          sectionTitle: section.sectionTitle,
          items: section.items,
        })),
      })),
      menuComment: order.menuComment ?? '',
      expandedRuleKeys: [],
      skippedRuleKeys: [],
      ruleSearches: {},
      headerExpanded: {
        summary: true,
        customer: false,
        category: true,
        price: Boolean(order.customPricePerPlate),
      },
    });
  }

  function updateCategoryPopup(updater: (current: OdcCategoryPopupState) => OdcCategoryPopupState) {
    setCategoryPopup((current) => (current ? updater(current) : current));
  }

  function makeRuleKey(menuId: string, sectionTitle: string) {
    return `${menuId}:${sectionTitle}`;
  }

  function toggleOdcMenuItem(
    rule: OdcCategory['menuRules'][number],
    item: string,
    checked: boolean,
  ) {
    updateCategoryPopup((current) => {
      const existingMenu = current.selectedMenus.find((menu) => menu.menuId === rule.menuId);
      let nextMenus = current.selectedMenus;

      if (!existingMenu && checked) {
        nextMenus = [
          ...nextMenus,
          { menuId: rule.menuId, title: rule.menuTitle, sections: [] },
        ];
      }

      nextMenus = nextMenus
        .map((menu) => {
          if (menu.menuId !== rule.menuId) return menu;
          const existingSection = menu.sections.find(
            (section) => section.sectionTitle === rule.sectionTitle,
          );
          let sections = menu.sections;

          if (!existingSection && checked) {
            sections = [...sections, { sectionTitle: rule.sectionTitle, items: [item] }];
          } else {
            sections = sections
              .map((section) => {
                if (section.sectionTitle !== rule.sectionTitle) return section;
                return {
                  ...section,
                  items: checked
                    ? Array.from(new Set([...section.items, item]))
                    : section.items.filter((currentItem) => currentItem !== item),
                };
              })
              .filter((section) => section.items.length > 0);
          }

          return { ...menu, sections };
        })
        .filter((menu) => menu.sections.length > 0);

      return { ...current, selectedMenus: nextMenus };
    });
  }

  function addOdcAddonItem(menuId: string, menuTitle: string, sectionTitle: string, item: string) {
    const trimmed = item.trim();
    if (!trimmed) return;

    updateCategoryPopup((current) => {
      const existingMenu = current.selectedMenus.find((menu) => menu.menuId === menuId);
      let nextMenus = current.selectedMenus;

      if (!existingMenu) {
        nextMenus = [
          ...current.selectedMenus,
          { menuId, title: menuTitle, sections: [{ sectionTitle, items: [trimmed] }] },
        ];
      } else {
        nextMenus = nextMenus.map((menu) => {
          if (menu.menuId !== menuId) return menu;
          const existingSection = menu.sections.find(
            (section) => section.sectionTitle === sectionTitle,
          );

          if (!existingSection) {
            return {
              ...menu,
              sections: [...menu.sections, { sectionTitle, items: [trimmed] }],
            };
          }

          if (existingSection.items.includes(trimmed)) return menu;

          return {
            ...menu,
            sections: menu.sections.map((section) =>
              section.sectionTitle === sectionTitle
                ? { ...section, items: [...section.items, trimmed] }
                : section,
            ),
          };
        });
      }

      return { ...current, selectedMenus: nextMenus };
    });
  }

  function removeOdcAddonItem(menuId: string, sectionTitle: string, item: string) {
    updateCategoryPopup((current) => ({
      ...current,
      selectedMenus: current.selectedMenus
        .map((menu) => {
          if (menu.menuId !== menuId) return menu;
          return {
            ...menu,
            sections: menu.sections
              .map((section) =>
                section.sectionTitle === sectionTitle
                  ? { ...section, items: section.items.filter((currentItem) => currentItem !== item) }
                  : section,
              )
              .filter((section) => section.items.length > 0),
          };
        })
        .filter((menu) => menu.sections.length > 0),
    }));
  }

  function toggleOdcHeaderSection(section: keyof OdcCategoryPopupState['headerExpanded']) {
    updateCategoryPopup((current) => ({
      ...current,
      headerExpanded: {
        ...current.headerExpanded,
        [section]: !current.headerExpanded[section],
      },
    }));
  }

  function toggleOdcRuleSkipped(rule: OdcCategory['menuRules'][number]) {
    updateCategoryPopup((current) => {
      const key = makeRuleKey(rule.menuId, rule.sectionTitle);
      const skipped = current.skippedRuleKeys.includes(key);
      const selectedMenus = skipped
        ? current.selectedMenus
        : current.selectedMenus
            .map((menu) =>
              menu.menuId === rule.menuId
                ? {
                    ...menu,
                    sections: menu.sections.filter(
                      (section) => section.sectionTitle !== rule.sectionTitle,
                    ),
                  }
                : menu,
            )
            .filter((menu) => menu.sections.length > 0);

      return {
        ...current,
        selectedMenus,
        skippedRuleKeys: skipped
          ? current.skippedRuleKeys.filter((item) => item !== key)
          : [...current.skippedRuleKeys, key],
      };
    });
  }

  function parseCustomMenuItems(rawValue: string) {
    return Array.from(
      new Set(
        rawValue
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  function addOdcCustomMenuEntry(sectionTitleValue: string, itemsTextValue: string) {
    updateCategoryPopup((current) => {
      const sectionTitle = sectionTitleValue.trim();
      const items = parseCustomMenuItems(itemsTextValue);
      if (!sectionTitle || !items.length) return current;

      const existingCustomMenu = current.selectedMenus.find(
        (menu) => menu.menuId === CUSTOM_MENU_ID,
      );
      const nextCustomMenu: OdcSelectedMenu = existingCustomMenu
        ? {
            ...existingCustomMenu,
            sections: existingCustomMenu.sections.some(
              (section) => section.sectionTitle === sectionTitle,
            )
              ? existingCustomMenu.sections.map((section) =>
                  section.sectionTitle === sectionTitle
                    ? { ...section, items: Array.from(new Set([...section.items, ...items])) }
                    : section,
                )
              : [...existingCustomMenu.sections, { sectionTitle, items }],
          }
        : { menuId: CUSTOM_MENU_ID, title: 'Custom Menu', sections: [{ sectionTitle, items }] };

      return {
        ...current,
        selectedMenus: existingCustomMenu
          ? current.selectedMenus.map((menu) =>
              menu.menuId === CUSTOM_MENU_ID ? nextCustomMenu : menu,
            )
          : [...current.selectedMenus, nextCustomMenu],
      };
    });
  }

  function removeOdcCustomMenuSection(sectionTitle: string) {
    updateCategoryPopup((current) => ({
      ...current,
      selectedMenus: current.selectedMenus
        .map((menu) => {
          if (menu.menuId !== CUSTOM_MENU_ID) return menu;
          return {
            ...menu,
            sections: menu.sections.filter((section) => section.sectionTitle !== sectionTitle),
          };
        })
        .filter((menu) => menu.sections.length > 0),
    }));
  }

  function updateForm<K extends keyof InquiryFormState>(key: K, value: InquiryFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleCategoryChange(categoryId: string) {
    setFormState((current) => ({
      ...current,
      categoryId,
      customPricePerPlate: current.customPricePerPlate || '',
    }));
  }

  function openFollowUpModal(order: OdcOrder) {
    setFollowUpOrder(order);
    setFollowUpFormState(initialFollowUpFormState);
  }

  function openPaymentModal(order: OdcOrder) {
    if (!canAddOdcPayment(order.status)) {
      setError('Advance payment can be recorded only after the ODC booking is confirmed.');
      return;
    }

    setPaymentOrder(order);
    setPaymentFormState({
      ...initialPaymentFormState,
      amount: order.pendingAmount > 0 ? String(order.pendingAmount) : '',
    });
  }

  function openConfirmInquiryPopup(order: OdcOrder) {
    if (!canConfirmOdcInquiry(order.status)) return;

    pendingCreatePayload.current = null;
    setConfirmingOrder(order);
    setPaymentMode(defaultPaymentMode);
    setAdvanceDate(toDateInputValue(new Date()));
    setAdvanceAmount('');
    setAdvanceRemark('');
    setIsDetailOpen(false);
    setIsConfirmPopupOpen(true);
  }

  async function openOrderDetail(orderId: string, initialOrder?: OdcOrder) {
    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    try {
      setDayRecordsPopup(null);
      setIsDetailOpen(true);
      setDetailOrder(initialOrder ?? null);
      setIsDetailLoading(true);
      setDetailError('');
      const order = await fetchOdcOrderById(accessToken, orderId);
      setDetailOrder(order);
    } catch (requestError) {
      setDetailOrder(null);
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to open ODC inquiry.',
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  function buildOdcPreviewOrder(calendarOrder: OdcCalendarOrder): OdcOrder {
    const customerName = splitFullName(calendarOrder.customerName || 'Customer');
    const timestamp = calendarOrder.inquiryDate ?? calendarOrder.eventDate ?? new Date().toISOString();

    return {
      id: calendarOrder.id,
      restaurantId: effectiveRestaurantId ?? '',
      customerId: '',
      customerSnapshot: {
        firstName: customerName.firstName,
        lastName: customerName.lastName,
        phone: calendarOrder.customerPhone,
        email: null,
      },
      orderId: calendarOrder.orderId,
      orderNumber: 0,
      status: calendarOrder.status,
      pax: calendarOrder.pax,
      eventName: calendarOrder.eventName,
      eventDate: calendarOrder.eventDate,
      inquiryDate: calendarOrder.inquiryDate,
      confirmedAt: null,
      startTime: calendarOrder.startTime,
      endTime: calendarOrder.endTime,
      serviceSlot: calendarOrder.serviceSlot,
      jainSwaminarayanPax: calendarOrder.jainSwaminarayanPax,
      jainSwaminarayanDetails: calendarOrder.jainSwaminarayanDetails,
      eventAddress: null,
      area: calendarOrder.area,
      city: calendarOrder.city,
      landmark: null,
      googleMapsLink: null,
      serviceType: calendarOrder.serviceType,
      venueType: calendarOrder.venueType,
      setupRequirement: null,
      transportNotes: null,
      servingStaffRequirement: null,
      packagingRequirement: null,
      equipmentRequirement: null,
      categorySnapshot: null,
      menuSelectionSnapshot: [],
      pricePerPlate: 0,
      customPricePerPlate: null,
      baseTotal: calendarOrder.grandTotal,
      extraCharges: 0,
      discountAmount: 0,
      grandTotal: calendarOrder.grandTotal,
      advanceAmount: Math.max(calendarOrder.grandTotal - calendarOrder.pendingAmount, 0),
      pendingAmount: calendarOrder.pendingAmount,
      paymentStatus:
        calendarOrder.grandTotal <= 0
          ? 'UNPAID'
          : calendarOrder.pendingAmount <= 0
            ? 'PAID'
            : calendarOrder.pendingAmount >= calendarOrder.grandTotal
              ? 'UNPAID'
              : 'PARTIAL',
      advancePayments: [],
      followUps: [],
      menuComment: null,
      nextFollowUpDate: calendarOrder.nextFollowUpDate,
      assignedStaffMember: null,
      notes: null,
      cancelReason: null,
      activeSignature: null,
      bookingTakenBy: 'N/A',
      bookingTakenBySignature: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  function buildOdcCreatePayload(status: OdcOrderStatus): PendingOdcCreatePayload {
    if (!accessToken) {
      throw new Error('Missing session token.');
    }

    if (!effectiveRestaurantId) {
      throw new Error('Select an ODC-enabled restaurant first.');
    }

    const customerName = formState.customerName.trim();
    const phone = formState.mobileNumber.trim();
    const eventName = getResolvedEventName(formState.eventName, formState.customEventName);

    if (!customerName) {
      throw new Error('Customer name is required.');
    }

    if (!/^\d{10}$/.test(phone)) {
      throw new Error('Mobile number must be exactly 10 digits.');
    }

    if (!formState.serviceSlot.trim()) {
      throw new Error('Service slot is required.');
    }

    if (!eventName) {
      throw new Error('Event name is required.');
    }

    if (!formState.eventDate) {
      throw new Error('Function date is required.');
    }

    if (!formState.startTime || !formState.endTime) {
      throw new Error('Function start time and end time are required.');
    }

    if (!isValidTimeRange(formState.startTime, formState.endTime)) {
      throw new Error('End time must be later than start time.');
    }

    const pax = Number(formState.pax);
    if (!Number.isInteger(pax) || pax < 1) {
      throw new Error('No. of total person must be a whole number greater than 0.');
    }

    const jainPax = formState.jainSwaminarayanPax.trim()
      ? Number(formState.jainSwaminarayanPax)
      : undefined;
    if (jainPax !== undefined && (!Number.isInteger(jainPax) || jainPax < 0)) {
      throw new Error('Jain/Swaminarayan person must be a valid whole number.');
    }

    const customPricePerPlate = formState.customPricePerPlate.trim()
      ? Number(formState.customPricePerPlate)
      : undefined;
    if (
      customPricePerPlate !== undefined &&
      (!Number.isFinite(customPricePerPlate) || customPricePerPlate < 0)
    ) {
      throw new Error('Custom price must be a valid amount.');
    }

    const { firstName, lastName } = splitFullName(customerName);
    const restaurantScope = isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {};

    return {
      customer: {
        firstName,
        lastName,
        phone,
        address: formState.eventAddress.trim() || undefined,
      },
      categoryId: formState.categoryId || undefined,
      status,
      pax,
      eventName,
      eventDate: formState.eventDate || undefined,
      inquiryDate: toDateInputValue(new Date()),
      startTime: formState.startTime || undefined,
      endTime: formState.endTime || undefined,
      serviceSlot: formState.serviceSlot.trim() || undefined,
      jainSwaminarayanPax: jainPax,
      jainSwaminarayanDetails:
        formState.jainSwaminarayanDetails.trim() || undefined,
      eventAddress: formState.eventAddress.trim() || undefined,
      area: formState.area.trim() || undefined,
      city: formState.city.trim() || undefined,
      venueType: formState.venueType.trim() || undefined,
      setupRequirement: formState.setupRequirement.trim() || undefined,
      transportNotes: formState.transportNotes.trim() || undefined,
      customPricePerPlate,
      notes: formState.notes.trim() || undefined,
      ...restaurantScope,
    };
  }

  function resetCreateFlow() {
    setIsModalOpen(false);
    setSelectedCalendarDateForInquiry('');
    setFormState(initialFormState);
    setAdvanceAmount('');
    setAdvanceDate(toDateInputValue(new Date()));
    setAdvanceRemark('');
  }

  async function handleCreateInquiry(status: OdcOrderStatus) {
    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = buildOdcCreatePayload(status);
      if (status === 'CONFIRMED') {
        pendingCreatePayload.current = payload;
        setConfirmingOrder(null);
        setPaymentMode(defaultPaymentMode);
        setAdvanceDate(toDateInputValue(new Date()));
        setAdvanceAmount('');
        setAdvanceRemark('');
        setIsModalOpen(false);
        setIsConfirmPopupOpen(true);
        return;
      }

      await createOdcOrder(accessToken, payload);

      setSuccessMessage('ODC inquiry created successfully.');
      resetCreateFlow();
      setPage(1);
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create ODC inquiry.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveInquiryForm(status: OdcOrderStatus) {
    if (!editingOrder) {
      await handleCreateInquiry(status);
      return;
    }

    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const payload = buildOdcCreatePayload(editingOrder.status);
      await updateOdcOrder(accessToken, editingOrder.id, payload);
      setSuccessMessage(`ODC inquiry ${editingOrder.orderId} updated.`);
      closeCreateModal();
      setPage(1);
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update ODC inquiry.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || (!pendingCreatePayload.current && !confirmingOrder)) return;

    const normalizedAdvance = advanceAmount.trim() ? Number(advanceAmount) : 0;
    if (!Number.isFinite(normalizedAdvance) || normalizedAdvance < 0) {
      setError('Advance amount must be a valid amount.');
      return;
    }

    try {
      setIsAdvanceSubmitting(true);
      setError('');

      if (pendingCreatePayload.current) {
        await createOdcOrder(accessToken, {
          ...pendingCreatePayload.current,
          status: 'CONFIRMED',
          advanceAmount: normalizedAdvance,
          paymentMode,
          advanceDate,
          notes:
            advanceRemark.trim() ||
            pendingCreatePayload.current.notes ||
            undefined,
        });
        pendingCreatePayload.current = null;
      } else if (confirmingOrder) {
        await updateOdcOrderStatus(accessToken, confirmingOrder.id, { status: 'CONFIRMED' });
        if (normalizedAdvance > 0) {
          await addOdcAdvancePayment(accessToken, confirmingOrder.id, {
            amount: normalizedAdvance,
            paymentMode,
            date: advanceDate || undefined,
            remark: advanceRemark.trim() || undefined,
          });
        }
      }

      setConfirmingOrder(null);
      setIsConfirmPopupOpen(false);
      setSuccessMessage('ODC booking confirmed successfully.');
      resetCreateFlow();
      setPage(1);
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to confirm ODC booking.',
      );
    } finally {
      setIsAdvanceSubmitting(false);
    }
  }

  async function handleKeepAsInquiry() {
    if (!accessToken || !pendingCreatePayload.current) return;

    try {
      setIsAdvanceSubmitting(true);
      setError('');
      await createOdcOrder(accessToken, {
        ...pendingCreatePayload.current,
        status: 'INQUIRY',
        advanceAmount: undefined,
        paymentMode: undefined,
        advanceDate: undefined,
      });
      pendingCreatePayload.current = null;
      setConfirmingOrder(null);
      setIsConfirmPopupOpen(false);
      setSuccessMessage('ODC inquiry created successfully.');
      resetCreateFlow();
      setPage(1);
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create ODC inquiry.',
      );
    } finally {
      setIsAdvanceSubmitting(false);
    }
  }

  async function handleStatusChange(order: OdcOrder, nextStatus: OdcOrderStatus) {
    if (!accessToken) return;

    try {
      setStatusUpdatingId(order.id);
      setError('');
      await updateOdcOrderStatus(accessToken, order.id, { status: nextStatus });
      await reloadOrders(accessToken, page);
      if (viewMode === 'calendar') {
        const calendarResponse = await fetchOdcCalendarOrders(accessToken, {
          ...monthRange(calendarMonth),
          ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
        });
        setCalendarOrders(calendarResponse);
      }
      if (detailOrder?.id === order.id) {
        setDetailOrder(await fetchOdcOrderById(accessToken, order.id));
      }
      setSuccessMessage(`ODC inquiry ${order.orderId} updated.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update ODC inquiry status.',
      );
    } finally {
      setStatusUpdatingId('');
    }
  }

  function handleConfirmOdcInquiry(order: OdcOrder) {
    openConfirmInquiryPopup(order);
  }

  async function handleFollowUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !followUpOrder) return;

    try {
      setIsActionSubmitting(true);
      setError('');
      await addOdcOrderFollowUp(accessToken, followUpOrder.id, {
        note: followUpFormState.note.trim(),
        date: followUpFormState.date || undefined,
        nextFollowUpDate: followUpFormState.nextFollowUpDate || undefined,
      });
      await reloadOrders(accessToken, page);
      setSuccessMessage(`Follow-up added for ${followUpOrder.orderId}.`);
      setFollowUpOrder(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to add ODC follow-up.',
      );
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !paymentOrder) return;

    if (!canAddOdcPayment(paymentOrder.status)) {
      setError('Advance payment can be recorded only after the ODC booking is confirmed.');
      return;
    }

    const amount = Number(paymentFormState.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }

    try {
      setIsActionSubmitting(true);
      setError('');
      await addOdcAdvancePayment(accessToken, paymentOrder.id, {
        amount,
        paymentMode: paymentFormState.paymentMode.trim(),
        date: paymentFormState.date || undefined,
        remark: paymentFormState.remark.trim() || undefined,
      });
      await reloadOrders(accessToken, page);
      if (detailOrder?.id === paymentOrder.id) {
        setDetailOrder(await fetchOdcOrderById(accessToken, paymentOrder.id));
      }
      setSuccessMessage(`Advance payment added for ${paymentOrder.orderId}.`);
      setPaymentOrder(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to add ODC advance payment.',
      );
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleCancelOdcOrder() {
    if (!accessToken || !cancelPopup) return;

    const reason = cancelPopup.reason.trim();
    if (!reason) {
      setError('Cancellation reason is required.');
      return;
    }

    try {
      setIsActionSubmitting(true);
      setError('');
      await updateOdcOrderStatus(accessToken, cancelPopup.order.id, {
        status: 'CANCELLED',
        cancelReason: reason,
      });
      await reloadOrders(accessToken, page);
      if (viewMode === 'calendar') {
        const calendarResponse = await fetchOdcCalendarOrders(accessToken, {
          ...monthRange(calendarMonth),
          ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
        });
        setCalendarOrders(calendarResponse);
      }
      if (detailOrder?.id === cancelPopup.order.id) {
        setDetailOrder(await fetchOdcOrderById(accessToken, cancelPopup.order.id));
      }
      setSuccessMessage(`ODC order ${cancelPopup.order.orderId} cancelled.`);
      setCancelPopup(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to cancel ODC order.',
      );
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleTransferOdcOrder() {
    if (!accessToken || !transferPopup) return;

    if (!isCompanyAdmin) {
      setError('Contact company admin to transfer this ODC booking.');
      return;
    }

    if (!transferPopup.newDate) {
      setError('New date is required.');
      return;
    }

    if (
      (transferPopup.startTime || transferPopup.endTime) &&
      (!transferPopup.startTime || !transferPopup.endTime)
    ) {
      setError('Start time and end time are both required.');
      return;
    }

    if (!isValidTimeRange(transferPopup.startTime, transferPopup.endTime)) {
      setError('End time must be later than start time.');
      return;
    }

    try {
      setIsActionSubmitting(true);
      setError('');
      await updateOdcOrder(accessToken, transferPopup.order.id, {
        eventDate: transferPopup.newDate,
        serviceSlot: transferPopup.serviceSlot.trim(),
        startTime: transferPopup.startTime || undefined,
        endTime: transferPopup.endTime || undefined,
      });
      setTransferPopup(null);
      setSuccessMessage(
        transferPopup.order.status === 'CONFIRMED'
          ? 'ODC booking transferred successfully.'
          : 'ODC inquiry transferred successfully.',
      );
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to transfer ODC inquiry.',
      );
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleUpdateOdcCategory() {
    if (!accessToken || !categoryPopup) return;

    if (!categoryPopup.categoryId) {
      setError('Choose a category first.');
      return;
    }

    const customPricePerPlate = categoryPopup.customPricePerPlate.trim()
      ? Number(categoryPopup.customPricePerPlate)
      : undefined;
    if (
      customPricePerPlate !== undefined &&
      (!Number.isFinite(customPricePerPlate) || customPricePerPlate < 0)
    ) {
      setError('Custom price must be a valid amount.');
      return;
    }

    try {
      setIsActionSubmitting(true);
      setError('');
      await updateOdcOrder(accessToken, categoryPopup.order.id, {
        categoryId: categoryPopup.categoryId,
        customPricePerPlate,
        selectedMenus: categoryPopup.selectedMenus.map((menu) => ({
          menuId: menu.menuId,
          sections: menu.sections.map((section) => ({
            sectionTitle: section.sectionTitle,
            items: section.items,
          })),
        })),
        menuComment: categoryPopup.menuComment.trim() || undefined,
      });
      setCategoryPopup(null);
      setSuccessMessage(`Category updated for ${categoryPopup.order.orderId}.`);
      await refreshOdcViews(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update ODC category.',
      );
    } finally {
      setIsActionSubmitting(false);
    }
  }

  if (!hasOdcAccess) {
    return (
      <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-800">
        Outdoor Catering is not enabled for your account.
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {viewMode === 'list' ? (
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto_auto] lg:items-end">
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
            placeholder="Search inquiry, customer, city..."
            className={inputCls}
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={inputCls}
        >
          {statusOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{totalItems}</span> total
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm font-medium shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="rounded-lg bg-amber-400 px-4 py-2 text-white"
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50"
          >
            Calendar
          </button>
        </div>
      </div>
      ) : isSuperAdmin ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <RoleBasedRestaurantSelector
            isVisible={isSuperAdmin}
            restaurants={restaurants}
            value={selectedRestaurantId}
            onChange={(value) => setSelectedRestaurantId(value)}
          />
        </div>
      ) : null}

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

      {viewMode === 'calendar' ? (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="truncate text-lg font-bold leading-none text-slate-900 sm:text-[2rem]">
                  {formatMonthLabel(calendarMonth)}
                </h2>
              </div>
              <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => goToCalendarMonth(shiftMonth(calendarMonth, -1))}
                  aria-label="Previous month"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
                >
                  <IconGlyph icon="previous" />
                </button>
                <button
                  type="button"
                  onClick={() => goToCalendarMonth(shiftMonth(calendarMonth, 1))}
                  aria-label="Next month"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
                >
                  <IconGlyph icon="next" />
                </button>
                <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                  <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:px-5"
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-medium text-white transition sm:px-5"
                    >
                      Calendar
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToCalendarMonth(new Date())}
                    className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:px-5"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
              Loading calendar...
            </div>
          ) : (
            <div className="space-y-4">
              {calendarOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No ODC inquiries in this range. You can still browse dates and add a new ODC inquiry.
                </div>
              ) : null}
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:gap-3 sm:text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="rounded-2xl border border-slate-200 bg-slate-50 px-1.5 py-2 sm:px-3">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`odc-month-empty-${index}`} className="min-h-[112px] sm:min-h-[132px]" aria-hidden="true" />;
                  }

                  const key = toDateInputValue(day);
                  const items = calendarOrdersByDate.get(key) ?? [];
                  const counts = getOdcMonthTileStatusCounts(items);
                  const isSelectedDay = selectedCalendarDay === key;
                  const isToday = key === todayKey;
                  const isHighlightedDay = isSelectedDay || (!selectedCalendarDay && isToday);
                  const statusRows = [
                    { key: 'booked', count: counts.booked, markerClassName: 'bg-emerald-400', textClassName: 'text-slate-800' },
                    { key: 'inquiry', count: counts.inquiry, markerClassName: 'bg-amber-300', textClassName: 'text-slate-800' },
                    { key: 'follow-up', count: counts.followUp, markerClassName: 'bg-slate-950', textClassName: 'text-slate-800' },
                    { key: 'cancelled', count: counts.cancelled, markerClassName: 'bg-red-300', textClassName: 'text-slate-800' },
                  ];
                  const visibleRows = statusRows.filter((statusRow) => statusRow.count > 0);
                  const compactStatusRows = [
                    ...visibleRows,
                    ...Array.from({ length: 4 - visibleRows.length }, () => null),
                  ];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedCalendarDay(key);
                        setDayRecordsPopup({ dateKey: key, orders: items });
                      }}
                      className={`relative min-h-[112px] overflow-hidden rounded-[26px] border text-left transition sm:min-h-[132px] ${
                        isHighlightedDay
                          ? 'border-amber-300 bg-white ring-2 ring-amber-100'
                          : isToday
                            ? 'border-slate-200 bg-white'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 flex min-h-[42px] items-center justify-center rounded-t-[25px] border-b px-2 py-2 sm:min-h-[48px] ${
                          isHighlightedDay ? 'border-b-amber-200 bg-amber-50' : 'border-b-slate-200 bg-slate-50'
                        }`}
                      >
                        <p className={`text-2xl font-medium leading-none sm:text-3xl ${isHighlightedDay ? 'text-amber-700' : 'text-slate-500'}`}>
                          {day.getDate()}
                        </p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 top-[42px] grid grid-rows-4 px-2 text-[9px] sm:top-[48px] sm:px-3 sm:text-[10px]">
                        {compactStatusRows.map((statusRow, rowIndex) => (
                          <div
                            key={statusRow?.key ?? `odc-status-empty-${rowIndex}`}
                            className={`flex h-full items-center gap-1.5 ${
                              rowIndex > 0 && compactStatusRows.slice(0, rowIndex).some(Boolean) && statusRow
                                ? 'border-t border-slate-200'
                                : ''
                            }`}
                          >
                            {statusRow ? (
                              <>
                                <span className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${statusRow.markerClassName}`} />
                                <span className={`text-[11px] font-medium tabular-nums sm:text-xs ${statusRow.textClassName}`}>
                                  {statusRow.count}
                                </span>
                              </>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Inquiry</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Event</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoader colSpan={5} message="Loading ODC inquiries..." />
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                  No ODC inquiries found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td
                    className="cursor-pointer px-5 py-4"
                    onClick={() => void openOrderDetail(order.id, order)}
                  >
                    <p className="font-semibold text-slate-900">{order.orderId}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Inquiry: {formatDate(order.inquiryDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Next follow-up: {formatDate(order.nextFollowUpDate)}
                    </p>
                  </td>
                  <td
                    className="cursor-pointer px-5 py-4"
                    onClick={() => void openOrderDetail(order.id, order)}
                  >
                    <p className="font-medium text-slate-900">
                      {order.customerSnapshot.firstName} {order.customerSnapshot.lastName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{order.customerSnapshot.phone}</p>
                  </td>
                  <td
                    className="cursor-pointer px-5 py-4"
                    onClick={() => void openOrderDetail(order.id, order)}
                  >
                    <p className="font-medium text-slate-900">{order.eventName || 'Outdoor event'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(order.eventDate)} · {order.city || order.area || 'Location pending'} · {order.pax ?? 0} pax
                    </p>
                  </td>
                  <td
                    className="cursor-pointer px-5 py-4"
                    onClick={() => void openOrderDetail(order.id, order)}
                  >
                    <p className="font-semibold text-slate-900">{formatCurrency(order.grandTotal)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pending {formatCurrency(order.pendingAmount)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      {isCompanyAdmin ? (
                        <select
                          value={order.status}
                          disabled={statusUpdatingId === order.id}
                          onChange={(event) =>
                            void handleStatusChange(order, event.target.value as OdcOrderStatus)
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none ${statusBadgeClass(order.status)}`}
                        >
                          {statusOptions
                            .filter((option) => option.value)
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                          {compactStatus(order.status)}
                        </span>
                      )}
                      {isCompanyAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          {canConfirmOdcInquiry(order.status) ? (
                            <button type="button" onClick={() => handleConfirmOdcInquiry(order)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Confirm Inquiry</button>
                          ) : null}
                          {canAddOdcFollowUp(order.status) ? (
                            <button type="button" onClick={() => openFollowUpModal(order)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Follow-up</button>
                          ) : null}
                          {canAddOdcPayment(order.status) ? (
                            <button type="button" onClick={() => openPaymentModal(order)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Add Advance</button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {viewMode === 'list' ? (
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          <PageLoader message="Loading ODC inquiries..." />
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400 shadow-sm">
            No ODC inquiries found.
          </div>
        ) : (
          orders.map((order) => (
            <article key={`mobile-${order.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => void openOrderDetail(order.id, order)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{order.orderId}</p>
                  <p className="mt-1 text-sm text-slate-700">{order.eventName || 'Outdoor event'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(order.eventDate)} · {order.pax ?? 0} pax
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Next follow-up: {formatDate(order.nextFollowUpDate)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                  {compactStatus(order.status)}
                </span>
              </button>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Customer</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {order.customerSnapshot.firstName} {order.customerSnapshot.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{order.customerSnapshot.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Amount</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatCurrency(order.grandTotal)}</p>
                  <p className="text-xs text-slate-500">Pending {formatCurrency(order.pendingAmount)}</p>
                </div>
              </div>
              {isCompanyAdmin ? (
                <div className="mt-4 flex gap-2">
                  {canConfirmOdcInquiry(order.status) ? (
                    <button type="button" onClick={() => handleConfirmOdcInquiry(order)} className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Confirm Inquiry</button>
                  ) : null}
                  {canAddOdcFollowUp(order.status) ? (
                    <button type="button" onClick={() => openFollowUpModal(order)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Follow-up</button>
                  ) : null}
                  {canAddOdcPayment(order.status) ? (
                    <button type="button" onClick={() => openPaymentModal(order)} className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700">Add Advance</button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
      ) : null}

      {viewMode === 'list' ? (
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 disabled:opacity-40">Next</button>
        </div>
      </div>
      ) : null}

      {dayRecordsPopup ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setDayRecordsPopup(null)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-2xl lg:max-w-5xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {formatDate(dayRecordsPopup.dateKey)}
                </h3>
                <p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 shadow-sm">
                  {dayRecordsPopup.orders.length} ODC inquir{dayRecordsPopup.orders.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDayRecordsPopup(null)}
                aria-label="Close day panel"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <button
                type="button"
                disabled={dayRecordsPopup.dateKey < todayKey}
                onClick={() => openCreateModalFromCalendar(dayRecordsPopup.dateKey)}
                className={`${primaryButtonCls} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40`}
                title={dayRecordsPopup.dateKey < todayKey ? 'Cannot add ODC inquiry for a past date' : undefined}
              >
                Create inquiry
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {dayRecordsPopup.orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No ODC inquiries for this day.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {[...dayRecordsPopup.orders]
                    .sort((a, b) => {
                      const statusOrder: Record<string, number> = {
                        CONFIRMED: 0,
                        COMPLETED: 1,
                        QUOTATION_SENT: 2,
                        FOLLOW_UP: 3,
                        INQUIRY: 4,
                        CANCELLED: 5,
                      };
                      const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
                      if (statusDiff !== 0) return statusDiff;
                      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
                    })
                    .map((calendarOrder) => (
                      <button
                        type="button"
                        key={`odc-popup-${calendarOrder.id}`}
                        onClick={() =>
                          void openOrderDetail(
                            calendarOrder.id,
                            buildOdcPreviewOrder(calendarOrder),
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${odcCalendarCardClass(calendarOrder.status)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{calendarOrder.customerName}</p>
                            <p className="mt-1 text-sm text-slate-600">{calendarOrder.eventName || 'Outdoor event'}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatTimeRange(calendarOrder.startTime, calendarOrder.endTime)} • {calendarOrder.pax ?? 0} pax
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-900">
                              Inquiry Date: {formatDate(calendarOrder.inquiryDate)}
                            </p>
                            {calendarOrder.serviceSlot ? (
                              <p className="mt-1 text-xs font-semibold text-slate-900">
                                Service Slot: {calendarOrder.serviceSlot}
                              </p>
                            ) : null}
                            {calendarOrder.city || calendarOrder.area ? (
                              <p className="mt-1 text-xs font-semibold text-slate-900">
                                Location: {[calendarOrder.area, calendarOrder.city].filter(Boolean).join(', ')}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusBadgeClass(calendarOrder.status)}`}>
                              {compactStatus(calendarOrder.status)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${
                                calendarOrder.hasMenuSelection
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {calendarOrder.hasMenuSelection ? 'Menu Selected' : 'Menu Pending'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {isModalOpen ? (
        <CommonModal
          title={editingOrder ? `Edit ${editingOrder.orderId}` : 'Create ODC inquiry'}
          onClose={closeCreateModal}
          widthClassName="max-w-5xl"
          zIndexClassName="z-[80]"
        >
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveInquiryForm('INQUIRY');
            }}
          >
            <FormSection title="Customer Information">
              <Field label="Customer Name" required>
                <input
                  value={formState.customerName}
                  onChange={(event) => updateForm('customerName', event.target.value)}
                  placeholder="Enter customer name"
                  className={`${inputCls} min-h-12`}
                />
              </Field>
              <Field label="Mobile Number" required>
                <input
                  value={formState.mobileNumber}
                  onChange={(event) =>
                    updateForm(
                      'mobileNumber',
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  className={`${inputCls} min-h-12`}
                />
              </Field>
            </FormSection>

            <FormSection title="Event Information">
              <Field label="Service Slot" required>
                <select
                  value={formState.serviceSlot}
                  onChange={(event) => updateForm('serviceSlot', event.target.value)}
                  className={`${inputCls} min-h-12`}
                >
                  <option value="">Select service slot</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </Field>
              <Field label="Event Name" required>
                <div className="space-y-2">
                  <select
                    value={formState.eventName}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateForm('eventName', value);
                      if (value !== EVENT_OTHER_VALUE) {
                        updateForm('customEventName', '');
                      }
                    }}
                    className={`${inputCls} min-h-12`}
                  >
                    <option value="">Select event option</option>
                    {eventChoices.map((option) => (
                      <option key={option} value={option === 'Other' ? EVENT_OTHER_VALUE : option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {isCustomEventSelected ? (
                    <input
                      value={formState.customEventName}
                      onChange={(event) => updateForm('customEventName', event.target.value)}
                      placeholder="Enter event name"
                      className={`${inputCls} min-h-12`}
                    />
                  ) : null}
                </div>
              </Field>
              <Field label="Function Date" required>
                <input
                  value={formState.eventDate}
                  onChange={(event) => updateForm('eventDate', event.target.value)}
                  type="date"
                  required
                  disabled={Boolean(selectedCalendarDateForInquiry)}
                  className={`${dateTimeInputCls} min-h-12 ${
                    selectedCalendarDateForInquiry ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''
                  }`}
                />
                {selectedCalendarDateForInquiry ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Function date is fixed from the selected ODC calendar day.
                  </p>
                ) : null}
              </Field>
              <Field label="Function Start Time" required><input value={formState.startTime} onChange={(event) => updateForm('startTime', event.target.value)} type="time" className={`${dateTimeInputCls} min-h-12`} /></Field>
              <Field label="Function End Time" required><input value={formState.endTime} onChange={(event) => updateForm('endTime', event.target.value)} type="time" className={`${dateTimeInputCls} min-h-12`} /></Field>
              <Field label="No. of Total Person" required><input value={formState.pax} onChange={(event) => updateForm('pax', event.target.value)} inputMode="numeric" className={`${inputCls} min-h-12`} /></Field>
              <Field label="Jain/Swaminarayan Person"><input value={formState.jainSwaminarayanPax} onChange={(event) => updateForm('jainSwaminarayanPax', event.target.value)} inputMode="numeric" className={`${inputCls} min-h-12`} /></Field>
              <Field label="Jain/Swaminarayan Details"><input value={formState.jainSwaminarayanDetails} onChange={(event) => updateForm('jainSwaminarayanDetails', event.target.value)} className={`${inputCls} min-h-12`} /></Field>
            </FormSection>

            <FormSection title="Package And Menu">
              <Field label="Category">
                <select value={formState.categoryId} onChange={(event) => handleCategoryChange(event.target.value)} className={`${inputCls} min-h-12`}>
                  <option value="">Select category</option>
                  {categories.map((category) => (<option key={category.id} value={category.id}>{category.name} ({formatCurrency(category.pricePerPlate)})</option>))}
                </select>
              </Field>
              <Field label="Custom Price">
                <input
                  value={formState.customPricePerPlate}
                  onChange={(event) => updateForm('customPricePerPlate', event.target.value)}
                  inputMode="decimal"
                  placeholder={selectedCategory ? `Default ${formatCurrency(selectedCategory.pricePerPlate)}` : 'Optional custom price'}
                  className={`${inputCls} min-h-12`}
                />
              </Field>
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Menu selection will be available from the ODC booking detail flow.
              </div>
            </FormSection>

            <FormSection title="ODC Information">
              <Field label="Address"><textarea value={formState.eventAddress} onChange={(event) => updateForm('eventAddress', event.target.value)} rows={3} className={`${inputCls} resize-none`} /></Field>
              <Field label="City"><input value={formState.city} onChange={(event) => updateForm('city', event.target.value)} className={`${inputCls} min-h-12`} /></Field>
              <Field label="Area"><input value={formState.area} onChange={(event) => updateForm('area', event.target.value)} className={`${inputCls} min-h-12`} /></Field>
              <Field label="Venue Type"><input value={formState.venueType} onChange={(event) => updateForm('venueType', event.target.value)} className={`${inputCls} min-h-12`} /></Field>
              <Field label="Setup Requirement"><textarea value={formState.setupRequirement} onChange={(event) => updateForm('setupRequirement', event.target.value)} rows={3} className={`${inputCls} resize-none`} /></Field>
              <Field label="Transport Notes"><textarea value={formState.transportNotes} onChange={(event) => updateForm('transportNotes', event.target.value)} rows={3} className={`${inputCls} resize-none`} /></Field>
            </FormSection>

            <FormSection title="Additional Information">
              <div className="md:col-span-2">
                <Field label="Additional Information"><textarea value={formState.notes} onChange={(event) => updateForm('notes', event.target.value)} rows={4} className={`${inputCls} min-h-32 resize-none`} /></Field>
              </div>
            </FormSection>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeCreateModal} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:w-auto">Cancel</button>
              <LoadingButton type="submit" disabled={isSubmitting} isLoading={isSubmitting} className={`${primaryButtonCls} w-full sm:w-auto`}>
                {editingOrder ? 'Save inquiry' : 'Create inquiry'}
              </LoadingButton>
              {!editingOrder ? (
                <LoadingButton type="button" disabled={isSubmitting} onClick={() => void handleCreateInquiry('CONFIRMED')} isLoading={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 sm:w-auto">
                  Confirm Booking
                </LoadingButton>
              ) : null}
            </div>
          </form>
        </CommonModal>
      ) : null}

      {isConfirmPopupOpen ? (
        <CommonModal
          title={confirmingOrder ? `Convert ${confirmingOrder.orderId} to booking` : 'Confirm ODC booking'}
          onClose={() => {
            setIsConfirmPopupOpen(false);
            pendingCreatePayload.current = null;
            setConfirmingOrder(null);
          }}
          widthClassName="max-w-md"
        >
          <p className="mt-4 text-sm leading-7 text-slate-500">
            {confirmingOrder
              ? 'Enter the advance amount and payment mode to convert this ODC inquiry. Zero amount is allowed.'
              : 'Enter the advance amount and payment mode to confirm this ODC booking. Zero amount is allowed.'}
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleConfirmBooking}>
            <Field label="Advance Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(event.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Payment Mode">
              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
                className={inputCls}
              >
                {paymentModeChoices.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Advance Date">
              <input
                type="date"
                value={advanceDate}
                onChange={(event) => setAdvanceDate(event.target.value)}
                className={dateTimeInputCls}
              />
            </Field>
            <Field label="Remarks">
              <textarea
                value={advanceRemark}
                onChange={(event) => setAdvanceRemark(event.target.value)}
                placeholder="Add remarks if needed"
                className={`${inputCls} min-h-24 resize-none`}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmPopupOpen(false);
                  pendingCreatePayload.current = null;
                  setConfirmingOrder(null);
                  setAdvanceRemark('');
                }}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              {!confirmingOrder ? (
                <LoadingButton
                  type="button"
                  disabled={isAdvanceSubmitting}
                  onClick={() => void handleKeepAsInquiry()}
                  isLoading={isAdvanceSubmitting}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  Keep as Inquiry
                </LoadingButton>
              ) : null}
              <LoadingButton
                type="submit"
                disabled={isAdvanceSubmitting}
                isLoading={isAdvanceSubmitting}
                className={primaryButtonCls}
              >
                Confirm booking
              </LoadingButton>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {isDetailOpen ? (
        <CommonModal
          title="Event Detail"
          onClose={() => {
            setIsDetailOpen(false);
            setDetailOrder(null);
            setDetailError('');
          }}
          widthClassName="max-w-4xl"
          zIndexClassName="z-[80]"
          panelClassName="flex flex-col !pb-0 overflow-hidden"
          contentClassName="flex min-h-0 flex-1 overflow-hidden"
        >
          {isDetailLoading && !detailOrder ? (
            <PageLoader message="Loading ODC inquiry..." />
          ) : detailError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
              {detailError}
            </div>
          ) : detailOrder ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {isDetailLoading ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                  Refreshing latest details...
                </div>
              ) : null}
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pb-5 pr-1">
              <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(detailOrder.status)}`}>
                    {compactStatus(detailOrder.status)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                      detailOrder.menuSelectionSnapshot.length
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {detailOrder.menuSelectionSnapshot.length ? 'Menu Selected' : 'Menu Pending'}
                  </span>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Inquiry Details
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {detailOrder.eventName || 'ODC event details pending'}
                    </p>
                  </div>
                  <div className="min-w-[180px] rounded-xl bg-slate-50 px-3 py-2 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Package
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {detailOrder.categorySnapshot?.name ||
                        (detailOrder.customPricePerPlate !== null
                          ? 'Custom Price'
                          : 'Package pending')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Customer', `${detailOrder.customerSnapshot.firstName} ${detailOrder.customerSnapshot.lastName}`.trim() || 'Customer pending'],
                    ['Mobile', detailOrder.customerSnapshot.phone || 'Mobile pending'],
                    ['Inquiry Date', formatDate(detailOrder.inquiryDate)],
                    ['Event Date', formatDate(detailOrder.eventDate)],
                    ['Time', formatTimeRange(detailOrder.startTime, detailOrder.endTime)],
                    ['Service Slot', detailOrder.serviceSlot || 'Service slot pending'],
                    ['Venue', detailOrder.venueType || 'Venue pending'],
                    [
                      'Jain/Swaminarayan',
                      detailOrder.jainSwaminarayanPax
                        ? `${detailOrder.jainSwaminarayanPax}`
                        : 'Pending',
                    ],
                    ['PAX', `${detailOrder.pax ?? 0}`],
                    ['Price', formatCurrency(detailOrder.customPricePerPlate ?? detailOrder.pricePerPlate)],
                    ...(detailOrder.confirmedAt ? [['Confirmed', formatDate(detailOrder.confirmedAt)]] : []),
                    ['Created By', 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Menu Snapshot
                  </p>
                  {detailOrder.menuSelectionSnapshot.length > 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {detailOrder.menuSelectionSnapshot.length} menu
                      {detailOrder.menuSelectionSnapshot.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {detailOrder.menuSelectionSnapshot.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 md:col-span-2 2xl:col-span-3">
                      No menu selected yet.
                    </p>
                  ) : (
                    detailOrder.menuSelectionSnapshot.map((menu) => (
                      <div
                        key={menu.menuId}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <h3 className="text-sm font-semibold text-slate-900">{menu.title}</h3>
                        <div className="mt-2 grid gap-x-4 gap-y-2 text-sm text-slate-700 xl:grid-cols-2">
                          {menu.sections.map((section) => (
                            <div key={`${menu.menuId}-${section.sectionTitle}`} className="min-w-0">
                              {section.sectionTitle.trim().toLowerCase() !==
                              menu.title.trim().toLowerCase() ? (
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  {section.sectionTitle}
                                </p>
                              ) : null}
                              <p className="mt-0.5 leading-5">{section.items.join(', ') || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {detailOrder.menuComment ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Menu Comment
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {detailOrder.menuComment}
                  </p>
                </section>
              ) : null}

              {canShowOdcAdvanceSection(detailOrder.status) ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Advance Payments
                    </p>
                    <div className="text-sm font-semibold text-slate-900">
                      Advance {formatCurrency(detailOrder.advanceAmount)} · Pending{' '}
                      {formatCurrency(detailOrder.pendingAmount)}
                    </div>
                  </div>
                  {detailOrder.advancePayments.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
                      No advance payments recorded yet.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-amber-200 text-slate-500">
                            <th className="px-3 py-2 font-medium">Date</th>
                            <th className="px-3 py-2 font-medium">Amount</th>
                            <th className="px-3 py-2 font-medium">Mode</th>
                            <th className="px-3 py-2 font-medium">Remarks</th>
                            <th className="px-3 py-2 font-medium">Recorded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...detailOrder.advancePayments]
                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((payment, index) => (
                              <tr
                                key={[
                                  payment.createdAt,
                                  payment.date,
                                  payment.amount,
                                  payment.paymentMode,
                                  payment.recordedByName,
                                  index,
                                ].join('-')}
                                className="border-b border-amber-100 last:border-b-0"
                              >
                                <td className="px-3 py-3 text-slate-700">{formatDate(payment.date)}</td>
                                <td className="px-3 py-3 font-semibold text-slate-900">
                                  {formatCurrency(payment.amount)}
                                </td>
                                <td className="px-3 py-3 text-slate-700">{payment.paymentMode}</td>
                                <td className="px-3 py-3 text-slate-700">{payment.remark || '-'}</td>
                                <td className="px-3 py-3 text-slate-700">{payment.recordedByName}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ODC Information
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['Address', detailOrder.eventAddress || 'Not set'],
                    ['City', detailOrder.city || 'Not set'],
                    ['Area', detailOrder.area || 'Not set'],
                    ['Venue Type', detailOrder.venueType || 'Not set'],
                    ['Setup Requirement', detailOrder.setupRequirement || 'Not set'],
                    ['Transport Notes', detailOrder.transportNotes || 'Not set'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {(detailOrder.notes || detailOrder.jainSwaminarayanDetails) ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Additional Information
                  </p>
                  {detailOrder.notes ? (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {detailOrder.notes}
                    </p>
                  ) : null}
                  {detailOrder.jainSwaminarayanDetails ? (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      <span className="font-semibold text-slate-900">
                        Jain/Swaminarayan Details:
                      </span>{' '}
                      {detailOrder.jainSwaminarayanDetails}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Follow-ups
                  </p>
                  {isCompanyAdmin && canAddOdcFollowUp(detailOrder.status) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailOpen(false);
                        openFollowUpModal(detailOrder);
                      }}
                      className={ghostButtonCls}
                    >
                      Add follow-up
                    </button>
                  ) : null}
                </div>
                {detailOrder.followUps.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                    No follow-ups added yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {detailOrder.followUps.map((followUp) => (
                      <div
                        key={`${followUp.createdAt}-${followUp.note}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span>{formatDate(followUp.date)}</span>
                          <span>Next: {formatDate(followUp.nextFollowUpDate)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {followUp.note}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {followUp.followUpByName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              </div>

              {isCompanyAdmin ? (
              <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.5rem+var(--zb-safe-bottom))] pt-2 shadow-[0_-18px_35px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 sm:pb-[calc(0.75rem+var(--zb-safe-bottom))] sm:pt-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Actions
                  </p>
                  {detailOrder.status === 'CONFIRMED' ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Advance {formatCurrency(detailOrder.advanceAmount)}
                    </span>
                  ) : null}
                </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {detailOrder.status === 'CONFIRMED' ? (
                      <>
                        <Link
                          href={`/print/order?id=${detailOrder.id}&type=odc`}
                          target="_blank"
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Print
                        </Link>
                        <Link
                          href={`/print/order?id=${detailOrder.id}&type=odc&copy=kitchen`}
                          target="_blank"
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Kitchen Print
                        </Link>
                        {detailOrder.activeSignature && !isCompanyAdmin ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-500 shadow-sm"
                          >
                            Signed
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSignaturePopup(detailOrder)}
                            className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
                          >
                            {detailOrder.activeSignature ? 'Re-sign' : 'Sign'}
                          </button>
                        )}
                      </>
                    ) : null}
                    {canConfirmOdcInquiry(detailOrder.status) ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmOdcInquiry(detailOrder)}
                        className="inline-flex min-w-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        Confirm Inquiry
                      </button>
                    ) : null}
                    {canAddOdcPayment(detailOrder.status) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailOpen(false);
                          openPaymentModal(detailOrder);
                        }}
                        className="inline-flex min-w-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        Add Advance
                      </button>
                    ) : null}
                    {canShowOdcInquiryActions(detailOrder.status) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            openTransferPopup(detailOrder);
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditOdcInquiry(detailOrder)}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Edit inquiry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            openCategoryPopup(detailOrder);
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Select Menu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setCancelPopup({ order: detailOrder, reason: '' });
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                        >
                          Cancel order
                        </button>
                      </>
                    ) : null}
                  </div>
              </div>
              ) : null}
            </div>
          ) : null}
        </CommonModal>
      ) : null}

      {followUpOrder ? (
        <CommonModal
          title={`Add follow-up · ${followUpOrder.orderId}`}
          onClose={() => setFollowUpOrder(null)}
          widthClassName="max-w-2xl"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleFollowUpSubmit}>
            <input
              value={followUpFormState.date}
              onChange={(event) =>
                setFollowUpFormState((current) => ({ ...current, date: event.target.value }))
              }
              type="date"
              className={dateTimeInputCls}
            />
            <input
              value={followUpFormState.nextFollowUpDate}
              onChange={(event) =>
                setFollowUpFormState((current) => ({
                  ...current,
                  nextFollowUpDate: event.target.value,
                }))
              }
              type="date"
              className={dateTimeInputCls}
            />
            <textarea
              value={followUpFormState.note}
              onChange={(event) =>
                setFollowUpFormState((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Follow-up note"
              rows={4}
              required
              className={`${inputCls} resize-none md:col-span-2`}
            />
            <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFollowUpOrder(null)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:w-auto">Cancel</button>
              <LoadingButton type="submit" disabled={isActionSubmitting} isLoading={isActionSubmitting} className="w-full rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60 sm:w-auto">
                Add follow-up
              </LoadingButton>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {signaturePopup ? (
        <CommonModal
          title={signaturePopup.order.activeSignature ? 'Re-sign ODC booking' : 'Sign ODC booking'}
          onClose={() => setSignaturePopup(null)}
          widthClassName="max-w-3xl"
          zIndexClassName="z-[90]"
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Date', formatDate(signaturePopup.order.eventDate)],
                ['Slot', signaturePopup.order.serviceSlot || 'Slot pending'],
                [
                  'Time',
                  formatTimeRange(signaturePopup.order.startTime, signaturePopup.order.endTime),
                ],
                ['Pax', `${signaturePopup.order.pax ?? 0}`],
                [
                  'Package',
                  signaturePopup.order.categorySnapshot?.name ||
                    (signaturePopup.order.customPricePerPlate !== null
                      ? 'Custom Price'
                      : 'Package pending'),
                ],
                [
                  'Package Price',
                  formatCurrency(
                    signaturePopup.order.customPricePerPlate ??
                      signaturePopup.order.pricePerPlate,
                  ),
                ],
                ['Total Amount', formatCurrency(signaturePopup.order.grandTotal)],
                ['Advance Paid', formatCurrency(signaturePopup.order.advanceAmount)],
                ['Pending Amount', formatCurrency(signaturePopup.order.pendingAmount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {signaturePopup.order.activeSignature ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This ODC booking was signed on {formatDate(signaturePopup.order.activeSignature.signedAt)} by{' '}
                {signaturePopup.order.activeSignature.capturedByName}. Saving again will replace
                the active signature and keep the previous one in history.
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Customer Signature</p>
                <button
                  type="button"
                  onClick={() => resetSignatureCanvas()}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
              <canvas
                ref={signatureCanvasRef}
                onPointerDown={handleSignaturePointerDown}
                onPointerMove={handleSignaturePointerMove}
                onPointerUp={handleSignaturePointerEnd}
                onPointerCancel={handleSignaturePointerEnd}
                className="h-48 w-full touch-none rounded-2xl border border-slate-300 bg-white shadow-inner"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={signaturePopup.confirmationAccepted}
                onChange={(event) =>
                  setSignaturePopup((current) =>
                    current
                      ? { ...current, confirmationAccepted: event.target.checked }
                      : current,
                  )
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500"
              />
              <span>{SIGNATURE_CONFIRMATION_TEXT}</span>
            </label>

            {signaturePopup.locationMessage ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {signaturePopup.locationMessage}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSignaturePopup(null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                onClick={() => void handleSaveSignature()}
                disabled={
                  isSignatureSubmitting ||
                  !signaturePopup.confirmationAccepted ||
                  !signaturePopup.hasSignature
                }
                isLoading={isSignatureSubmitting}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                Save signature
              </LoadingButton>
            </div>
          </div>
        </CommonModal>
      ) : null}

      {paymentOrder ? (
        <CommonModal
          title={`Add advance payment · ${paymentOrder.orderId}`}
          onClose={() => setPaymentOrder(null)}
          widthClassName="max-w-2xl"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePaymentSubmit}>
            <input
              value={paymentFormState.amount}
              onChange={(event) =>
                setPaymentFormState((current) => ({ ...current, amount: event.target.value }))
              }
              placeholder="Amount"
              required
              inputMode="decimal"
              className={inputCls}
            />
            <input
              value={paymentFormState.paymentMode}
              onChange={(event) =>
                setPaymentFormState((current) => ({
                  ...current,
                  paymentMode: event.target.value,
                }))
              }
              placeholder="Payment mode"
              required
              className={inputCls}
            />
            <input
              value={paymentFormState.date}
              onChange={(event) =>
                setPaymentFormState((current) => ({ ...current, date: event.target.value }))
              }
              type="date"
              className={dateTimeInputCls}
            />
            <input
              value={paymentFormState.remark}
              onChange={(event) =>
                setPaymentFormState((current) => ({ ...current, remark: event.target.value }))
              }
              placeholder="Remark"
              className={inputCls}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
              Pending before payment: <span className="font-semibold text-slate-900">{formatCurrency(paymentOrder.pendingAmount)}</span>
            </div>
            <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPaymentOrder(null)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:w-auto">Cancel</button>
              <LoadingButton type="submit" disabled={isActionSubmitting} isLoading={isActionSubmitting} className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto">
                Add payment
              </LoadingButton>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {transferPopup ? (
        <CommonModal
          title={`Transfer ${transferPopup.order.status === 'CONFIRMED' ? 'Booking' : 'Inquiry'}`}
          onClose={() => setTransferPopup(null)}
          widthClassName="max-w-2xl"
          zIndexClassName="z-[80]"
        >
          <div className="mt-6 space-y-5">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Event
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {transferPopup.order.eventName || transferPopup.order.orderId}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="New Date" required>
                <input
                  type="date"
                  value={transferPopup.newDate}
                  onChange={(event) =>
                    setTransferPopup((current) =>
                      current ? { ...current, newDate: event.target.value } : current,
                    )
                  }
                  className={`${dateTimeInputCls} min-h-12`}
                />
              </Field>
              <Field label="Service Slot">
                <select
                  value={transferPopup.serviceSlot}
                  onChange={(event) =>
                    setTransferPopup((current) =>
                      current ? { ...current, serviceSlot: event.target.value } : current,
                    )
                  }
                  className={`${inputCls} min-h-12`}
                >
                  <option value="">Select service slot</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start Time">
                <input
                  type="time"
                  value={transferPopup.startTime}
                  onChange={(event) =>
                    setTransferPopup((current) =>
                      current ? { ...current, startTime: event.target.value } : current,
                    )
                  }
                  className={`${dateTimeInputCls} min-h-12`}
                />
              </Field>
              <Field label="End Time">
                <input
                  type="time"
                  value={transferPopup.endTime}
                  onChange={(event) =>
                    setTransferPopup((current) =>
                      current ? { ...current, endTime: event.target.value } : current,
                    )
                  }
                  className={`${dateTimeInputCls} min-h-12`}
                />
              </Field>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This transfers the entire {transferPopup.order.status === 'CONFIRMED' ? 'booking' : 'inquiry'} to another date. Service slot and timing can also be updated here.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTransferPopup(null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                onClick={() => void handleTransferOdcOrder()}
                disabled={isActionSubmitting}
                isLoading={isActionSubmitting}
                className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
              >
                Transfer
              </LoadingButton>
            </div>
          </div>
        </CommonModal>
      ) : null}

      {categoryPopup ? (
        <CommonModal
          title={`Select Menu · ${categoryPopup.order.orderId}`}
          onClose={() => setCategoryPopup(null)}
          widthClassName="max-w-5xl"
          zIndexClassName="z-[80]"
          panelClassName="flex h-[92vh] min-h-0 flex-col overflow-hidden"
          contentClassName="flex min-h-0 flex-1 overflow-hidden"
        >
          {(() => {
            const selectedOdcCategory = categories.find(
              (category) => category.id === categoryPopup.categoryId,
            );
            const orderedRules = [...(selectedOdcCategory?.menuRules ?? [])].sort(
              (a, b) =>
                (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
                (b.displayOrder ?? Number.MAX_SAFE_INTEGER),
            );
            const customMenu = categoryPopup.selectedMenus.find(
              (menu) => menu.menuId === CUSTOM_MENU_ID,
            );
            const selectedItemsByRuleKey = new Map<string, string[]>();
            const selectedItemKeys = new Set<string>();

            categoryPopup.selectedMenus.forEach((menu) => {
              menu.sections.forEach((section) => {
                const ruleKey = makeRuleKey(menu.menuId, section.sectionTitle);
                selectedItemsByRuleKey.set(ruleKey, section.items);
                section.items.forEach((item) => {
                  selectedItemKeys.add(`${ruleKey}\u0000${item}`);
                });
              });
            });

            const menuByRuleKey = new Map<string, OdcMenu | undefined>();
            const itemDescriptionByRuleKey = new Map<string, Map<string, string>>();
            const hotSellingItemsByRuleKey = new Map<string, Set<string>>();

            orderedRules.forEach((rule) => {
              const ruleKey = makeRuleKey(rule.menuId, rule.sectionTitle);
              const linkedMenu = resolveOdcMenuForRule(
                menus,
                rule.menuId,
                rule.menuTitle,
                rule.sectionTitle,
              );
              const normalizedSectionTitle = normalizeMenuText(rule.sectionTitle);
              const matchedSection = linkedMenu?.sections.find(
                (section) => normalizeMenuText(section.sectionTitle) === normalizedSectionTitle,
              );
              const descriptions = new Map<string, string>();
              const hotItems = new Set<string>();

              matchedSection?.subitemDescriptions?.forEach((entry) => {
                const description = entry.description?.trim();
                if (description) {
                  descriptions.set(normalizeMenuText(entry.name), description);
                }
              });

              rule.allowedItemDescriptions?.forEach((entry) => {
                const description = entry.description?.trim();
                if (description) {
                  descriptions.set(normalizeMenuText(entry.name), description);
                }
              });

              matchedSection?.hotSellingItems?.forEach((item) => {
                hotItems.add(normalizeMenuText(item));
              });

              menuByRuleKey.set(ruleKey, linkedMenu);
              itemDescriptionByRuleKey.set(ruleKey, descriptions);
              hotSellingItemsByRuleKey.set(ruleKey, hotItems);
            });

            return (
              <form
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleUpdateOdcCategory();
                }}
              >
                <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(145deg,#fffdf7,#ffffff)] p-3 shadow-sm sm:rounded-[24px] sm:p-4">
                  <button
                    type="button"
                    onClick={() => toggleOdcHeaderSection('summary')}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                        Booking Setup
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
                        {`${categoryPopup.order.customerSnapshot.firstName} ${categoryPopup.order.customerSnapshot.lastName}`.trim() || 'Customer'} ·{' '}
                        {selectedOdcCategory?.name || 'Category'} ·{' '}
                        {categoryPopup.customPricePerPlate
                          ? formatCurrency(Number(categoryPopup.customPricePerPlate) || 0)
                          : 'Default price'}
                      </p>
                    </div>
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition ${categoryPopup.headerExpanded.summary ? 'rotate-180' : ''}`}>
                      <IconChevronDown />
                    </span>
                  </button>

                  {categoryPopup.headerExpanded.summary ? (
                    <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_1.4fr] lg:items-start">
                      <div className="rounded-2xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleOdcHeaderSection('customer')}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Customer
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 sm:text-lg">
                              {`${categoryPopup.order.customerSnapshot.firstName} ${categoryPopup.order.customerSnapshot.lastName}`.trim() || 'Customer name'}
                            </p>
                          </div>
                          <span className={`shrink-0 text-slate-500 transition ${categoryPopup.headerExpanded.customer ? 'rotate-180' : ''}`}>
                            <IconChevronDown />
                          </span>
                        </button>
                        {categoryPopup.headerExpanded.customer ? (
                          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4 sm:py-3">
                            <p>{categoryPopup.order.customerSnapshot.phone || 'No mobile number'}</p>
                            <p className="mt-1">{formatDate(categoryPopup.order.eventDate)}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <div className="rounded-2xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleOdcHeaderSection('category')}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Category
                              </p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                                {selectedOdcCategory
                                  ? `${selectedOdcCategory.name} (${formatCurrency(selectedOdcCategory.pricePerPlate)})`
                                  : 'Select category'}
                              </p>
                            </div>
                            <span className={`shrink-0 text-slate-500 transition ${categoryPopup.headerExpanded.category ? 'rotate-180' : ''}`}>
                              <IconChevronDown />
                            </span>
                          </button>
                          {categoryPopup.headerExpanded.category ? (
                            <div className="border-t border-slate-100 p-3 sm:p-4">
                              <div className="hidden sm:block">
                                <Field label="Category" required>
                                  <select
                                    value={categoryPopup.categoryId}
                                    onChange={(event) =>
                                      updateCategoryPopup((current) => ({
                                        ...current,
                                        categoryId: event.target.value,
                                        selectedMenus: [],
                                        skippedRuleKeys: [],
                                        expandedRuleKeys: [],
                                        ruleSearches: {},
                                      }))
                                    }
                                    className={inputCls}
                                  >
                                    <option value="">Select category</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name} ({formatCurrency(category.pricePerPlate)})
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              </div>
                              <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:hidden">
                                {categories.map((category) => {
                                  const selected = categoryPopup.categoryId === category.id;
                                  return (
                                    <button
                                      key={category.id}
                                      type="button"
                                      onClick={() =>
                                        updateCategoryPopup((current) => ({
                                          ...current,
                                          categoryId: category.id,
                                          selectedMenus: [],
                                          skippedRuleKeys: [],
                                          expandedRuleKeys: [],
                                          ruleSearches: {},
                                          headerExpanded: {
                                            ...current.headerExpanded,
                                            category: false,
                                          },
                                        }))
                                      }
                                      className={`min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                                        selected
                                          ? 'border-amber-300 bg-amber-50 text-slate-900'
                                          : 'border-slate-200 bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <p className="truncate text-sm font-semibold">{category.name}</p>
                                      <p className="mt-0.5 text-xs text-slate-500">
                                        {formatCurrency(category.pricePerPlate)}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleOdcHeaderSection('price')}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Custom Price
                              </p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                                {categoryPopup.customPricePerPlate
                                  ? formatCurrency(Number(categoryPopup.customPricePerPlate) || 0)
                                  : 'Default'}
                              </p>
                            </div>
                            <span className={`shrink-0 text-slate-500 transition ${categoryPopup.headerExpanded.price ? 'rotate-180' : ''}`}>
                              <IconChevronDown />
                            </span>
                          </button>
                          {categoryPopup.headerExpanded.price ? (
                            <div className="border-t border-slate-100 p-3 sm:p-4">
                              <Field label="Custom Price">
                                <input
                                  type="number"
                                  min="0"
                                  inputMode="decimal"
                                  placeholder={
                                    selectedOdcCategory
                                      ? `Default ${formatCurrency(selectedOdcCategory.pricePerPlate)}`
                                      : 'Custom price'
                                  }
                                  value={categoryPopup.customPricePerPlate}
                                  onChange={(event) =>
                                    updateCategoryPopup((current) => ({
                                      ...current,
                                      customPricePerPlate: event.target.value,
                                    }))
                                  }
                                  className={inputCls}
                                />
                              </Field>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1">
                  <div className="h-full min-h-0 overflow-y-auto overscroll-contain pr-1 pb-3 [touch-action:pan-y]">
                    {orderedRules.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        Select a category with configured menu rules to choose menu items.
                      </div>
                    ) : (
                      orderedRules.map((rule) => {
                        const key = makeRuleKey(rule.menuId, rule.sectionTitle);
                        const skipped = categoryPopup.skippedRuleKeys.includes(key);
                        const expanded = categoryPopup.expandedRuleKeys.includes(key);
                        const selectedSectionItems = selectedItemsByRuleKey.get(key) ?? [];
                        const selectedCount = selectedSectionItems.length;
                        const linkedMenu = menuByRuleKey.get(key);
                        const showSingleLabel =
                          rule.menuTitle.trim().toLowerCase() ===
                          rule.sectionTitle.trim().toLowerCase();
                        const ruleDisplayOrder = resolveOdcRuleDisplayOrder(
                          menus,
                          rule.menuId,
                          rule.menuTitle,
                          rule.sectionTitle,
                        );
                        const resolvedRuleDisplayOrder = rule.displayOrder ?? ruleDisplayOrder;
                        const searchValue = categoryPopup.ruleSearches[key] ?? '';
                        const normalizedSearchValue = searchValue.trim().toLowerCase();
                        const filteredAllowedItems =
                          normalizedSearchValue.length >= 3
                            ? rule.allowedItems.filter((item) =>
                                item.toLowerCase().includes(normalizedSearchValue),
                              )
                            : rule.allowedItems;
                        const addonItems = selectedSectionItems.filter(
                          (item) => !rule.allowedItems.includes(item),
                        );

                        return (
                          <section
                            key={key}
                            className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mb-4"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                updateCategoryPopup((current) => ({
                                  ...current,
                                  expandedRuleKeys: current.expandedRuleKeys.includes(key)
                                    ? current.expandedRuleKeys.filter((item) => item !== key)
                                    : [...current.expandedRuleKeys, key],
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-slate-50 sm:p-5"
                            >
                              <div className="min-w-0">
                                {Number.isFinite(resolvedRuleDisplayOrder) &&
                                resolvedRuleDisplayOrder !== Number.MAX_SAFE_INTEGER ? (
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">
                                    Order #{resolvedRuleDisplayOrder}
                                  </p>
                                ) : null}
                                {!showSingleLabel ? (
                                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600 sm:text-xs sm:tracking-[0.24em]">
                                    {rule.menuTitle}
                                  </p>
                                ) : null}
                                <h3 className={`${showSingleLabel ? '' : 'mt-0.5 sm:mt-1 '}truncate text-base font-semibold text-slate-900 sm:text-xl`}>
                                  {rule.sectionTitle}
                                </h3>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap sm:justify-end sm:gap-2">
                                {skipped ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 sm:px-3 sm:text-xs">
                                    Skipped
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 sm:px-3 sm:text-xs">
                                    {selectedCount} selected / {rule.selectionLimit} allowed
                                  </span>
                                )}
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition ${expanded ? 'rotate-180' : ''}`}>
                                  <IconChevronDown />
                                </span>
                              </div>
                            </button>
                            {expanded ? (
                              <div className="border-t border-slate-100 p-3 sm:p-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                  <div className="min-w-[220px] flex-1 sm:max-w-[320px]">
                                    <input
                                      type="text"
                                      value={searchValue}
                                      onChange={(event) =>
                                        updateCategoryPopup((current) => ({
                                          ...current,
                                          ruleSearches: {
                                            ...current.ruleSearches,
                                            [key]: event.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Search subitem"
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-300 sm:px-4 sm:py-2.5"
                                    />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <button
                                      type="button"
                                      onClick={() => toggleOdcRuleSkipped(rule)}
                                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                        skipped
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                                      }`}
                                    >
                                      {skipped ? 'Restore item' : 'Skip for customer'}
                                    </button>
                                    {!skipped ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOdcAddonPopup({
                                            menuId: rule.menuId,
                                            menuTitle: rule.menuTitle,
                                            sectionTitle: rule.sectionTitle,
                                            value: '',
                                          })
                                        }
                                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                                      >
                                        + Add-on
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                                {skipped ? (
                                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                    This item is skipped for this customer, so it will not block saving.
                                  </div>
                                ) : (
                                  <div className="mt-4 grid gap-2 sm:gap-3">
                                    {normalizedSearchValue.length > 0 &&
                                    normalizedSearchValue.length < 3 ? (
                                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                        Enter {3 - normalizedSearchValue.length} more character
                                        {3 - normalizedSearchValue.length === 1 ? '' : 's'} to start searching in this menu.
                                      </div>
                                    ) : null}
                                    {normalizedSearchValue.length >= 3 ? (
                                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                                        Showing {filteredAllowedItems.length} of {rule.allowedItems.length} subitems.
                                      </div>
                                    ) : null}
                                    {addonItems.map((addonItem) => (
                                      <div
                                        key={`addon-${key}-${addonItem}`}
                                        className="flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 text-sm shadow-sm sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4"
                                      >
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500 bg-amber-500 text-white">
                                          ✓
                                        </span>
                                        <span className="flex-1 font-medium text-slate-900">
                                          {addonItem}
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                          Add-on
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeOdcAddonItem(rule.menuId, rule.sectionTitle, addonItem)
                                          }
                                          className="ml-1 text-slate-400 hover:text-red-500"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {filteredAllowedItems.map((item) => {
                                      const checked = selectedItemKeys.has(`${key}\u0000${item}`);
                                      const description =
                                        itemDescriptionByRuleKey.get(key)?.get(normalizeMenuText(item)) ?? '';
                                      const descriptionKey = `${rule.menuId}-${rule.sectionTitle}-${item}`;
                                      const showDescription =
                                        subitemDescriptionKey === descriptionKey;
                                      const isHotSelling =
                                        linkedMenu?.hotSelling ||
                                        hotSellingItemsByRuleKey.get(key)?.has(normalizeMenuText(item)) ||
                                        false;

                                      return (
                                        <button
                                          key={`${key}-${item}`}
                                          type="button"
                                          onClick={() => toggleOdcMenuItem(rule, item, !checked)}
                                          className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                                            checked
                                              ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white text-slate-900 shadow-sm'
                                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                          }`}
                                        >
                                          <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                                              checked
                                                ? 'border-amber-500 bg-amber-500 text-white'
                                                : 'border-slate-300 bg-white text-transparent'
                                            }`}
                                          >
                                            ✓
                                          </span>
                                          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 font-medium sm:gap-2">
                                            {isHotSelling ? (
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600 sm:h-6 sm:w-6 sm:text-sm">
                                                🔥
                                              </span>
                                            ) : null}
                                            <span className="min-w-0 break-words leading-snug">
                                              {item}
                                            </span>
                                            {isHotSelling ? (
                                              <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-600 sm:px-2 sm:text-[10px] sm:tracking-[0.14em]">
                                                Hot Selling
                                              </span>
                                            ) : null}
                                          </span>
                                          {description ? (
                                            <span
                                              ref={
                                                showDescription
                                                  ? subitemDescriptionPopoverRef
                                                  : undefined
                                              }
                                              className="relative shrink-0"
                                            >
                                              <span
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Show description for ${item}`}
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  event.stopPropagation();
                                                  setSubitemDescriptionKey((current) =>
                                                    current === descriptionKey
                                                      ? null
                                                      : descriptionKey,
                                                  );
                                                }}
                                                onKeyDown={(event) => {
                                                  if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setSubitemDescriptionKey((current) =>
                                                      current === descriptionKey
                                                        ? null
                                                        : descriptionKey,
                                                    );
                                                  }
                                                }}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                              >
                                                i
                                              </span>
                                              {showDescription ? (
                                                <span className="absolute right-0 top-9 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-xl">
                                                  {description}
                                                </span>
                                              ) : null}
                                            </span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                    </div>
                                    {normalizedSearchValue.length >= 3 &&
                                    filteredAllowedItems.length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                        No subitems match this search.
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </section>
                        );
                      })
                    )}

                    <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 sm:text-xs sm:tracking-[0.24em]">
                            Manual Entry
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-xl">
                            Custom Menu
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                            Add item and subitem manually. Example: item Pizza, subitem Italian Pizza.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setOdcCustomMenuPopup({
                              sectionTitle: '',
                              itemsText: '',
                            })
                          }
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          + Add custom menu
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {!customMenu || customMenu.sections.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            No custom menu added yet.
                          </div>
                        ) : (
                          customMenu.sections.map((section) => (
                            <div
                              key={`custom-${section.sectionTitle}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {section.sectionTitle}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {section.items.join(', ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeOdcCustomMenuSection(section.sectionTitle)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-4 sm:p-5">
                      <Field label="Menu Comment">
                        <textarea
                          rows={4}
                          value={categoryPopup.menuComment}
                          onChange={(event) =>
                            updateCategoryPopup((current) => ({
                              ...current,
                              menuComment: event.target.value,
                            }))
                          }
                          placeholder="Enter menu comment"
                          className={`${inputCls} min-h-[110px] resize-y`}
                        />
                      </Field>
                    </section>
                  </div>
                </div>

                <div className="safe-pad-bottom sticky bottom-0 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur sm:pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCategoryPopup(null)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      type="submit"
                      disabled={isActionSubmitting}
                      isLoading={isActionSubmitting}
                      className={primaryButtonCls}
                    >
                      Save category
                    </LoadingButton>
                  </div>
                </div>
              </form>
            );
          })()}
        </CommonModal>
      ) : null}

      {odcAddonPopup ? (
        <CommonModal
          title={`Add-on - ${odcAddonPopup.sectionTitle}`}
          onClose={() => setOdcAddonPopup(null)}
          widthClassName="max-w-md"
          zIndexClassName="z-[90]"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              addOdcAddonItem(
                odcAddonPopup.menuId,
                odcAddonPopup.menuTitle,
                odcAddonPopup.sectionTitle,
                odcAddonPopup.value,
              );
              setOdcAddonPopup(null);
            }}
          >
            <Field label="Add-on item" required>
              <input
                value={odcAddonPopup.value}
                onChange={(event) =>
                  setOdcAddonPopup((current) =>
                    current ? { ...current, value: event.target.value } : current,
                  )
                }
                placeholder="Enter add-on item"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOdcAddonPopup(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonCls}
              >
                Add add-on
              </button>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {odcCustomMenuPopup ? (
        <CommonModal
          title="Add custom menu"
          onClose={() => setOdcCustomMenuPopup(null)}
          widthClassName="max-w-md"
          zIndexClassName="z-[90]"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const items = parseCustomMenuItems(odcCustomMenuPopup.itemsText);
              if (!odcCustomMenuPopup.sectionTitle.trim() || items.length === 0) return;
              addOdcCustomMenuEntry(
                odcCustomMenuPopup.sectionTitle,
                odcCustomMenuPopup.itemsText,
              );
              setOdcCustomMenuPopup(null);
            }}
          >
            <Field label="Item" required>
              <input
                value={odcCustomMenuPopup.sectionTitle}
                onChange={(event) =>
                  setOdcCustomMenuPopup((current) =>
                    current ? { ...current, sectionTitle: event.target.value } : current,
                  )
                }
                placeholder="Example: Pizza"
                className={inputCls}
              />
            </Field>
            <Field label="Subitems" required>
              <textarea
                rows={4}
                value={odcCustomMenuPopup.itemsText}
                onChange={(event) =>
                  setOdcCustomMenuPopup((current) =>
                    current ? { ...current, itemsText: event.target.value } : current,
                  )
                }
                placeholder="Example: Italian Pizza, Margherita Pizza"
                className={`${inputCls} min-h-[120px] resize-y`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOdcCustomMenuPopup(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonCls}>
                Save custom menu
              </button>
            </div>
          </form>
        </CommonModal>
      ) : null}

      {cancelPopup ? (
        <CommonModal
          title={`Cancel ${cancelPopup.order.orderId}`}
          onClose={() => setCancelPopup(null)}
          widthClassName="max-w-md"
        >
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Confirm that you want to cancel this ODC booking. It will remain in the ODC collection with cancelled status.
          </p>
          <div className="mt-6 space-y-4">
            <Field label="Cancellation Reason" required>
              <textarea
                value={cancelPopup.reason}
                onChange={(event) =>
                  setCancelPopup((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                rows={4}
                required
                placeholder="Enter cancellation reason"
                className={`${inputCls} resize-none`}
              />
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelPopup(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 sm:w-auto"
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                disabled={isActionSubmitting || !cancelPopup.reason.trim()}
                isLoading={isActionSubmitting}
                onClick={() => void handleCancelOdcOrder()}
                className="w-full rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
              >
                Confirm Cancel
              </LoadingButton>
            </div>
          </div>
        </CommonModal>
      ) : null}
    </section>
  );
}
