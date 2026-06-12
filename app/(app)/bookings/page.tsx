'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import {
  addAdvancePayment,
  addOrderFollowUp,
  assignEventPlanner,
  cancelOrder,
  confirmInquiry,
  createOrder,
  deleteAdvancePayment,
  deleteOrder,
  fetchCalendarOrders,
  fetchCategories,
  fetchHotDates,
  fetchMenus,
  fetchOrderById,
  fetchOrders,
  fetchSettings,
  processAdvancePayout,
  saveOrderSignature,
  updateAdvancePayment,
  updateOrder,
} from '@/lib/auth/api';
import {
  AppSettings,
  CalendarOrder,
  CancelAdvanceOption,
  Category,
  Menu,
  Order,
  OrderStatus,
  PaymentMode,
  SignatureLocationPermissionStatus,
} from '@/lib/auth/types';
import { filterHiddenHallDetailChoices } from '@/lib/hall-detail-combinations';
import { LoadingButton } from '@/components/ui/loading-button';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';

type ViewMode = 'list' | 'calendar';

type SelectedMenuSection = {
  sectionTitle: string;
  items: string[];
};

type SelectedMenu = {
  menuId: string;
  title: string;
  sections: SelectedMenuSection[];
};

type CustomMenuPopupState = {
  sectionTitle: string;
  itemsText: string;
};

type AddonEntry = {
  id?: string;
  label: string;
  price: string;
};

type BookingFormState = {
  inquiryDate: string;
  customerName: string;
  mobileNumber: string;
  eventName: string;
  functionDate: string;
  startTime: string;
  endTime: string;
  totalPerson: string;
  jainSwaminarayanPerson: string;
  jainSwaminarayanDetails: string;
  seatingRequiredNumber: string;
  serviceSlot: string;
  hallDetails: string;
  referenceBy: string;
  addonEntries: AddonEntry[];
  additionalInformation: string;
  categoryId: string;
  inquiryCustomPrice: string;
  customPricePerPlate: string;
  selectedMenus: SelectedMenu[];
  menuComment: string;
};

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

type FollowUpPopupState = {
  orderId: string;
  orderName: string;
  note: string;
  date: string;
  nextFollowUpDate: string;
  closeInquiry: boolean;
};

type SignaturePopupState = {
  order: Order;
  confirmationAccepted: boolean;
  hasSignature: boolean;
  locationMessage: string;
};

type TransferPopupState = {
  orderId: string;
  orderName: string;
  status: OrderStatus;
  newDate: string;
  serviceSlot: string;
  startTime: string;
  endTime: string;
};

type PrintTagItem = {
  id: string;
  menuTitle: string;
  sectionTitle: string;
  itemName: string;
};

const initialFormState: BookingFormState = {
  inquiryDate: toDateInputValue(new Date()),
  customerName: '',
  mobileNumber: '',
  eventName: '',
  functionDate: '',
  startTime: '',
  endTime: '',
  totalPerson: '',
  jainSwaminarayanPerson: '',
  jainSwaminarayanDetails: '',
  seatingRequiredNumber: '',
  serviceSlot: '',
  hallDetails: '',
  referenceBy: '',
  addonEntries: [],
  additionalInformation: '',
  categoryId: '',
  inquiryCustomPrice: '',
  customPricePerPlate: '',
  selectedMenus: [],
  menuComment: '',
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const dateTimeInputCls = `${inputCls} text-slate-900 [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;

const ghostButtonCls =
  'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50';

const primaryButtonCls =
  'rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60';

const requiredInquiryFields: Array<{
  label: string;
  isMissing: (formState: BookingFormState, resolvedEventName: string, pax: number) => boolean;
}> = [
  {
    label: 'Customer Name',
    isMissing: (formState) => !formState.customerName.trim(),
  },
  {
    label: 'Mobile Number',
    isMissing: (formState) => !formState.mobileNumber.trim(),
  },
  {
    label: 'Service Slot',
    isMissing: (formState) => !formState.serviceSlot.trim(),
  },
  {
    label: 'Event Name',
    isMissing: (_formState, resolvedEventName) => !resolvedEventName.trim(),
  },
  {
    label: 'Function Date',
    isMissing: (formState) => !formState.functionDate,
  },
  {
    label: 'No Of Total Person',
    isMissing: (_formState, _resolvedEventName, pax) => pax < 1,
  },
];

function buildMissingInquiryFieldsMessage(
  formState: BookingFormState,
  resolvedEventName: string,
  pax: number,
) {
  const missingFields = requiredInquiryFields
    .filter((field) => field.isMissing(formState, resolvedEventName, pax))
    .map((field) => field.label);

  if (missingFields.length === 0) return '';

  return `Please fill the required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}.`;
}

function normalizeMenuText(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? '';
}

function isHotSellingMenuItem(
  menu: Menu | undefined,
  sectionTitle: string,
  item: string,
) {
  const normalizedSectionTitle = normalizeMenuText(sectionTitle);
  const normalizedItem = normalizeMenuText(item);

  const matchedSection = menu?.sections.find(
    (section) => normalizeMenuText(section.sectionTitle) === normalizedSectionTitle,
  );

  return (
    matchedSection?.hotSellingItems?.some(
      (hotItem) => normalizeMenuText(hotItem) === normalizedItem,
    ) ||
    menu?.hotSelling ||
    false
  );
}

function getMenuSubitemDescription(
  menu: Menu | undefined,
  sectionTitle: string,
  item: string,
) {
  const normalizedSectionTitle = normalizeMenuText(sectionTitle);
  const normalizedItem = normalizeMenuText(item);

  const matchedSection = menu?.sections.find(
    (section) => normalizeMenuText(section.sectionTitle) === normalizedSectionTitle,
  );

  return (
    matchedSection?.subitemDescriptions
      ?.find((entry) => normalizeMenuText(entry.name) === normalizedItem)
      ?.description?.trim() ?? ''
  );
}

function resolveMenuForRule(
  menus: Menu[],
  menuId: string,
  menuTitle: string,
  sectionTitle: string,
) {
  const byId = menus.find((menu) => menu.id === menuId);
  if (byId) {
    return byId;
  }

  const normalizedMenuTitle = normalizeMenuText(menuTitle);
  const normalizedSectionTitle = normalizeMenuText(sectionTitle);

  return menus.find((menu) => {
    if (normalizeMenuText(menu.title) !== normalizedMenuTitle) {
      return false;
    }

    return menu.sections.some(
      (section) =>
        normalizeMenuText(section.sectionTitle) === normalizedSectionTitle,
    );
  });
}

function resolveRuleDisplayOrder(
  menus: Menu[],
  menuId: string,
  menuTitle: string,
  sectionTitle: string,
) {
  return (
    resolveMenuForRule(menus, menuId, menuTitle, sectionTitle)?.displayOrder ??
    Number.MAX_SAFE_INTEGER
  );
}

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = ['00', '15', '30', '45'];
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
const ADDON_OTHER_VALUE = '__other__';
const CUSTOM_MENU_ID = 'custom:manual';
const SIGNATURE_CONFIRMATION_TEXT = 'I confirm the above booking details are correct.';

type MenuSelectionTrackingState = {
  orderId: string;
  startedAt: string;
  trigger: 'initial' | 'change';
};

export default function BookingsPage() {
  const { accessToken, user } = useAuth();
  const searchParams = useSearchParams();
  useAppPageHeader({
    eyebrow: 'Bookings',
    title: 'Bookings',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [orders, setOrders] = useState<Order[]>([]);
  const [calendarOrders, setCalendarOrders] = useState<CalendarOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const todayKey = toDateInputValue(new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return new Date();
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() =>
    formatDateKey(new Date()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [isCalendarActionsOpen, setIsCalendarActionsOpen] = useState(false);
  const [isCalendarSearchOpen, setIsCalendarSearchOpen] = useState(false);
  const [calendarSearchInput, setCalendarSearchInput] = useState('');
  const [calendarSearchResults, setCalendarSearchResults] = useState<Order[]>([]);
  const [isCalendarSearchLoading, setIsCalendarSearchLoading] = useState(false);
  const [calendarSearchError, setCalendarSearchError] = useState('');
  const [hotDateKeys, setHotDateKeys] = useState<Set<string>>(new Set());
  const loadedHotDateYear = useRef<number | null>(null);
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formState, setFormState] = useState<BookingFormState>(initialFormState);
  const [customEventName, setCustomEventName] = useState('');
  const [selectedAddonOption, setSelectedAddonOption] = useState('');
  const [customAddonLabel, setCustomAddonLabel] = useState('');
  const [customAddonPrice, setCustomAddonPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancePopup, setAdvancePopup] = useState<{
    mode: 'new' | 'convert';
    order: Order | null;
  } | null>(null);
  const pendingCreatePayload = useRef<Parameters<typeof createOrder>[1] | null>(null);
  const [confirmBookingPopup, setConfirmBookingPopup] = useState(false);
  const [confirmBookingAdvance, setConfirmBookingAdvance] = useState('0');
  const [confirmBookingPaymentMode, setConfirmBookingPaymentMode] = useState<PaymentMode>('Cash');
  const [isConfirmBookingSubmitting, setIsConfirmBookingSubmitting] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [confirmDiscount, setConfirmDiscount] = useState('0');
  const [confirmExtrasTotal, setConfirmExtrasTotal] = useState('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [advanceDate, setAdvanceDate] = useState(() => toDateInputValue(new Date()));
  const [advanceRemark, setAdvanceRemark] = useState('');
  const [isAdvanceSubmitting, setIsAdvanceSubmitting] = useState(false);
  const [cancelPopup, setCancelPopup] = useState<{
    order: Order;
    reason: string;
    advanceOption: CancelAdvanceOption | null;
    expiryMonths: number | null;
    expiryCustomDate: string;
    paybackMode: 'CASH' | 'ONLINE' | null;
  } | null>(null);
  const [cancelledOrderId, setCancelledOrderId] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [deletePopup, setDeletePopup] = useState<Order | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [isMobileDetailActionsOpen, setIsMobileDetailActionsOpen] = useState(false);
  const [selectedEventPlanner, setSelectedEventPlanner] = useState('');
  const [isAssigningEventPlanner, setIsAssigningEventPlanner] = useState(false);
  const [dayRecordsPopup, setDayRecordsPopup] = useState<{
    dateKey: string;
    orders: CalendarOrder[];
  } | null>(null);
  const [followUpPopup, setFollowUpPopup] = useState<FollowUpPopupState | null>(null);
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false);
  const [signaturePopup, setSignaturePopup] = useState<SignaturePopupState | null>(null);
  const [isSignatureSubmitting, setIsSignatureSubmitting] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);
  const [transferPopup, setTransferPopup] = useState<TransferPopupState | null>(null);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [printTagPopup, setPrintTagPopup] = useState<{
    order: Order;
    items: PrintTagItem[];
    selectedIds: string[];
  } | null>(null);
  const [paymentPopup, setPaymentPopup] = useState<{ orderId: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPopupMode, setPaymentPopupMode] = useState<PaymentMode>('Cash');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [paymentEditor, setPaymentEditor] = useState<{
    orderId: string;
    paymentId?: string;
  } | null>(null);
  const [skippedRuleKeys, setSkippedRuleKeys] = useState<string[]>([]);
  const [ruleSearches, setRuleSearches] = useState<Record<string, string>>({});
  const [expandedRuleKeys, setExpandedRuleKeys] = useState<string[]>([]);
  const [subitemDescriptionKey, setSubitemDescriptionKey] = useState<string | null>(null);
  const subitemDescriptionPopoverRef = useRef<HTMLSpanElement | null>(null);
  const [wizardHeaderExpanded, setWizardHeaderExpanded] = useState({
    summary: true,
    customer: false,
    category: true,
    price: false,
  });
  const [addonPopup, setAddonPopup] = useState<{
    menuId: string;
    menuTitle: string;
    sectionTitle: string;
    value: string;
  } | null>(null);
  const [customMenuPopup, setCustomMenuPopup] = useState<CustomMenuPopupState | null>(null);
  const menuSelectionTrackingRef = useRef<MenuSelectionTrackingState | null>(null);
  const deepLinkedOrderIdRef = useRef<string | null>(null);
  const calendarSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!subitemDescriptionKey) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        subitemDescriptionPopoverRef.current?.contains(target)
      ) {
        return;
      }

      setSubitemDescriptionKey(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [subitemDescriptionKey]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setPageError('');
        const monthRange = getMonthRange(calendarMonth);
        const [ordersResponse, categoriesResponse, settingsResponse] = await Promise.all([
          fetchOrders(token, {
            page: 1,
            limit: 1000,
            search: '',
            status: '',
            from: monthRange.from,
            to: monthRange.to,
          }),
          fetchCategories(token, { page: 1, limit: 100, search: '' }),
          fetchSettings(token),
        ]);

        setOrders(ordersResponse.items);
        setTotalItems(ordersResponse.pagination.total);
        setCategories(categoriesResponse.items);
        setSettings(settingsResponse);
        void fetchMenus(token, { page: 1, limit: 200, search: '' })
          .then((menusResponse) => {
            setMenus(menusResponse.items);
          })
          .catch(() => {
            setMenus([]);
          });
      } catch (requestError) {
        setPageError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch booking data.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [
    accessToken,
    calendarMonth,
  ]);

  const openOrderDetail = useCallback(
    async (orderId: string, initialOrder?: Order) => {
      if (!accessToken) {
        return;
      }

      setIsDetailOpen(true);
      setDetailOrder(initialOrder ?? null);
      setIsDetailLoading(true);
      setDetailError('');
      setIsMobileDetailActionsOpen(false);

      try {
        const order = await fetchOrderById(accessToken, orderId);
        setDetailOrder(order);
      } catch (requestError) {
        setDetailError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch booking details.',
        );
      } finally {
        setIsDetailLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    setSelectedEventPlanner(detailOrder?.currentEventPlanner?.plannerName ?? '');
  }, [detailOrder?.currentEventPlanner?.plannerName]);

  useEffect(() => {
    const orderId = searchParams.get('open');

    if (!accessToken || !orderId || deepLinkedOrderIdRef.current === orderId) {
      return;
    }

    deepLinkedOrderIdRef.current = orderId;
    void openOrderDetail(orderId);
  }, [accessToken, openOrderDetail, searchParams]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    const monthRange = getMonthRange(calendarMonth);

    async function loadCalendar() {
      try {
        setIsCalendarLoading(true);
        const response = await fetchCalendarOrders(token, monthRange);
        setCalendarOrders(response);
      } catch (requestError) {
        setToast({
          type: 'error',
          message:
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load calendar view.',
        });
      } finally {
        setIsCalendarLoading(false);
      }
    }

    void loadCalendar();
  }, [accessToken, calendarMonth]);

  useEffect(() => {
    if (!accessToken) return;
    const year = calendarMonth.getFullYear();
    if (loadedHotDateYear.current === year) return;
    loadedHotDateYear.current = year;
    const token = accessToken;
    fetchHotDates(token, year)
      .then((dates) => {
        setHotDateKeys(new Set(dates.map((d) => d.date)));
      })
      .catch(() => {
        // non-critical — silently ignore
      });
  }, [accessToken, calendarMonth]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === formState.categoryId) ?? null,
    [categories, formState.categoryId],
  );
  const paymentOptions =
    settings?.paymentOptions.map((option) => option.label) ?? fallbackPaymentOptions;
  const eventOptions =
    settings?.eventOptions.map((option) => option.label) ?? fallbackEventOptions;
  const defaultPaymentMode = paymentOptions[0] ?? 'Cash';
  const paymentModeChoices = withCurrentOption(paymentOptions, paymentMode);
  const canUseAdvancedCancelManagement = user?.canUseAdvancedCancelManagement ?? false;
  const popupPaymentModeChoices = withCurrentOption(paymentOptions, paymentPopupMode);
  const eventChoices = [...eventOptions, 'Other'];
  const isCustomEventSelected = formState.eventName === EVENT_OTHER_VALUE;
  const hallDetailOptions = useMemo(
    () => settings?.hallDetails.map((option) => option.label) ?? [],
    [settings?.hallDetails],
  );
  const generatedHallDetailChoices = useMemo(
    () =>
      filterHiddenHallDetailChoices(
        hallDetailOptions,
        settings?.hiddenHallDetailCombinations ?? [],
      ),
    [hallDetailOptions, settings?.hiddenHallDetailCombinations],
  );
  const hallDetailChoices =
    formState.hallDetails && !generatedHallDetailChoices.includes(formState.hallDetails)
      ? [formState.hallDetails, ...generatedHallDetailChoices]
      : generatedHallDetailChoices;
  const showHallBookingInformation = settings?.showHallBookingInformation ?? false;
  const addonOptions = settings?.addonServices ?? [];
  const availableAddonOptions = addonOptions.filter(
    (option) => !formState.addonEntries.some((entry) => entry.id === option.id),
  );

  const categoryRules = useMemo(
    () => selectedCategory?.menuRules ?? [],
    [selectedCategory],
  );
  const menuLookup = useMemo(
    () => new Map(menus.map((menu) => [menu.id, menu])),
    [menus],
  );
  const subitemDescriptionLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    menus.forEach((menu) => {
      menu.sections.forEach((section) => {
        section.subitemDescriptions?.forEach((entry) => {
          const description = entry.description.trim();
          if (!description) return;

          [
            `${menu.id}|${normalizeMenuText(section.sectionTitle)}|${normalizeMenuText(entry.name)}`,
            `${normalizeMenuText(menu.title)}|${normalizeMenuText(section.sectionTitle)}|${normalizeMenuText(entry.name)}`,
          ].forEach((key) => lookup.set(key, description));
        });
      });
    });

    return lookup;
  }, [menus]);
  const orderedCategoryRules = useMemo(
    () =>
      [...categoryRules].sort((left, right) => {
        const leftOrder =
          left.displayOrder ??
          resolveRuleDisplayOrder(menus, left.menuId, left.menuTitle, left.sectionTitle);
        const rightOrder =
          right.displayOrder ??
          resolveRuleDisplayOrder(menus, right.menuId, right.menuTitle, right.sectionTitle);
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        const leftMenuTitle = left.menuTitle.trim().toLowerCase();
        const rightMenuTitle = right.menuTitle.trim().toLowerCase();
        if (leftMenuTitle !== rightMenuTitle) {
          return leftMenuTitle.localeCompare(rightMenuTitle);
        }

        return left.sectionTitle.trim().toLowerCase().localeCompare(
          right.sectionTitle.trim().toLowerCase(),
        );
      }),
    [categoryRules, menus],
  );
  const customMenu = useMemo(
    () => formState.selectedMenus.find((menu) => menu.menuId === CUSTOM_MENU_ID) ?? null,
    [formState.selectedMenus],
  );

  const pax = Number(formState.totalPerson) || 0;
  const pricePerPlate = selectedCategory?.pricePerPlate ?? 0;
  const baseTotal = pax * pricePerPlate;
  const addonPrice = formState.addonEntries.reduce(
    (sum, entry) => sum + (Number(entry.price) || 0),
    0,
  );
  const grandTotal = baseTotal + addonPrice;
  const calendarSearchQuery = calendarSearchInput.trim().toLowerCase();
  const isCalendarSearchActive = calendarSearchQuery.length > 0;
  const filteredCalendarOrders = calendarOrders;
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const ordersByDate = useMemo(() => {
    const grouped = new Map<string, CalendarOrder[]>();

    for (const order of filteredCalendarOrders) {
      const key = formatDateKey(order.eventDate);
      const current = grouped.get(key) ?? [];
      current.push(order);
      grouped.set(key, current);
    }

    return grouped;
  }, [filteredCalendarOrders]);
  const selectedCalendarOrders = ordersByDate.get(selectedCalendarDay) ?? [];
  const selectedMenuItemsCount = formState.selectedMenus.reduce(
    (count, menu) =>
      count +
      menu.sections.reduce((sectionCount, section) => sectionCount + section.items.length, 0),
    0,
  );
  const bookingCreatedBy =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Current user';
  const isCompanyAdmin = user?.role === 'company_admin';
  const isProtectedBookingEditLocked = !isCompanyAdmin && Boolean(editingOrder);
  const hasSavedMenuSelection = (editingOrder?.menuSelectionSnapshot.length ?? 0) > 0;
  const isMenuSelectionDependentEditLocked =
    !isCompanyAdmin && Boolean(editingOrder) && hasSavedMenuSelection;
  const companyAdminOnlyEditMessage = 'Contact company admin to update this detail.';
  const menuSelectionLockedEditMessage =
    'Contact company admin to update this detail after menu selection.';
  const isServiceSlotLocked = isProtectedBookingEditLocked;

  useEffect(() => {
    if (!paymentOptions.includes(paymentMode)) {
      setPaymentMode(defaultPaymentMode);
    }
  }, [defaultPaymentMode, paymentMode, paymentOptions]);

  useEffect(() => {
    if (!paymentOptions.includes(paymentPopupMode)) {
      setPaymentPopupMode(defaultPaymentMode);
    }
  }, [defaultPaymentMode, paymentOptions, paymentPopupMode]);

  useEffect(() => {
    if (!isCalendarSearchOpen) {
      return;
    }

    calendarSearchInputRef.current?.focus();
  }, [isCalendarSearchOpen]);

  useEffect(() => {
    if (!accessToken || !calendarSearchQuery) {
      setCalendarSearchResults([]);
      setCalendarSearchError('');
      setIsCalendarSearchLoading(false);
      return;
    }

    let isActive = true;
    const token = accessToken;
    const timeoutId = window.setTimeout(() => {
      setIsCalendarSearchLoading(true);
      setCalendarSearchError('');

      void fetchOrders(token, {
        page: 1,
        limit: 1000,
        search: calendarSearchQuery,
        status: '',
      })
        .then((response) => {
          if (!isActive) {
            return;
          }

          const matchingOrders = response.items.filter((order) => {
            const customerName = `${order.customer.firstName} ${order.customer.lastName}`
              .trim()
              .toLowerCase();

            return customerName.includes(calendarSearchQuery);
          }).sort((left, right) => {
            const leftDate = left.eventDate ? new Date(left.eventDate).getTime() : Number.MAX_SAFE_INTEGER;
            const rightDate = right.eventDate ? new Date(right.eventDate).getTime() : Number.MAX_SAFE_INTEGER;

            return leftDate - rightDate;
          });

          setCalendarSearchResults(matchingOrders);
        })
        .catch((requestError) => {
          if (!isActive) {
            return;
          }

          setCalendarSearchResults([]);
          setCalendarSearchError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to search bookings.',
          );
        })
        .finally(() => {
          if (isActive) {
            setIsCalendarSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, calendarSearchQuery]);

  useEffect(() => {
    setSelectedCalendarDay(formatDateKey(calendarMonth));
  }, [calendarMonth]);

  async function reloadOrders(token: string) {
    const monthRange = getMonthRange(calendarMonth);
    const response = await fetchOrders(token, {
      page: 1,
      limit: 1000,
      search: '',
      status: '',
      from: monthRange.from,
      to: monthRange.to,
    });
    setOrders(response.items);
    setTotalItems(response.pagination.total);
  }

  async function reloadCalendar(token: string) {
    const response = await fetchCalendarOrders(token, getMonthRange(calendarMonth));
    setCalendarOrders(response);
  }

  async function loadCategories(token: string) {
    const response = await fetchCategories(token, { page: 1, limit: 100, search: '' });
    setCategories(response.items);
    return response.items;
  }

  async function refreshBookingViews(token: string) {
    await Promise.all([reloadOrders(token), reloadCalendar(token)]);
  }

  function resetWizard() {
    menuSelectionTrackingRef.current = null;
    setEditingOrder(null);
    setSkippedRuleKeys([]);
    setRuleSearches({});
    setExpandedRuleKeys([]);
    setWizardHeaderExpanded({ summary: true, customer: false, category: true, price: false });
    setAddonPopup(null);
    setCustomMenuPopup(null);
    setFormState(initialFormState);
    setCustomEventName('');
    setIsWizardOpen(false);
  }

  function openCreateInquiry(prefill?: { functionDate?: string }) {
    setPageError('');
    setToast(null);
    setEditingOrder(null);
    setFormState({
      ...initialFormState,
      inquiryDate: toDateInputValue(new Date()),
      functionDate: prefill?.functionDate ?? '',
    });
    setCustomEventName('');
    setIsInquiryOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  function openEditInquiry(order: Order) {
    setEditingOrder(order);
    const resolvedEventName = resolveEventFormValue(eventOptions, order.functionName ?? '');
    setFormState({
      inquiryDate: order.inquiryDate ? formatDateKey(order.inquiryDate) : toDateInputValue(new Date()),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      mobileNumber: order.customer.phone,
      eventName: resolvedEventName.formValue,
      functionDate: order.eventDate ? formatDateKey(order.eventDate) : '',
      startTime: order.startTime ?? '',
      endTime: order.endTime ?? '',
      totalPerson: order.pax ? String(order.pax) : '',
      jainSwaminarayanPerson: order.jainSwaminarayanPax ? String(order.jainSwaminarayanPax) : '',
      jainSwaminarayanDetails: order.jainSwaminarayanDetails ?? '',
      seatingRequiredNumber: order.seatingRequired ? String(order.seatingRequired) : '',
      serviceSlot: order.serviceSlot ?? '',
      hallDetails: order.hallDetails ?? '',
      referenceBy: order.referenceBy ?? '',
      addonEntries: order.addonServiceSnapshots.map((snap) => ({
        id: snap.addonServiceId !== 'custom' ? snap.addonServiceId : undefined,
        label: snap.label,
        price: String(snap.price),
      })),
      additionalInformation: order.additionalInformation ?? order.notes ?? '',
      categoryId: order.categorySnapshot?.categoryId ?? '',
      inquiryCustomPrice:
        order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
          ? String(order.inquiryCustomPrice)
          : '',
      customPricePerPlate:
        order.customPricePerPlate !== null && order.customPricePerPlate !== undefined
          ? String(order.customPricePerPlate)
          : order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
            ? String(order.inquiryCustomPrice)
          : '',
      selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        sections: menu.sections.map((section) => ({
          sectionTitle: section.sectionTitle,
          items: [...section.items],
        })),
      })),
      menuComment: order.menuComment ?? '',
    });
    setCustomEventName(resolvedEventName.customValue);
    setIsInquiryOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  function openCategoryChooser(order: Order) {
    menuSelectionTrackingRef.current = {
      orderId: order.id,
      startedAt: new Date().toISOString(),
      trigger: order.categorySnapshot ? 'change' : 'initial',
    };
    setEditingOrder(order);
    const resolvedEventName = resolveEventFormValue(eventOptions, order.functionName ?? '');
    setFormState({
      inquiryDate: order.inquiryDate ? formatDateKey(order.inquiryDate) : toDateInputValue(new Date()),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      mobileNumber: order.customer.phone,
      eventName: resolvedEventName.formValue,
      functionDate: order.eventDate ? formatDateKey(order.eventDate) : '',
      startTime: order.startTime ?? '',
      endTime: order.endTime ?? '',
      totalPerson: order.pax ? String(order.pax) : '',
      jainSwaminarayanPerson: order.jainSwaminarayanPax ? String(order.jainSwaminarayanPax) : '',
      jainSwaminarayanDetails: order.jainSwaminarayanDetails ?? '',
      seatingRequiredNumber: order.seatingRequired ? String(order.seatingRequired) : '',
      serviceSlot: order.serviceSlot ?? '',
      hallDetails: order.hallDetails ?? '',
      referenceBy: order.referenceBy ?? '',
      addonEntries: order.addonServiceSnapshots.map((snap) => ({
        id: snap.addonServiceId !== 'custom' ? snap.addonServiceId : undefined,
        label: snap.label,
        price: String(snap.price),
      })),
      additionalInformation: order.additionalInformation ?? order.notes ?? '',
      categoryId: order.categorySnapshot?.categoryId ?? '',
      inquiryCustomPrice:
        order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
          ? String(order.inquiryCustomPrice)
          : '',
      customPricePerPlate:
        order.customPricePerPlate !== null && order.customPricePerPlate !== undefined
          ? String(order.customPricePerPlate)
          : order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
            ? String(order.inquiryCustomPrice)
          : '',
      selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        sections: menu.sections.map((section) => ({
          sectionTitle: section.sectionTitle,
          items: [...section.items],
        })),
      })),
      menuComment: order.menuComment ?? '',
    });
    setCustomEventName(resolvedEventName.customValue);
    setSkippedRuleKeys([]);
    setRuleSearches({});
    setWizardHeaderExpanded({
      summary: !order.categorySnapshot,
      customer: false,
      category: !order.categorySnapshot,
      price:
        order.customPricePerPlate !== null ||
        order.inquiryCustomPrice !== null,
    });
    setAddonPopup(null);
    setCustomMenuPopup(null);
    setIsWizardOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  async function handleAssignEventPlanner() {
    if (!accessToken || !detailOrder) {
      return;
    }

    const plannerName = selectedEventPlanner.trim();
    if (!plannerName) {
      setToast({ type: 'error', message: 'Select an event planner first.' });
      return;
    }

    try {
      setIsAssigningEventPlanner(true);
      const updatedOrder = await assignEventPlanner(accessToken, detailOrder.id, plannerName);
      setDetailOrder(updatedOrder);
      setSelectedEventPlanner(updatedOrder.currentEventPlanner?.plannerName ?? plannerName);
      setOrders((current) =>
        current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
      );
      setToast({ type: 'success', message: 'Event planner assigned successfully.' });
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to assign event planner.',
      });
    } finally {
      setIsAssigningEventPlanner(false);
    }
  }

  function toggleMenuItem(
    rule: Category['menuRules'][number],
    sectionTitle: string,
    item: string,
    checked: boolean,
  ) {
    setFormState((current) => {
      const existingMenu = current.selectedMenus.find(
        (selectedMenu) => selectedMenu.menuId === rule.menuId,
      );

      let nextMenus = current.selectedMenus;

      if (!existingMenu && checked) {
        nextMenus = [
          ...current.selectedMenus,
          {
            menuId: rule.menuId,
            title: rule.menuTitle,
            sections: [],
          },
        ];
      }

      nextMenus = nextMenus
        .map((selectedMenu) => {
          if (selectedMenu.menuId !== rule.menuId) {
            return selectedMenu;
          }

          const existingSection = selectedMenu.sections.find(
            (section) => section.sectionTitle === sectionTitle,
          );

          let sections = selectedMenu.sections;

          if (!existingSection && checked) {
            sections = [...sections, { sectionTitle, items: [item] }];
          } else {
            sections = sections
              .map((section) => {
                if (section.sectionTitle !== sectionTitle) {
                  return section;
                }

                const items = checked
                  ? Array.from(new Set([...section.items, item]))
                  : section.items.filter((currentItem) => currentItem !== item);

                return {
                  ...section,
                  items,
                };
              })
              .filter((section) => section.items.length > 0);
          }

          return {
            ...selectedMenu,
            sections,
          };
        })
        .filter((selectedMenu) => selectedMenu.sections.length > 0);

      return {
        ...current,
        selectedMenus: nextMenus,
      };
    });
  }

  function isItemSelected(menuId: string, sectionTitle: string, item: string) {
    return formState.selectedMenus.some(
      (selectedMenu) =>
        selectedMenu.menuId === menuId &&
        selectedMenu.sections.some(
          (section) =>
            section.sectionTitle === sectionTitle && section.items.includes(item),
        ),
    );
  }

  function addAddonItem(menuId: string, menuTitle: string, sectionTitle: string, item: string) {
    const trimmed = item.trim();
    if (!trimmed) return;

    setFormState((current) => {
      const existingMenu = current.selectedMenus.find((m) => m.menuId === menuId);
      let nextMenus = current.selectedMenus;

      if (!existingMenu) {
        nextMenus = [
          ...current.selectedMenus,
          { menuId, title: menuTitle, sections: [{ sectionTitle, items: [trimmed] }] },
        ];
      } else {
        nextMenus = nextMenus.map((m) => {
          if (m.menuId !== menuId) return m;
          const existingSection = m.sections.find((s) => s.sectionTitle === sectionTitle);
          if (!existingSection) {
            return { ...m, sections: [...m.sections, { sectionTitle, items: [trimmed] }] };
          }
          if (existingSection.items.includes(trimmed)) return m;
          return {
            ...m,
            sections: m.sections.map((s) =>
              s.sectionTitle === sectionTitle
                ? { ...s, items: [...s.items, trimmed] }
                : s,
            ),
          };
        });
      }

      return { ...current, selectedMenus: nextMenus };
    });
  }

  function removeAddonItem(menuId: string, sectionTitle: string, item: string) {
    setFormState((current) => ({
      ...current,
      selectedMenus: current.selectedMenus
        .map((m) => {
          if (m.menuId !== menuId) return m;
          return {
            ...m,
            sections: m.sections
              .map((s) =>
                s.sectionTitle === sectionTitle
                  ? { ...s, items: s.items.filter((i) => i !== item) }
                  : s,
              )
              .filter((s) => s.items.length > 0),
          };
        })
        .filter((m) => m.sections.length > 0),
    }));
  }

  function selectedCountForRule(rule: Category['menuRules'][number]) {
    return (
      formState.selectedMenus
        .find((selectedMenu) => selectedMenu.menuId === rule.menuId)
        ?.sections.find((section) => section.sectionTitle === rule.sectionTitle)?.items.length ?? 0
    );
  }

  function makeRuleKey(menuId: string, sectionTitle: string) {
    return `${menuId}:${sectionTitle}`;
  }

  function isRuleSkipped(menuId: string, sectionTitle: string) {
    return skippedRuleKeys.includes(makeRuleKey(menuId, sectionTitle));
  }

  function isRuleExpanded(menuId: string, sectionTitle: string) {
    return expandedRuleKeys.includes(makeRuleKey(menuId, sectionTitle));
  }

  function toggleRuleExpanded(menuId: string, sectionTitle: string) {
    const key = makeRuleKey(menuId, sectionTitle);
    setExpandedRuleKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function toggleWizardHeaderSection(section: keyof typeof wizardHeaderExpanded) {
    setWizardHeaderExpanded((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function removeSectionFromSelectedMenus(menuId: string, sectionTitle: string) {
    setFormState((current) => ({
      ...current,
      selectedMenus: current.selectedMenus
        .map((menu) => {
          if (menu.menuId !== menuId) {
            return menu;
          }

          return {
            ...menu,
            sections: menu.sections.filter((section) => section.sectionTitle !== sectionTitle),
          };
        })
        .filter((menu) => menu.sections.length > 0),
    }));
  }

  function toggleRuleSkipped(rule: Category['menuRules'][number]) {
    const key = makeRuleKey(rule.menuId, rule.sectionTitle);
    const currentlySkipped = skippedRuleKeys.includes(key);

    if (currentlySkipped) {
      setSkippedRuleKeys((current) => current.filter((item) => item !== key));
      return;
    }

    removeSectionFromSelectedMenus(rule.menuId, rule.sectionTitle);
    setSkippedRuleKeys((current) => [...current, key]);
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

  function addCustomMenuEntry(sectionTitle: string, items: string[]) {
    const normalizedSectionTitle = sectionTitle.trim();
    const normalizedItems = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

    if (!normalizedSectionTitle || !normalizedItems.length) {
      return;
    }

    setFormState((current) => {
      const existingCustomMenu = current.selectedMenus.find((menu) => menu.menuId === CUSTOM_MENU_ID);

      if (!existingCustomMenu) {
        return {
          ...current,
          selectedMenus: [
            ...current.selectedMenus,
            {
              menuId: CUSTOM_MENU_ID,
              title: 'Custom Menu',
              sections: [{ sectionTitle: normalizedSectionTitle, items: normalizedItems }],
            },
          ],
        };
      }

      const hasMatchingSection = existingCustomMenu.sections.some(
        (section) => section.sectionTitle === normalizedSectionTitle,
      );

      return {
        ...current,
        selectedMenus: current.selectedMenus.map((menu) => {
          if (menu.menuId !== CUSTOM_MENU_ID) {
            return menu;
          }

          if (!hasMatchingSection) {
            return {
              ...menu,
              sections: [
                ...menu.sections,
                { sectionTitle: normalizedSectionTitle, items: normalizedItems },
              ],
            };
          }

          return {
            ...menu,
            sections: menu.sections.map((section) =>
              section.sectionTitle === normalizedSectionTitle
                ? {
                    ...section,
                    items: Array.from(new Set([...section.items, ...normalizedItems])),
                  }
                : section,
            ),
          };
        }),
      };
    });
  }

  function removeCustomMenuSection(sectionTitle: string) {
    removeSectionFromSelectedMenus(CUSTOM_MENU_ID, sectionTitle);
  }

  function openAdvancePopup(mode: 'new' | 'convert', order: Order | null = null) {
    setAdvanceAmount(order?.advanceAmount ? String(order.advanceAmount) : '');
    setConfirmDiscount(order ? String(order.discountAmount || 0) : '0');
    setConfirmExtrasTotal(order ? String(order.extrasTotal || 0) : '0');
    setPaymentMode(order?.paymentMode ?? defaultPaymentMode);
    setAdvanceDate(toDateInputValue(new Date()));
    setAdvanceRemark('');
    setAdvancePopup({ mode, order });
  }

  function handleOpenConvertInquiry(order: Order) {
    setIsDetailOpen(false);
    setDetailOrder(null);
    setDetailError('');
    openAdvancePopup('convert', order);
  }

  async function handleCreateInquiry(status: 'INQUIRY' | 'CONFIRMED' = 'INQUIRY') {
    if (!accessToken) {
      setToast({ type: 'error', message: 'Missing session token.' });
      return;
    }

    const normalizedPhone = formState.mobileNumber.trim();
    const customerName = formState.customerName.trim();
    const resolvedEventName = getResolvedEventName(formState.eventName, customEventName);
    const { firstName, lastName } = splitFullName(customerName);
    const missingFieldsMessage = buildMissingInquiryFieldsMessage(
      formState,
      resolvedEventName,
      pax,
    );

    if (missingFieldsMessage) {
      setToast({ type: 'error', message: missingFieldsMessage });
      return;
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setToast({ type: 'error', message: 'Contact number must be exactly 10 digits.' });
      return;
    }

    if (!formState.hallDetails.trim()) {
      setToast({ type: 'error', message: 'Hall details is required.' });
      return;
    }

    const missingAddonFields = formState.addonEntries.find(
      (entry) => !entry.label.trim() || !entry.price.trim(),
    );

    if (missingAddonFields) {
      setToast({
        type: 'error',
        message: 'Addon service name and price are required for every selected addon.',
      });
      return;
    }

    const invalidAddonPrice = formState.addonEntries.find((entry) => {
      const price = Number(entry.price);
      return !Number.isFinite(price) || price < 0;
    });

    if (invalidAddonPrice) {
      setToast({
        type: 'error',
        message: 'Enter a valid addon price for every selected addon.',
      });
      return;
    }

    if (!formState.startTime || !formState.endTime) {
      setToast({
        type: 'error',
        message: 'Function start time and end time are required.',
      });
      return;
    }

    if (!formState.startTime || !formState.endTime) {
      setToast({
        type: 'error',
        message: 'Function start time and end time are required.',
      });
      return;
    }

    if (!isValidTimeRange(formState.startTime, formState.endTime)) {
      setToast({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    if (formState.inquiryCustomPrice.trim()) {
      const normalizedInquiryCustomPrice = Number(formState.inquiryCustomPrice);
      if (!Number.isFinite(normalizedInquiryCustomPrice) || normalizedInquiryCustomPrice < 0) {
        setToast({ type: 'error', message: 'Enter a valid custom price.' });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer: {
          firstName,
          lastName,
          phone: normalizedPhone,
        },
        pax: pax || undefined,
        eventType: resolvedEventName,
        functionName: resolvedEventName,
        inquiryDate: formState.inquiryDate || undefined,
        eventDate: formState.functionDate || undefined,
        startTime: formState.startTime || undefined,
        endTime: formState.endTime || undefined,
        jainSwaminarayanPax: Number(formState.jainSwaminarayanPerson) || undefined,
        jainSwaminarayanDetails:
          formState.jainSwaminarayanDetails.trim() || undefined,
        seatingRequired: Number(formState.seatingRequiredNumber) || undefined,
        serviceSlot: formState.serviceSlot || undefined,
        hallDetails: formState.hallDetails.trim() || undefined,
        referenceBy: formState.referenceBy.trim() || undefined,
        addonServices: formState.addonEntries.length
          ? formState.addonEntries.map((e) => ({ id: e.id, label: e.label, price: Number(e.price) || 0 }))
          : undefined,
        additionalInformation:
          formState.additionalInformation.trim() || undefined,
        categoryId: formState.categoryId || undefined,
        inquiryCustomPrice: formState.inquiryCustomPrice.trim()
          ? Number(formState.inquiryCustomPrice)
          : undefined,
      };

      if (editingOrder) {
        await updateOrder(accessToken, editingOrder.id, {
          ...payload,
          status: editingOrder.status,
          selectedMenus:
            editingOrder.menuSelectionSnapshot.length > 0
              ? editingOrder.menuSelectionSnapshot.map((menu) => ({
                  menuId: menu.menuId,
                  sections: menu.sections.map((section) => ({
                    sectionTitle: section.sectionTitle,
                    items: section.items,
                  })),
                }))
              : undefined,
          eventType: resolvedEventName || editingOrder.eventType || '',
          extrasTotal: editingOrder.extrasTotal,
          discountAmount: editingOrder.discountAmount,
          advanceAmount: editingOrder.advanceAmount,
          notes: formState.additionalInformation.trim() || undefined,
        });
        setToast({ type: 'success', message: 'Inquiry updated successfully.' });
      } else if (status === 'CONFIRMED') {
        // Store the payload and open the payment popup — advance popup will create the order on confirm
        pendingCreatePayload.current = {
          ...payload,
          status: 'CONFIRMED',
          notes: formState.additionalInformation.trim() || undefined,
        };
        openAdvancePopup('new');
        setIsInquiryOpen(false);
        return;
      } else {
        await createOrder(accessToken, {
          ...payload,
          status: 'INQUIRY',
          notes: formState.additionalInformation.trim() || undefined,
        });
        setToast({ type: 'success', message: 'Inquiry created successfully.' });
      }
      setIsInquiryOpen(false);
      setEditingOrder(null);
      setFormState(initialFormState);
      setCustomEventName('');
      await refreshBookingViews(accessToken);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to create inquiry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveBookingSelection() {
    if (!accessToken || !editingOrder) {
      setToast({ type: 'error', message: 'Select an inquiry first.' });
      return;
    }

    if (!formState.categoryId) {
      setToast({ type: 'error', message: 'Select a category before saving.' });
      return;
    }

    if (formState.customPricePerPlate.trim()) {
      const normalizedCustomPrice = Number(formState.customPricePerPlate);
      if (!Number.isFinite(normalizedCustomPrice) || normalizedCustomPrice < 0) {
        setToast({ type: 'error', message: 'Enter a valid custom price.' });
        return;
      }
    }

    const normalizedPhone = formState.mobileNumber.trim();
    const resolvedEventName = getResolvedEventName(formState.eventName, customEventName);
    const { firstName, lastName } = splitFullName(formState.customerName.trim());

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setToast({ type: 'error', message: 'Contact number must be exactly 10 digits.' });
      return;
    }

    if (!formState.hallDetails.trim()) {
      setToast({ type: 'error', message: 'Hall details is required.' });
      return;
    }

    if (!resolvedEventName) {
      setToast({ type: 'error', message: 'Event name is required.' });
      return;
    }

    if (!isValidTimeRange(formState.startTime, formState.endTime)) {
      setToast({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    if (orderedCategoryRules.length === 0) {
      setToast({
        type: 'error',
        message: 'This category has no configured menu items. Update the category first.',
      });
      return;
    }

    try {
      const menuSelectionTracking =
        menuSelectionTrackingRef.current?.orderId === editingOrder.id
          ? {
              startedAt: menuSelectionTrackingRef.current.startedAt,
              trigger: menuSelectionTrackingRef.current.trigger,
            }
          : undefined;
      setIsSubmitting(true);
      await updateOrder(accessToken, editingOrder.id, {
        customer: {
          firstName,
          lastName,
          phone: normalizedPhone,
        },
        status: editingOrder.status,
        pax,
        eventType: resolvedEventName || editingOrder.eventType || '',
        functionName: resolvedEventName,
        inquiryDate: formState.inquiryDate,
        eventDate: formState.functionDate,
        startTime: formState.startTime,
        endTime: formState.endTime,
        categoryId: formState.categoryId,
        addonServices: formState.addonEntries.length
          ? formState.addonEntries.map((e) => ({ id: e.id, label: e.label, price: Number(e.price) || 0 }))
          : undefined,
        customPricePerPlate: formState.customPricePerPlate.trim()
          ? Number(formState.customPricePerPlate)
          : undefined,
        selectedMenus: formState.selectedMenus.map((menu) => ({
          menuId: menu.menuId,
          sections: menu.sections.map((section) => ({
            sectionTitle: section.sectionTitle,
            items: section.items,
          })),
        })),
        menuComment: formState.menuComment.trim(),
        extrasTotal: editingOrder.extrasTotal,
        discountAmount: editingOrder.discountAmount,
        advanceAmount: editingOrder.advanceAmount,
        notes: formState.additionalInformation.trim() || undefined,
        jainSwaminarayanPax: Number(formState.jainSwaminarayanPerson) || undefined,
        jainSwaminarayanDetails:
          formState.jainSwaminarayanDetails.trim() || undefined,
        seatingRequired: Number(formState.seatingRequiredNumber) || undefined,
        serviceSlot: formState.serviceSlot || undefined,
        hallDetails: formState.hallDetails.trim() || undefined,
        referenceBy: formState.referenceBy.trim() || undefined,
        additionalInformation:
          formState.additionalInformation.trim() || undefined,
        menuSelectionTracking,
      });
      resetWizard();
      setToast({ type: 'success', message: 'Booking details saved successfully.' });
      await refreshBookingViews(accessToken);
      if (isDetailOpen) {
        await openOrderDetail(editingOrder.id);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to save booking details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConvertInquiry() {
    if (!accessToken) return;

    try {
      setIsAdvanceSubmitting(true);

      if (advancePopup?.mode === 'new' && pendingCreatePayload.current) {
        // Create a new confirmed booking with payment details
        const createdOrder = await createOrder(accessToken, {
          ...pendingCreatePayload.current,
          advanceAmount: Number(advanceAmount) || 0,
          advanceDate,
          paymentMode,
          notes:
            advanceRemark.trim() || pendingCreatePayload.current.notes || undefined,
        });
        pendingCreatePayload.current = null;
        setAdvancePopup(null);
        setEditingOrder(null);
        setFormState(initialFormState);
        setCustomEventName('');
        setToast({ type: 'success', message: 'Booking confirmed successfully.' });
        await refreshBookingViews(accessToken);
        await openOrderDetail(createdOrder.id, createdOrder);
      } else if (advancePopup?.order) {
        // Convert an existing inquiry to confirmed
        await confirmInquiry(accessToken, advancePopup.order.id, {
          advanceAmount: Number(advanceAmount) || 0,
          extrasTotal: Number(confirmExtrasTotal) || 0,
          discountAmount: Number(confirmDiscount) || 0,
          paymentMode,
          advanceDate,
          remark: advanceRemark.trim() || undefined,
        });
        setAdvancePopup(null);
        setToast({ type: 'success', message: 'Inquiry converted to booking successfully.' });
        await refreshBookingViews(accessToken);
        if (isDetailOpen) {
          await openOrderDetail(advancePopup.order.id);
        }
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to confirm booking.',
      });
    } finally {
      setIsAdvanceSubmitting(false);
    }
  }

  async function handleSaveAsInquiry() {
    if (!accessToken || !pendingCreatePayload.current) return;
    try {
      setIsAdvanceSubmitting(true);
      await createOrder(accessToken, {
        ...pendingCreatePayload.current,
        status: 'INQUIRY',
        advanceAmount: undefined,
        paymentMode: undefined,
        notes: pendingCreatePayload.current.notes,
      });
      pendingCreatePayload.current = null;
      setAdvancePopup(null);
      setEditingOrder(null);
      setFormState(initialFormState);
      setCustomEventName('');
      setToast({ type: 'success', message: 'Inquiry created successfully.' });
      await refreshBookingViews(accessToken);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to create inquiry.',
      });
    } finally {
      setIsAdvanceSubmitting(false);
    }
  }

  async function handleCancel(
    orderId: string,
    reason?: string,
    advanceOption?: CancelAdvanceOption | null,
    expiryMonths?: number | null,
    expiryCustomDate?: string,
    paybackMode?: 'CASH' | 'ONLINE' | null,
  ) {
    if (!accessToken) return;
    const trimmedReason = reason?.trim() ?? '';
    if (canUseAdvancedCancelManagement && !trimmedReason) {
      setToast({ type: 'error', message: 'Cancellation reason is required.' });
      return;
    }

    let advanceExpiryDate: string | undefined;
    if (advanceOption === 'DINE_IN' || advanceOption === 'NEXT_BOOKING') {
      if (expiryCustomDate) {
        advanceExpiryDate = expiryCustomDate;
      } else if (expiryMonths) {
        const d = new Date();
        d.setMonth(d.getMonth() + expiryMonths);
        advanceExpiryDate = d.toISOString().split('T')[0];
      }
    }

    try {
      setIsCancelSubmitting(true);
      await cancelOrder(accessToken, orderId, {
        reason: trimmedReason || undefined,
        advanceOption: canUseAdvancedCancelManagement ? advanceOption ?? undefined : undefined,
        advanceExpiryDate,
      });
      setToast({ type: 'success', message: 'Booking cancelled successfully.' });
      setCancelledOrderId(orderId);
      await refreshBookingViews(accessToken);
      if (isDetailOpen) await openOrderDetail(orderId);
    } catch (requestError) {
      setToast({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Unable to cancel order.',
      });
    } finally {
      setIsCancelSubmitting(false);
    }
  }

  async function handleReverseAdvancePayment(order: Order, paymentId: string) {
    if (!accessToken) {
      return;
    }

    const payment = order.advancePayments.find((entry) => entry.id === paymentId);
    const cancelAdvance = order.cancelAdvanceManagement;

    if (!payment || !cancelAdvance) {
      setToast({ type: 'error', message: 'Advance payment details are not available.' });
      return;
    }

    if (cancelAdvance.option !== 'PAY_BACK') {
      setToast({ type: 'error', message: 'Select Pay Back before reversing advance payments.' });
      return;
    }

    if (cancelAdvance.status !== 'ACTIVE') {
      setToast({ type: 'error', message: 'This pay back wallet is not active.' });
      return;
    }

    const reversedForPayment = (cancelAdvance.payoutEntries ?? [])
      .filter((entry) => entry.sourcePaymentId === payment.id)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const reversedForMode = (cancelAdvance.payoutEntries ?? [])
      .filter((entry) => !entry.sourcePaymentId)
      .filter((entry) => entry.mode === payment.paymentMode)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const reversibleAmount = Math.min(
      Math.max(payment.amount - reversedForPayment - reversedForMode, 0),
      cancelAdvance.remainingBalance,
    );

    if (reversibleAmount <= 0) {
      setToast({ type: 'error', message: 'This payment method has already been fully reversed.' });
      return;
    }

    try {
      setReversingPaymentId(paymentId);
      const updatedOrder = await processAdvancePayout(accessToken, order.id, {
        amount: reversibleAmount,
        mode: payment.paymentMode,
        note: `Reverse advance payment ${payment.paymentMode}`,
        sourcePaymentId: payment.id,
      });
      setDetailOrder(updatedOrder);
      setToast({
        type: 'success',
        message: `${formatCurrency(reversibleAmount)} reversed via ${payment.paymentMode}.`,
      });
      await refreshBookingViews(accessToken);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to reverse advance payment.',
      });
    } finally {
      setReversingPaymentId(null);
    }
  }

  async function handleDelete(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      setIsDeleteSubmitting(true);
      await deleteOrder(accessToken, orderId);
      setDeletePopup(null);
      setToast({ type: 'success', message: 'Inquiry deleted successfully.' });
      await refreshBookingViews(accessToken);
      if (isDetailOpen) {
        setIsDetailOpen(false);
        setDetailOrder(null);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to delete inquiry.',
      });
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  async function handleAddFollowUp() {
    if (!accessToken || !followUpPopup) {
      return;
    }

    if (!followUpPopup.note.trim()) {
      setToast({ type: 'error', message: 'Follow up note is required.' });
      return;
    }

    try {
      setIsFollowUpSubmitting(true);
      const updatedOrder = await addOrderFollowUp(accessToken, followUpPopup.orderId, {
        note: followUpPopup.note.trim(),
        date: followUpPopup.date || undefined,
        nextFollowUpDate: followUpPopup.nextFollowUpDate || undefined,
        closeInquiry: followUpPopup.closeInquiry,
      });
      setFollowUpPopup(null);
      setToast({
        type: 'success',
        message: updatedOrder.inquiryClosed
          ? 'Follow up added and inquiry closed successfully.'
          : 'Follow up added successfully.',
      });
      await refreshBookingViews(accessToken);
      if (isDetailOpen) {
        setDetailOrder(updatedOrder);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to add follow up.',
      });
    } finally {
      setIsFollowUpSubmitting(false);
    }
  }

  function openSignaturePopup(order: Order) {
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
    } catch (error) {
      const permissionDenied =
        error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED;

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
      setToast({ type: 'error', message: 'Confirm the booking details before signing.' });
      return;
    }

    if (!signaturePopup.hasSignature) {
      setToast({ type: 'error', message: 'Add a signature before saving.' });
      return;
    }

    const signatureImage = signatureCanvasRef.current?.toDataURL('image/png');
    if (!signatureImage) {
      setToast({ type: 'error', message: 'Unable to read signature.' });
      return;
    }

    try {
      setIsSignatureSubmitting(true);
      const location = await captureSignatureLocation();
      setSignaturePopup((current) =>
        current ? { ...current, locationMessage: location.message } : current,
      );
      const signature = await saveOrderSignature(accessToken, signaturePopup.order.id, {
        signatureImage,
        confirmationAccepted: signaturePopup.confirmationAccepted,
        confirmationText: SIGNATURE_CONFIRMATION_TEXT,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        locationPermissionStatus: location.locationPermissionStatus,
      });
      setToast({ type: 'success', message: 'Booking signature saved successfully.' });
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
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to save signature.',
      });
    } finally {
      setIsSignatureSubmitting(false);
    }
  }

  function openTransferPopup(order: Order) {
    if (!isCompanyAdmin) {
      setToast({ type: 'error', message: 'Contact company admin to transfer this booking.' });
      return;
    }

    setTransferPopup({
      orderId: order.id,
      orderName: order.functionName || order.orderId,
      status: order.status,
      newDate: order.eventDate ? formatDateKey(order.eventDate) : '',
      serviceSlot: order.serviceSlot ?? '',
      startTime: order.startTime ?? '',
      endTime: order.endTime ?? '',
    });
  }

  async function handleTransferBooking() {
    if (!accessToken || !transferPopup) {
      return;
    }

    if (!isCompanyAdmin) {
      setToast({ type: 'error', message: 'Contact company admin to transfer this booking.' });
      return;
    }

    if (!transferPopup.newDate) {
      setToast({ type: 'error', message: 'New date is required.' });
      return;
    }

    if (
      (transferPopup.startTime || transferPopup.endTime) &&
      (!transferPopup.startTime || !transferPopup.endTime)
    ) {
      setToast({
        type: 'error',
        message: 'Start time and end time are both required.',
      });
      return;
    }

    if (!isValidTimeRange(transferPopup.startTime, transferPopup.endTime)) {
      setToast({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    try {
      setIsTransferSubmitting(true);
      const updatedOrder = await updateOrder(accessToken, transferPopup.orderId, {
        eventDate: transferPopup.newDate,
        serviceSlot: transferPopup.serviceSlot.trim(),
        startTime: transferPopup.startTime || undefined,
        endTime: transferPopup.endTime || undefined,
      });
      setTransferPopup(null);
      setToast({
        type: 'success',
        message:
          updatedOrder.status === 'CONFIRMED'
            ? 'Booking transferred successfully.'
            : 'Inquiry transferred successfully.',
      });
      await refreshBookingViews(accessToken);
      if (isDetailOpen) {
        setDetailOrder(updatedOrder);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to transfer booking.',
      });
    } finally {
      setIsTransferSubmitting(false);
    }
  }

  async function handleAddAdvancePayment() {
    if (!accessToken || !paymentPopup) return;

    const amount = Number(paymentAmount);
    if (!amount || amount < 1) {
      setToast({ type: 'error', message: 'Enter a valid payment amount.' });
      return;
    }

    try {
      setIsPaymentSubmitting(true);
      const updatedOrder = await addAdvancePayment(accessToken, paymentPopup.orderId, {
        amount,
        paymentMode: paymentPopupMode,
        remark: paymentRemark.trim() || undefined,
      });
      setPaymentPopup(null);
      setPaymentAmount('');
      setPaymentPopupMode(defaultPaymentMode);
      setPaymentRemark('');
      setPaymentEditor(null);
      if (isDetailOpen) {
        setDetailOrder(updatedOrder);
      }
      setToast({ type: 'success', message: 'Payment recorded successfully.' });
    } catch (requestError) {
      setToast({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Unable to record payment.',
      });
    } finally {
      setIsPaymentSubmitting(false);
    }
  }

  async function handleSaveAdvancePayment() {
    if (!accessToken || !paymentPopup || !paymentEditor?.paymentId) return;

    const amount = Number(paymentAmount);
    if (!amount || amount < 1) {
      setToast({ type: 'error', message: 'Enter a valid payment amount.' });
      return;
    }

    try {
      setIsPaymentSubmitting(true);
      const updatedOrder = await updateAdvancePayment(
        accessToken,
        paymentPopup.orderId,
        paymentEditor.paymentId,
        {
          amount,
          paymentMode: paymentPopupMode,
          remark: paymentRemark.trim() || undefined,
        },
      );
      setPaymentPopup(null);
      setPaymentAmount('');
      setPaymentPopupMode(defaultPaymentMode);
      setPaymentRemark('');
      setPaymentEditor(null);
      if (isDetailOpen) {
        setDetailOrder(updatedOrder);
      }
      setToast({ type: 'success', message: 'Payment updated successfully.' });
    } catch (requestError) {
      setToast({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Unable to update payment.',
      });
    } finally {
      setIsPaymentSubmitting(false);
    }
  }

  async function handleDeleteAdvancePayment(orderId: string, paymentId: string) {
    if (!accessToken) return;

    try {
      const updatedOrder = await deleteAdvancePayment(accessToken, orderId, paymentId);
      if (isDetailOpen) {
        setDetailOrder(updatedOrder);
      }
      setToast({ type: 'success', message: 'Payment deleted successfully.' });
    } catch (requestError) {
      setToast({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Unable to delete payment.',
      });
    }
  }

  async function handleOpenCategoryFromCalendar(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDayRecordsPopup(null);
      openCategoryChooser(order);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open category selection.',
      });
    }
  }

  async function handleOpenEditFromCalendar(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDayRecordsPopup(null);
      openEditInquiry(order);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open inquiry edit.',
      });
    }
  }

  async function handleOpenConvertFromCalendar(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDayRecordsPopup(null);
      handleOpenConvertInquiry(order);
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open convert popup.',
      });
    }
  }

  async function handleOpenCancelFromCalendar(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDayRecordsPopup(null);
      setCancelPopup({ order, reason: '', advanceOption: null, expiryMonths: null, expiryCustomDate: '', paybackMode: null });
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open cancel popup.',
      });
    }
  }

  async function handleMarkCompleted(order: Order) {
    if (!accessToken) {
      return;
    }

    if (
      !order.categorySnapshot ||
      !order.eventDate ||
      !order.startTime ||
      !order.endTime ||
      !order.pax ||
      !order.eventType ||
      !order.functionName
    ) {
      setToast({
        type: 'error',
        message: 'Complete booking details before marking as completed.',
      });
      return;
    }

    try {
      await updateOrder(accessToken, order.id, {
        customer: {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          phone: order.customer.phone,
          email: order.customer.email ?? undefined,
        },
        status: 'COMPLETED',
        pax: order.pax,
        eventType: order.eventType,
        functionName: order.functionName,
        eventDate: formatDateKey(order.eventDate),
        startTime: order.startTime,
        endTime: order.endTime,
        categoryId: order.categorySnapshot.categoryId,
        addonServices: order.addonServiceSnapshots.map((snap) => ({
          id: snap.addonServiceId !== 'custom' ? snap.addonServiceId : undefined,
          label: snap.label,
          price: snap.price,
        })),
        selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
          menuId: menu.menuId,
          sections: menu.sections.map((section) => ({
            sectionTitle: section.sectionTitle,
            items: section.items,
          })),
        })),
        extrasTotal: order.extrasTotal,
        discountAmount: order.discountAmount,
        advanceAmount: order.advanceAmount,
        notes: order.notes ?? undefined,
      });
      setToast({ type: 'success', message: 'Booking marked as completed.' });
      await refreshBookingViews(accessToken);
      if (isDetailOpen) {
        await openOrderDetail(order.id);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to complete booking.',
      });
    }
  }

function statusClasses(status: OrderStatus, inquiryClosed = false) {
    if (inquiryClosed) {
      return 'border-slate-900 bg-slate-950 text-white';
    }

    switch (status) {
      case 'CONFIRMED':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'CANCELLED':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'COMPLETED':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function selectionStatus(order: Order) {
    if (order.categorySnapshot && order.menuSelectionSnapshot.length > 0) {
      return {
        label: 'Menu Selected',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }

    if (order.categorySnapshot) {
      return {
        label: 'Category Selected',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    }

    return {
      label: 'Selection Pending',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  }

  return (
    <BookingsRoute>
      <section className="space-y-5">
        {toast ? <ToastMessage toast={toast} /> : null}

        {pageError ? (
          <EmptyState
            title="Unable to load bookings"
            description={pageError}
            compact
          />
        ) : isCalendarSearchOpen ? (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative mx-auto w-full max-w-md">
              <label className="sr-only" htmlFor="booking-global-search">
                Search bookings by name
              </label>
              <input
                ref={calendarSearchInputRef}
                id="booking-global-search"
                type="text"
                value={calendarSearchInput}
                onChange={(event) => setCalendarSearchInput(event.target.value)}
                placeholder="Search by name"
                className={`${inputCls} h-11 rounded-2xl border-slate-200 bg-white pl-10 pr-10 text-sm`}
              />
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 3 3" />
                  <circle cx="8.5" cy="8.5" r="5.5" />
                </svg>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCalendarSearchOpen(false);
                  setCalendarSearchInput('');
                  setCalendarSearchResults([]);
                  setCalendarSearchError('');
                }}
                aria-label="Close booking search"
                className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            {!isCalendarSearchActive ? null : isCalendarSearchLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                Searching bookings...
              </div>
            ) : calendarSearchError ? (
              <EmptyState title="Unable to search bookings" description={calendarSearchError} compact />
            ) : calendarSearchResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No booking found for &quot;{calendarSearchInput.trim()}&quot;.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {calendarSearchResults.map((order) => {
                  const cardCls =
                    order.status === 'INQUIRY' && order.inquiryClosed
                      ? 'border-slate-400 bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.12)]'
                      : order.status === 'CONFIRMED'
                        ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]'
                        : order.status === 'INQUIRY'
                          ? 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]'
                          : 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
                  return (
                    <button
                      type="button"
                      key={`global-search-${order.id}`}
                      onClick={() => void openOrderDetail(order.id, order)}
                      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${cardCls}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-slate-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {order.functionName || 'Event pending'}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-900">
                            {order.eventDate ? formatDisplayDate(order.eventDate) : 'Date pending'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.startTime && order.endTime
                              ? formatTimeRange(order.startTime, order.endTime)
                              : 'Time pending'}{' '}
                            • {order.pax ? `${order.pax} pax` : 'Pax pending'}
                          </p>
                          {order.serviceSlot ? (
                            <p className="mt-1 text-xs font-semibold text-slate-900">
                              Service Slot: {order.serviceSlot}
                            </p>
                          ) : null}
                          {order.hallDetails ? (
                            <p className="mt-1 text-xs font-semibold text-slate-900">
                              Hall Details: {order.hallDetails}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(
                              order.status,
                              order.inquiryClosed,
                            )}`}
                          >
                            {order.inquiryClosed ? 'CLOSED INQUIRY' : order.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      List View
                    </p> */}
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      {formatMonthLabel(calendarMonth)}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCalendarSearchOpen(true)}
                      aria-label="Search bookings"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 3 3" />
                        <circle cx="8.5" cy="8.5" r="5.5" />
                      </svg>
                    </button>
                    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-white transition"
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Calendar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                    className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconGlyph icon="previous" />
                      <span>{formatMonthLabel(shiftMonth(calendarMonth, -1))}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
                  >
                    Current month
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                    className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{formatMonthLabel(shiftMonth(calendarMonth, 1))}</span>
                      <IconGlyph icon="next" />
                    </span>
                  </button>
                  <div className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Monthly Records
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{totalItems}</p>
                  </div>
                </div>
              </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Event Name</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Totals</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <TableLoader colSpan={6} message="Loading bookings…" />
                    ) : orders.length === 0 ? (
                      <tr>
                        <td className="px-5 py-6" colSpan={6}>
                          <EmptyState
                            title="No bookings found"
                            description="No bookings are available for this month."
                            compact
                          />
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                          {(() => {
                            const menuStatus = selectionStatus(order);

                            return (
                              <>
                          <td className="px-5 py-4 text-slate-700">
                            <p className="text-base font-semibold text-slate-900">
                              {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <p className="mt-1 text-slate-500">{order.customer.phone}</p>
                            <span
                              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${menuStatus.className}`}
                            >
                              {menuStatus.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {order.functionName || 'Pending'}
                            {metadataLine('Event Type', order.eventType || 'Pending')}
                            {metadataLine('Service Slot', order.serviceSlot || 'Pending', true)}
                            {metadataLine('Hall Details', order.hallDetails || 'Pending', true)}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            <p>
                              {order.eventDate
                                ? formatDisplayDate(order.eventDate)
                                : 'Date pending'}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {order.startTime && order.endTime
                                ? formatTimeRange(order.startTime, order.endTime)
                                : 'Time pending'}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {order.pax ? `${order.pax} pax` : 'Pax pending'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            <p>{formatCurrency(order.grandTotal)}</p>
                            <p className="mt-1 text-slate-500">
                              Advance {formatCurrency(order.advanceAmount)}
                            </p>
                            <p className="mt-1 text-slate-500">
                              Pending {formatCurrency(order.pendingAmount)}
                            </p>
                            <p className="mt-1 text-slate-500">{order.paymentStatus}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                                order.status,
                                order.inquiryClosed,
                              )}`}
                            >
                              {order.inquiryClosed ? 'CLOSED INQUIRY' : order.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <IconActionButton
                                label="View booking"
                                onClick={() => void openOrderDetail(order.id, order)}
                                icon="view"
                              />
                              {isCompanyAdmin ? (
                                <IconActionButton
                                  label="Delete inquiry"
                                  onClick={() => setDeletePopup(order)}
                                  icon="delete"
                                  tone="danger"
                                />
                              ) : null}
                              {order.status === 'INQUIRY' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvertInquiry(order)}
                                  className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                                >
                                  Convert
                                </button>
                              ) : null}
                              {isCompanyAdmin &&
                              (order.status === 'INQUIRY' ||
                                order.status === 'CONFIRMED') ? (
                                <IconActionButton
                                  label="Cancel booking"
                                  onClick={() => setCancelPopup({ order, reason: '', advanceOption: null, expiryMonths: null, expiryCustomDate: '', paybackMode: null })}
                                  icon="cancel"
                                  tone="danger"
                                />
                              ) : null}
                              {order.status === 'CONFIRMED' ? (
                                <IconActionButton
                                  label="Mark completed"
                                  onClick={() => void handleMarkCompleted(order)}
                                  icon="complete"
                                  tone="info"
                                />
                              ) : null}
                            </div>
                          </td>
                              </>
                            );
                          })()}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {isLoading ? (
                <PageLoader message="Loading bookings…" />
              ) : orders.length === 0 ? (
                <EmptyState
                  title="No bookings found"
                  description="No bookings are available for this month."
                  compact
                />
              ) : (
                orders.map((order) => (
                  <article
                    key={`mobile-${order.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    {(() => {
                      const menuStatus = selectionStatus(order);

                      return (
                        <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{order.customer.phone}</p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${menuStatus.className}`}
                        >
                          {menuStatus.label}
                        </span>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${statusClasses(
                          order.status,
                          order.inquiryClosed,
                        )}`}
                      >
                        {order.inquiryClosed ? 'CLOSED INQUIRY' : order.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-700">
                      <p>
                        {order.eventDate ? formatDisplayDate(order.eventDate) : 'Date pending'} •{' '}
                        {order.startTime && order.endTime
                          ? formatTimeRange(order.startTime, order.endTime)
                          : 'Time pending'}
                      </p>
                      <p>
                        {order.pax ? `${order.pax} pax` : 'Pax pending'} •{' '}
                        {order.functionName || 'Pending'}
                      </p>
                      <p>
                        Event Type: {order.eventType || 'Pending'}
                      </p>
                      <p className="font-semibold text-slate-900">
                        Service Slot: {order.serviceSlot || 'Pending'}
                      </p>
                      <p className="font-semibold text-slate-900">
                        Hall Details: {order.hallDetails || 'Pending'}
                      </p>
                      <p>
                        Total {formatCurrency(order.grandTotal)} • Pending {formatCurrency(order.pendingAmount)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <IconActionButton
                        label="View booking"
                        onClick={() => void openOrderDetail(order.id, order)}
                        icon="view"
                        compact
                      />
                      {isCompanyAdmin ? (
                        <IconActionButton
                          label="Delete inquiry"
                          onClick={() => setDeletePopup(order)}
                          icon="delete"
                          tone="danger"
                          compact
                        />
                      ) : null}
                      {order.status === 'INQUIRY' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenConvertInquiry(order)}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Convert
                        </button>
                      ) : null}
                      {isCompanyAdmin &&
                      (order.status === 'INQUIRY' || order.status === 'CONFIRMED') ? (
                        <IconActionButton
                          label="Cancel booking"
                          onClick={() => setCancelPopup({ order, reason: '', advanceOption: null, expiryMonths: null, expiryCustomDate: '', paybackMode: null })}
                          icon="cancel"
                          tone="danger"
                          compact
                        />
                      ) : null}
                    </div>
                        </>
                      );
                    })()}
                  </article>
                ))
              )}
            </div>

            </div>
          </>
        ) : (
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
                    onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                    aria-label="Previous month"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
                  >
                    <IconGlyph icon="previous" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                    aria-label="Next month"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
                  >
                    <IconGlyph icon="next" />
                  </button>
                  {isCalendarSearchOpen ? (
                    <div className="relative w-[150px] shrink-0 sm:w-[220px]">
                      <label className="sr-only" htmlFor="calendar-booking-search">
                        Search bookings by name
                      </label>
                      <input
                        ref={calendarSearchInputRef}
                        id="calendar-booking-search"
                        type="text"
                        value={calendarSearchInput}
                        onChange={(event) => setCalendarSearchInput(event.target.value)}
                        placeholder="Search"
                        className={`${inputCls} h-10 rounded-2xl border-slate-200 bg-white pl-9 pr-9 text-sm sm:h-12`}
                      />
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 3 3" />
                          <circle cx="8.5" cy="8.5" r="5.5" />
                        </svg>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCalendarSearchOpen(false);
                          setCalendarSearchInput('');
                          setCalendarSearchResults([]);
                          setCalendarSearchError('');
                        }}
                        aria-label="Close booking search"
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCalendarSearchOpen(true)}
                      aria-label="Search bookings"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 sm:h-5 sm:w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 3 3" />
                        <circle cx="8.5" cy="8.5" r="5.5" />
                      </svg>
                    </button>
                  )}
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
                      onClick={() => setCalendarMonth(new Date())}
                      className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:px-5"
                    >
                      Today
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCalendarActionsOpen(true)}
                    aria-label="Open calendar actions"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:bg-amber-100 sm:hidden"
                  >
                    <IconChevronDown />
                  </button>
                </div>
              </div>
            </div>
            {isCalendarSearchOpen ? (
              <div className="space-y-4">
                {!isCalendarSearchActive ? null : isCalendarSearchLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                    Searching bookings...
                  </div>
                ) : calendarSearchError ? (
                  <EmptyState title="Unable to search bookings" description={calendarSearchError} compact />
                ) : calendarSearchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No booking found for &quot;{calendarSearchInput.trim()}&quot;.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {calendarSearchResults.map((order) => {
                      const cardCls =
                        order.status === 'INQUIRY' && order.inquiryClosed
                          ? 'border-slate-400 bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.12)]'
                          : order.status === 'CONFIRMED'
                            ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]'
                            : order.status === 'INQUIRY'
                              ? 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]'
                              : 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
                      return (
                        <button
                          type="button"
                          key={`calendar-search-${order.id}`}
                          onClick={() => void openOrderDetail(order.id, order)}
                          className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${cardCls}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-slate-900">
                                {order.customer.firstName} {order.customer.lastName}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {order.functionName || 'Event pending'}
                              </p>
                              <p className="mt-2 text-xs font-semibold text-slate-900">
                                {order.eventDate ? formatDisplayDate(order.eventDate) : 'Date pending'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {order.startTime && order.endTime
                                  ? formatTimeRange(order.startTime, order.endTime)
                                  : 'Time pending'}{' '}
                                • {order.pax ? `${order.pax} pax` : 'Pax pending'}
                              </p>
                              {order.serviceSlot ? (
                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                  Service Slot: {order.serviceSlot}
                                </p>
                              ) : null}
                              {order.hallDetails ? (
                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                  Hall Details: {order.hallDetails}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(
                                  order.status,
                                  order.inquiryClosed,
                                )}`}
                              >
                                {order.inquiryClosed ? 'CLOSED INQUIRY' : order.status}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : isCalendarLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                Loading calendar…
              </div>
            ) : (
                <div className="space-y-4">
                  {isCalendarSearchActive ? (
                    <>
                      {calendarSearchResults.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          No booking found for &quot;{calendarSearchInput.trim()}&quot; in {formatMonthLabel(calendarMonth)}.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {calendarSearchResults.map((calendarOrder) => {
                            const cardCls =
                              calendarOrder.status === 'INQUIRY' && calendarOrder.inquiryClosed
                                ? 'border-slate-400 bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.12)]'
                                : calendarOrder.status === 'CONFIRMED'
                                  ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]'
                                  : calendarOrder.status === 'INQUIRY'
                                    ? 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]'
                                    : 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
                            return (
                              <button
                                type="button"
                                key={`calendar-search-${calendarOrder.id}`}
                                onClick={() => void openOrderDetail(calendarOrder.id)}
                                className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${cardCls}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-slate-900">
                                      {calendarOrder.customer.firstName} {calendarOrder.customer.lastName}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">{calendarOrder.functionName || 'Event pending'}</p>
                                    <p className="mt-2 text-xs font-semibold text-slate-900">
                                      {calendarOrder.eventDate ? formatDisplayDate(calendarOrder.eventDate) : 'Date pending'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatTimeRange(calendarOrder.startTime, calendarOrder.endTime)} • {calendarOrder.pax} pax
                                    </p>
                                    {calendarOrder.serviceSlot ? (
                                      <p className="mt-1 text-xs font-semibold text-slate-900">
                                        Service Slot: {calendarOrder.serviceSlot}
                                      </p>
                                    ) : null}
                                    {calendarOrder.hallDetails ? (
                                      <p className="mt-1 text-xs font-semibold text-slate-900">
                                        Hall Details: {calendarOrder.hallDetails}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                    <span
                                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(
                                        calendarOrder.status,
                                        calendarOrder.inquiryClosed,
                                      )}`}
                                    >
                                      {calendarOrder.inquiryClosed ? 'CLOSED INQUIRY' : calendarOrder.status}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                  {calendarOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No bookings in this range. You can still browse dates and add a new inquiry.
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
                    {monthGrid.map((day, index) => {
                      if (!day) {
                        return <div key={`month-empty-${index}`} className="min-h-[112px] sm:min-h-[132px]" aria-hidden="true" />;
                      }

                      const dayKey = formatDateKey(day);
                      const dayOrders = ordersByDate.get(dayKey) ?? [];
                      const statusCounts = getMonthTileStatusCounts(dayOrders);
                      const isSelectedDay = selectedCalendarDay === dayKey;
                      const isToday = dayKey === formatDateKey(new Date());
                      const isHighlightedDay = isSelectedDay || (!selectedCalendarDay && isToday);
                      const isHotDate = hotDateKeys.has(dayKey);
                      const statusRows = [
                        { key: 'booked', count: statusCounts.booked, markerClassName: 'bg-emerald-400', textClassName: 'text-slate-800' },
                        { key: 'inquiry', count: statusCounts.inquiry, markerClassName: 'bg-amber-300', textClassName: 'text-slate-800' },
                        { key: 'closed', count: statusCounts.closed, markerClassName: 'bg-slate-950', textClassName: 'text-slate-800' },
                        { key: 'cancelled', count: statusCounts.cancelled, markerClassName: 'bg-red-300', textClassName: 'text-slate-800' },
                      ];
                      const compactStatusRows = [
                        ...statusRows.filter((statusRow) => statusRow.count > 0),
                        ...Array.from({ length: 4 - statusRows.filter((statusRow) => statusRow.count > 0).length }, () => null),
                      ];

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() => {
                            setSelectedCalendarDay(dayKey);
                            setDayRecordsPopup({ dateKey: dayKey, orders: dayOrders });
                          }}
                          className={`relative min-h-[112px] overflow-hidden rounded-[26px] border text-left transition sm:min-h-[132px] ${
                            isHotDate
                              ? isHighlightedDay
                                ? 'border-red-300 bg-white ring-2 ring-red-200'
                                : 'border-red-200 bg-white'
                              : isHighlightedDay
                                ? 'border-amber-300 bg-white ring-2 ring-amber-100'
                                : isToday
                                  ? 'border-slate-200 bg-white'
                                  : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div
                            className={`absolute inset-x-0 top-0 flex min-h-[42px] items-center justify-center rounded-t-[25px] border-b px-2 py-2 sm:min-h-[48px] ${
                              isHotDate
                                ? 'border-b-red-200 bg-red-50'
                                : isHighlightedDay
                                  ? 'border-b-amber-200 bg-amber-50'
                                  : 'border-b-slate-200 bg-slate-50'
                            }`}
                          >
                            <p className={`text-2xl font-medium leading-none sm:text-3xl ${isHotDate ? 'text-red-500' : isHighlightedDay ? 'text-amber-700' : 'text-slate-500'}`}>{day.getDate()}</p>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 top-[42px] grid grid-rows-4 px-2 text-[9px] sm:top-[48px] sm:px-3 sm:text-[10px]">
                            {compactStatusRows.map((statusRow, index) => (
                              <div
                                key={statusRow?.key ?? `status-empty-${index}`}
                                className={`flex h-full items-center gap-1.5 ${
                                  index > 0 && compactStatusRows.slice(0, index).some(Boolean) && statusRow
                                    ? `border-t ${isHotDate ? 'border-red-200' : 'border-slate-200'}`
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
                    </>
                  )}
                </div>
            )}
          </div>
        )}

        {viewMode === 'calendar' && isCalendarActionsOpen ? (
          <>
            <div
              className="fixed inset-0 z-[70] bg-slate-900/35 sm:hidden"
              onClick={() => setIsCalendarActionsOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[71] rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-[0_-12px_36px_rgba(15,23,42,0.16)] sm:hidden">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setIsCalendarActionsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span>List View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('calendar');
                    setIsCalendarActionsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-700 transition"
                >
                  <span>Calendar View</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonth(new Date());
                    setIsCalendarActionsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span>Today</span>
                  <span className="text-xs text-slate-400">{formatMonthLabel(new Date())}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}

        {isInquiryOpen ? (
          <ModalShell
            title={editingOrder ? 'Edit inquiry' : 'Create inquiry'}
            eyebrow="Inquiry Form"
            onClose={() => {
              setIsInquiryOpen(false);
              setEditingOrder(null);
              setFormState(initialFormState);
              setCustomEventName('');
            }}
            widthClassName="max-w-5xl"
          >
            <div className="mt-6 space-y-5">
              <div>
                <Field label="Customer Name" required>
                  <div className="space-y-2">
                    <input
                      value={formState.customerName}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          customerName: event.target.value,
                        }))
                      }
                      disabled={isProtectedBookingEditLocked}
                      placeholder="Enter customer name"
                      className={`${inputCls} min-h-12 ${isProtectedBookingEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                    />
                    {isProtectedBookingEditLocked ? (
                      <p className="text-xs text-slate-500">{companyAdminOnlyEditMessage}</p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Mobile Number" required>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={formState.mobileNumber}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        mobileNumber: event.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    placeholder="Enter 10-digit mobile number"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
                <Field label="Service Slot" required>
                  <div className="space-y-2">
                    <select
                      value={formState.serviceSlot}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          serviceSlot: event.target.value,
                        }))
                      }
                      disabled={isServiceSlotLocked}
                      className={`${inputCls} min-h-12 ${isServiceSlotLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                    >
                      <option value="">Select service slot</option>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                    {isServiceSlotLocked ? (
                      <p className="text-xs text-slate-500">
                        {companyAdminOnlyEditMessage}
                      </p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event Name" required>
                  <div className="space-y-2">
                    <select
                      value={formState.eventName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFormState((current) => ({
                          ...current,
                          eventName: value,
                        }));
                        if (value !== EVENT_OTHER_VALUE) {
                          setCustomEventName('');
                        }
                      }}
                      disabled={isProtectedBookingEditLocked}
                      className={`${inputCls} min-h-12 ${isProtectedBookingEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                    >
                      <option value="">Select event option</option>
                      {eventChoices.map((option) => (
                        <option
                          key={option}
                          value={option === 'Other' ? EVENT_OTHER_VALUE : option}
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                    {isCustomEventSelected ? (
                      <input
                        value={customEventName}
                        onChange={(event) => setCustomEventName(event.target.value)}
                        disabled={isProtectedBookingEditLocked}
                        placeholder="Enter event name"
                        className={`${inputCls} min-h-12 ${isProtectedBookingEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                      />
                    ) : null}
                    {isProtectedBookingEditLocked ? (
                      <p className="text-xs text-slate-500">{companyAdminOnlyEditMessage}</p>
                    ) : null}
                  </div>
                </Field>
                <Field label="Function Date" required>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={formState.functionDate}
                      min={todayKey}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          functionDate: event.target.value,
                        }))
                      }
                      disabled={!editingOrder || isProtectedBookingEditLocked}
                      className={`${dateTimeInputCls} min-h-12 ${!editingOrder || isProtectedBookingEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                    />
                    {!editingOrder ? (
                      <p className="text-xs text-slate-500">
                        Function date is fixed from the selected calendar day while creating an inquiry.
                      </p>
                    ) : isProtectedBookingEditLocked ? (
                      <p className="text-xs text-slate-500">{companyAdminOnlyEditMessage}</p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Function Start Time" required>
                  <TimePicker
                    value={formState.startTime}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        startTime: value,
                      }))
                    }
                    disabled={isMenuSelectionDependentEditLocked}
                    hourPlaceholder="Hour"
                    minutePlaceholder="Min"
                  />
                  {isMenuSelectionDependentEditLocked ? (
                    <p className="mt-2 text-xs text-slate-500">{menuSelectionLockedEditMessage}</p>
                  ) : null}
                </Field>
                <Field label="Function End Time" required>
                  <TimePicker
                    value={formState.endTime}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        endTime: value,
                      }))
                    }
                    disabled={isMenuSelectionDependentEditLocked}
                    hourPlaceholder="Hour"
                    minutePlaceholder="Min"
                  />
                  {isMenuSelectionDependentEditLocked ? (
                    <p className="mt-2 text-xs text-slate-500">{menuSelectionLockedEditMessage}</p>
                  ) : null}
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="No Of Total Person" required>
                  <input
                    type="number"
                    min="1"
                    value={formState.totalPerson}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        totalPerson: event.target.value,
                      }))
                    }
                    placeholder="Enter total persons"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
                <Field label="Jain/Swaminarayan Person">
                  <input
                    type="number"
                    min="0"
                    value={formState.jainSwaminarayanPerson}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        jainSwaminarayanPerson: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Jain/Swaminarayan Details">
                  <input
                    value={formState.jainSwaminarayanDetails}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        jainSwaminarayanDetails: event.target.value,
                      }))
                    }
                    placeholder="Optional details"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
                <Field label="Seating Required Number">
                  <input
                    type="number"
                    min="0"
                    value={formState.seatingRequiredNumber}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        seatingRequiredNumber: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Hall Details" required>
                  <select
                    value={formState.hallDetails}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        hallDetails: event.target.value,
                      }))
                    }
                    className={`${inputCls} min-h-12`}
                  >
                    <option value="">Select hall details</option>
                    {hallDetailChoices.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference By">
                  <input
                    value={formState.referenceBy}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        referenceBy: event.target.value,
                      }))
                    }
                    placeholder="Optional reference"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Category">
                  <select
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        categoryId: event.target.value,
                        selectedMenus: [],
                      }))
                    }
                    className={`${inputCls} min-h-12`}
                  >
                    <option value="">Select category (optional)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({formatCurrency(category.pricePerPlate)})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Custom Price">
                  <div className="space-y-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={formState.inquiryCustomPrice}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          inquiryCustomPrice: event.target.value,
                        }))
                      }
                      disabled={isMenuSelectionDependentEditLocked}
                      placeholder="Optional custom price"
                      className={`${inputCls} min-h-12 ${isMenuSelectionDependentEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                    />
                    {isMenuSelectionDependentEditLocked ? (
                      <p className="text-xs text-slate-500">{menuSelectionLockedEditMessage}</p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <Field label="Addon Services">
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-300 bg-white p-3">
                    <select
                      value={selectedAddonOption}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedAddonOption(value);

                        if (!value || value === ADDON_OTHER_VALUE) {
                          return;
                        }

                        const selected = addonOptions.find((option) => option.id === value);
                        if (!selected) {
                          return;
                        }

                        setFormState((current) => ({
                          ...current,
                          addonEntries: [
                            ...current.addonEntries,
                            { id: selected.id, label: selected.label, price: '' },
                          ],
                        }));
                        setSelectedAddonOption('');
                      }}
                      className={`${inputCls} min-h-12`}
                    >
                      <option value="">Select addon service</option>
                      {availableAddonOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                      <option value={ADDON_OTHER_VALUE}>Other</option>
                    </select>

                    {selectedAddonOption === ADDON_OTHER_VALUE ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_auto]">
                        <input
                          value={customAddonLabel}
                          onChange={(e) => setCustomAddonLabel(e.target.value)}
                          placeholder="Addon service name"
                          className={`${inputCls} min-h-12`}
                        />
                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={customAddonPrice}
                          onChange={(e) => setCustomAddonPrice(e.target.value)}
                          placeholder="Price"
                          className={`${inputCls} min-h-12`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const label = customAddonLabel.trim();
                            if (!label || !customAddonPrice.trim()) {
                              setToast({
                                type: 'error',
                                message: 'Custom addon name and price are required.',
                              });
                              return;
                            }

                            const price = Number(customAddonPrice);
                            if (!Number.isFinite(price) || price < 0) {
                              setToast({
                                type: 'error',
                                message: 'Enter a valid custom addon price.',
                              });
                              return;
                            }

                            setFormState((current) => ({
                              ...current,
                              addonEntries: [
                                ...current.addonEntries,
                                { id: undefined, label, price: customAddonPrice },
                              ],
                            }));
                            setSelectedAddonOption('');
                            setCustomAddonLabel('');
                            setCustomAddonPrice('');
                          }}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {formState.addonEntries.length > 0 && (
                    <div className="space-y-1">
                      {formState.addonEntries.map((entry, index) => (
                        <div
                          key={entry.id ?? `custom-${index}`}
                          className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_auto]"
                        >
                          {entry.id === undefined ? (
                            <input
                              value={entry.label}
                              onChange={(event) =>
                                setFormState((current) => ({
                                  ...current,
                                  addonEntries: current.addonEntries.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, label: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="Addon service name"
                              className={`${inputCls} min-h-10`}
                            />
                          ) : (
                            <input
                              value={entry.label}
                              readOnly
                              className={`${inputCls} min-h-10 bg-slate-50`}
                            />
                          )}
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={entry.price}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                addonEntries: current.addonEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, price: event.target.value } : item,
                                ),
                              }))
                            }
                            placeholder="Price"
                            className={`${inputCls} min-h-10`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                addonEntries: current.addonEntries.filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <p className="text-xs text-slate-500">
                        Total addon charge: {formatCurrency(addonPrice)}
                      </p>
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Additional Information">
                <textarea
                  value={formState.additionalInformation}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      additionalInformation: event.target.value,
                    }))
                  }
                  placeholder="Optional additional information"
                  className={`${inputCls} min-h-36 resize-none`}
                />
              </Field>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Booking created by: <span className="font-semibold text-slate-900">{bookingCreatedBy}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsInquiryOpen(false);
                  setEditingOrder(null);
                  setFormState(initialFormState);
                  setCustomEventName('');
                  setSelectedAddonOption('');
                  setCustomAddonLabel('');
                  setCustomAddonPrice('');
                }}
                className={`${ghostButtonCls} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleCreateInquiry('INQUIRY')}
                isLoading={isSubmitting}
                className={`${primaryButtonCls} w-full sm:w-auto`}
              >
                {editingOrder ? 'Save inquiry' : 'Create inquiry'}
              </LoadingButton>
              {!editingOrder && (
                <LoadingButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleCreateInquiry('CONFIRMED')}
                  isLoading={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 sm:w-auto"
                >
                  Confirm Booking
                </LoadingButton>
              )}
            </div>
          </ModalShell>
        ) : null}

        {isWizardOpen ? (
          <ModalShell
            title="Choose category"
            eyebrow="Booking Category"
            onClose={resetWizard}
            widthClassName="max-w-5xl"
            scrollablePanel={false}
            panelClassName="flex h-[92vh] min-h-0 flex-col"
          >
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(145deg,#fffdf7,#ffffff)] p-3 shadow-sm sm:rounded-[24px] sm:p-4">
                <button
                  type="button"
                  onClick={() => toggleWizardHeaderSection('summary')}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                      Booking Setup
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
                      {formState.customerName || 'Customer'} · {selectedCategory?.name || 'Category'} ·{' '}
                      {formState.customPricePerPlate
                        ? formatCurrency(Number(formState.customPricePerPlate) || 0)
                        : 'Default price'}
                    </p>
                  </div>
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition ${wizardHeaderExpanded.summary ? 'rotate-180' : ''}`}>
                    <IconChevronDown />
                  </span>
                </button>

                {wizardHeaderExpanded.summary ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_1.4fr] lg:items-start">
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleWizardHeaderSection('customer')}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Customer
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 sm:text-lg">
                          {formState.customerName || 'Customer name'}
                        </p>
                      </div>
                      <span className={`shrink-0 text-slate-500 transition ${wizardHeaderExpanded.customer ? 'rotate-180' : ''}`}>
                        <IconChevronDown />
                      </span>
                    </button>
                    {wizardHeaderExpanded.customer ? (
                      <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4 sm:py-3">
                        <p>{formState.mobileNumber || 'No mobile number'}</p>
                        <p className="mt-1">{formState.functionDate || 'Function date pending'}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <div className="rounded-2xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleWizardHeaderSection('category')}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Category
                          </p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {selectedCategory
                              ? `${selectedCategory.name} (${formatCurrency(selectedCategory.pricePerPlate)})`
                              : 'Select category'}
                          </p>
                        </div>
                        <span className={`shrink-0 text-slate-500 transition ${wizardHeaderExpanded.category ? 'rotate-180' : ''}`}>
                          <IconChevronDown />
                        </span>
                      </button>
                      {wizardHeaderExpanded.category ? (
                        <div className="border-t border-slate-100 p-3 sm:p-4">
                          <div className="hidden sm:block">
                            <Field label="Category">
                              <select
                                value={formState.categoryId}
                                onChange={(event) =>
                                  {
                                    setSkippedRuleKeys([]);
                                    setExpandedRuleKeys([]);
                                    setFormState((current) => ({
                                      ...current,
                                      categoryId: event.target.value,
                                      selectedMenus: [],
                                    }));
                                  }
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
                              const selected = formState.categoryId === category.id;
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => {
                                    setSkippedRuleKeys([]);
                                    setExpandedRuleKeys([]);
                                    setFormState((current) => ({
                                      ...current,
                                      categoryId: category.id,
                                      selectedMenus: [],
                                    }));
                                    setWizardHeaderExpanded((current) => ({ ...current, category: false }));
                                  }}
                                  className={`min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                                    selected
                                      ? 'border-amber-300 bg-amber-50 text-slate-900'
                                      : 'border-slate-200 bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <p className="truncate text-sm font-semibold">{category.name}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{formatCurrency(category.pricePerPlate)}</p>
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
                        onClick={() => toggleWizardHeaderSection('price')}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Custom Price
                          </p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {formState.customPricePerPlate
                              ? formatCurrency(Number(formState.customPricePerPlate) || 0)
                              : 'Default'}
                          </p>
                        </div>
                        <span className={`shrink-0 text-slate-500 transition ${wizardHeaderExpanded.price ? 'rotate-180' : ''}`}>
                          <IconChevronDown />
                        </span>
                      </button>
                      {wizardHeaderExpanded.price ? (
                        <div className="border-t border-slate-100 p-3 sm:p-4">
                          <Field label="Custom Price">
                            <div className="space-y-2">
                              <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                placeholder="Custom price"
                                value={formState.customPricePerPlate}
                                onChange={(event) =>
                                  setFormState((current) => ({
                                    ...current,
                                    customPricePerPlate: event.target.value,
                                  }))
                                }
                                disabled={isMenuSelectionDependentEditLocked}
                                className={`${inputCls} ${isMenuSelectionDependentEditLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                              />
                              {isMenuSelectionDependentEditLocked ? (
                                <p className="text-xs text-slate-500">{menuSelectionLockedEditMessage}</p>
                              ) : null}
                            </div>
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
                  {orderedCategoryRules.length === 0 ? (
                    <EmptyState
                      title="No configured items for this category"
                      description="Edit the category and assign item rules before continuing."
                    />
                  ) : (
                    orderedCategoryRules.map((rule) => {
                      const skipped = isRuleSkipped(rule.menuId, rule.sectionTitle);
                      const showSingleLabel =
                        rule.menuTitle.trim().toLowerCase() ===
                        rule.sectionTitle.trim().toLowerCase();
                      const ruleKey = makeRuleKey(rule.menuId, rule.sectionTitle);
                      const searchValue = ruleSearches[ruleKey] ?? '';
                      const normalizedSearchValue = searchValue.trim().toLowerCase();
                      const filteredAllowedItems =
                        normalizedSearchValue.length >= 3
                          ? rule.allowedItems.filter((item) =>
                              item.toLowerCase().includes(normalizedSearchValue),
                            )
                          : rule.allowedItems;
                      const ruleDisplayOrder = resolveRuleDisplayOrder(
                        menus,
                        rule.menuId,
                        rule.menuTitle,
                        rule.sectionTitle,
                      );
                      const resolvedRuleDisplayOrder = rule.displayOrder ?? ruleDisplayOrder;
                      const expanded = isRuleExpanded(rule.menuId, rule.sectionTitle);
                      const selectedCount = selectedCountForRule(rule);

                      return (
                      <div
                        key={`${rule.menuId}-${rule.sectionTitle}`}
                        className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mb-4"
                      >
                        <button
                          type="button"
                          onClick={() => toggleRuleExpanded(rule.menuId, rule.sectionTitle)}
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
                          <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap sm:gap-2 sm:justify-end">
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
                                    setRuleSearches((current) => ({
                                      ...current,
                                      [ruleKey]: event.target.value,
                                    }))
                                  }
                                  placeholder="Search subitem"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-300 sm:px-4 sm:py-2.5"
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => toggleRuleSkipped(rule)}
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
                                  setAddonPopup({
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
                            <div className="mt-4">
                        {skipped ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            This item is skipped for this customer, so it will not block saving.
                          </div>
                        ) : (
                        <div className="grid gap-2 sm:gap-3">
                          <>
                            {normalizedSearchValue.length > 0 && normalizedSearchValue.length < 3 ? (
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
                          {(formState.selectedMenus
                            .find((m) => m.menuId === rule.menuId)
                            ?.sections.find((s) => s.sectionTitle === rule.sectionTitle)
                            ?.items.filter((i) => !rule.allowedItems.includes(i)) ?? []
                          ).map((addonItem) => (
                            <div
                              key={`addon-${rule.menuId}-${rule.sectionTitle}-${addonItem}`}
                              className="flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white px-3 py-2.5 text-sm shadow-sm sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500 bg-amber-500 text-white">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.6-3.6a1 1 0 111.415-1.42l2.893 2.894 6.493-6.494a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="flex-1 font-medium text-slate-900">{addonItem}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Add-on</span>
                              <button
                                type="button"
                                onClick={() => removeAddonItem(rule.menuId, rule.sectionTitle, addonItem)}
                                className="ml-1 text-slate-400 hover:text-red-500"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredAllowedItems.map((item) => {
                            const linkedMenu =
                              menuLookup.get(rule.menuId) ??
                              resolveMenuForRule(
                                menus,
                                rule.menuId,
                                rule.menuTitle,
                                rule.sectionTitle,
                              );
                            const isHotSelling = isHotSellingMenuItem(
                              linkedMenu,
                              rule.sectionTitle,
                              item,
                            );
                            const description = rule.allowedItemDescriptions?.find(
                              (entry) =>
                                normalizeMenuText(entry.name) === normalizeMenuText(item),
                            )?.description?.trim() || getMenuSubitemDescription(
                              linkedMenu,
                              rule.sectionTitle,
                              item,
                            ) || subitemDescriptionLookup.get(
                              `${rule.menuId}|${normalizeMenuText(rule.sectionTitle)}|${normalizeMenuText(item)}`,
                            ) || subitemDescriptionLookup.get(
                              `${normalizeMenuText(rule.menuTitle)}|${normalizeMenuText(rule.sectionTitle)}|${normalizeMenuText(item)}`,
                            ) || '';
                            const descriptionKey = `${rule.menuId}-${rule.sectionTitle}-${item}`;
                            const showDescription = subitemDescriptionKey === descriptionKey;
                            const checked = isItemSelected(
                              rule.menuId,
                              rule.sectionTitle,
                              item,
                            );
                            return (
                              <button
                                key={`${rule.menuId}-${rule.sectionTitle}-${item}`}
                                type="button"
                                onClick={() =>
                                  toggleMenuItem(
                                    rule,
                                    rule.sectionTitle,
                                    item,
                                    !checked,
                                  )
                                }
                                className={`relative flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 ${
                                  checked
                                    ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white text-slate-900 shadow-sm'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    checked
                                      ? 'border-amber-500 bg-amber-500 text-white'
                                      : 'border-slate-300 bg-white text-transparent'
                                  }`}
                                >
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.6-3.6a1 1 0 111.415-1.42l2.893 2.894 6.493-6.494a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </span>
                                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 font-medium sm:gap-2">
                                  {isHotSelling ? (
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600 sm:h-6 sm:w-6 sm:text-sm">
                                      🔥
                                    </span>
                                  ) : null}
                                  <span className="min-w-0 break-words leading-snug">{item}</span>
                                  {isHotSelling ? (
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-600 sm:px-2 sm:text-[10px] sm:tracking-[0.14em]">
                                      Hot Selling
                                    </span>
                                  ) : null}
                                </span>
                                {description ? (
                                  <span
                                    ref={showDescription ? subitemDescriptionPopoverRef : undefined}
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
                                          current === descriptionKey ? null : descriptionKey,
                                        );
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setSubitemDescriptionKey((current) =>
                                            current === descriptionKey ? null : descriptionKey,
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
                          {normalizedSearchValue.length >= 3 && filteredAllowedItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                              No subitems match this search.
                            </div>
                          ) : null}
                          </>
                        </div>
                        )}
                      </div>
                          </div>
                        ) : null}
                      </div>
                    );
                    })
                  )}
                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 sm:text-xs sm:tracking-[0.24em]">
                          Manual Entry
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-xl">
                          Custom Menu
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                          Add item and subitem manually. Example: item `Pizza`, subitem `Italian Pizza`.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomMenuPopup({
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
                            key={`custom-section-${section.sectionTitle}`}
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
                                onClick={() => removeCustomMenuSection(section.sectionTitle)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-4 sm:p-5">
                    <Field label="Menu Comment">
                      <textarea
                        rows={4}
                        value={formState.menuComment}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            menuComment: event.target.value,
                          }))
                        }
                        placeholder="Enter menu comment"
                        className={`${inputCls} min-h-[110px] resize-y`}
                      />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="safe-pad-bottom sticky bottom-0 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur sm:pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetWizard}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:rounded-2xl sm:py-3"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSaveBookingSelection()}
                    isLoading={isSubmitting}
                    className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60 sm:rounded-2xl sm:py-3"
                  >
                    Save category
                  </LoadingButton>
                </div>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {advancePopup ? (
          <ModalShell
            title={
              advancePopup.mode === 'new'
                ? 'Confirm booking'
                : `Convert ${advancePopup.order?.orderId} to booking`
            }
            eyebrow="Confirmation"
            onClose={() => { setAdvancePopup(null); pendingCreatePayload.current = null; }}
            widthClassName="max-w-md"
          >
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {advancePopup.mode === 'new'
                ? 'Enter the advance amount and payment mode to confirm this booking. Zero amount is allowed.'
                : 'Enter the advance amount, discount, and extra add-ons. Zero amount is allowed and the final payable balance is recalculated before confirmation.'}
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setIsAdvanceSubmitting(true);
                void handleConvertInquiry();
              }}
            >
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
                    setAdvancePopup(null);
                    setAdvanceRemark('');
                    pendingCreatePayload.current = null;
                  }}
                  className={ghostButtonCls}
                >
                  Cancel
                </button>
                {advancePopup?.mode === 'new' ? (
                  <LoadingButton
                    type="button"
                    disabled={isAdvanceSubmitting}
                    onClick={() => void handleSaveAsInquiry()}
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
          </ModalShell>
        ) : null}

        {cancelPopup ? (
          <ModalShell
            title={`Cancel ${cancelPopup.order.orderId}`}
            eyebrow="Cancel Booking"
            onClose={() => { setCancelPopup(null); setCancelledOrderId(null); }}
            widthClassName={cancelPopup.order.advanceAmount > 0 ? 'max-w-2xl' : 'max-w-md'}
          >
            <>
              <p className="mt-4 text-sm text-slate-500">
                {canUseAdvancedCancelManagement
                  ? 'Add the cancellation reason and confirm how the advance should be handled.'
                  : 'Confirm that you want to cancel this booking. It will be listed in Cancelled Bookings.'}
              </p>
              {canUseAdvancedCancelManagement ? (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Cancellation Reason</label>
                  <textarea
                    value={cancelPopup.reason}
                    onChange={(event) =>
                      setCancelPopup((current) =>
                        current ? { ...current, reason: event.target.value } : current,
                      )
                    }
                    placeholder="Enter cancellation reason"
                    className={`${inputCls} min-h-24 resize-none`}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  This action will move <span className="font-semibold">{cancelPopup.order.orderId}</span> to Cancelled Bookings.
                </div>
              )}

              {canUseAdvancedCancelManagement && cancelPopup.order.advanceAmount > 0 ? (
                <>
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Advance amount to manage: <span className="font-semibold">{formatCurrency(cancelPopup.order.advanceAmount)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: 'DINE_IN', label: 'Dine In', desc: 'Customer uses advance for dining', color: 'emerald' },
                      { value: 'PAY_BACK', label: 'Pay Back', desc: 'Refund advance to customer', color: 'blue' },
                      { value: 'NEXT_BOOKING', label: 'Next Booking', desc: 'Apply to a future booking', color: 'violet' },
                      { value: 'NO_PAY_BACK', label: 'No Pay Back', desc: 'Amount forfeited immediately', color: 'red' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCancelPopup((c) => c ? { ...c, advanceOption: opt.value, expiryMonths: null, expiryCustomDate: '', paybackMode: null } : c)}
                      className={`rounded-xl border-2 p-4 text-left transition ${
                        cancelPopup.advanceOption === opt.value
                          ? opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                          : opt.color === 'blue' ? 'border-blue-500 bg-blue-50'
                          : opt.color === 'violet' ? 'border-violet-500 bg-violet-50'
                          : 'border-red-500 bg-red-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${
                        cancelPopup.advanceOption === opt.value
                          ? opt.color === 'emerald' ? 'text-emerald-700'
                          : opt.color === 'blue' ? 'text-blue-700'
                          : opt.color === 'violet' ? 'text-violet-700'
                          : 'text-red-700'
                          : 'text-slate-800'
                      }`}>{opt.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
                    </button>
                  ))}
                  </div>
                  {(cancelPopup.advanceOption === 'DINE_IN' || cancelPopup.advanceOption === 'NEXT_BOOKING') && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valid for (choose expiry)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[1, 3, 6, 9, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setCancelPopup((c) => c ? { ...c, expiryMonths: m, expiryCustomDate: '' } : c)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              cancelPopup.expiryMonths === m && !cancelPopup.expiryCustomDate
                                ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {m} {m === 1 ? 'Month' : 'Months'}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCancelPopup((c) => c ? { ...c, expiryMonths: null, expiryCustomDate: c.expiryCustomDate || new Date().toISOString().split('T')[0] } : c)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            cancelPopup.expiryCustomDate
                              ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Custom Date
                        </button>
                      </div>
                      {!cancelPopup.expiryMonths && (
                        <input
                          type="date"
                          value={cancelPopup.expiryCustomDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setCancelPopup((c) => c ? { ...c, expiryCustomDate: e.target.value } : c)}
                          className={`${inputCls} mt-3`}
                        />
                      )}
                    </div>
                  )}

                  {cancelPopup.advanceOption === 'PAY_BACK' && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Advance Payment Details
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="px-3 py-2 font-medium">Date</th>
                              <th className="px-3 py-2 font-medium">Amount</th>
                              <th className="px-3 py-2 font-medium">Mode</th>
                              <th className="px-3 py-2 font-medium">Recorded By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cancelPopup.order.advancePayments.map((payment) => (
                              <tr key={payment.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-3 py-2 text-slate-700">{formatFollowUpDate(payment.date)}</td>
                                <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                                <td className="px-3 py-2 text-slate-700">{payment.paymentMode}</td>
                                <td className="px-3 py-2 text-slate-700">{payment.recordedByName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Pay back entries will be recorded immediately using the original advance payment modes.
                      </p>
                    </div>
                  )}

                  {cancelPopup.advanceOption === 'NO_PAY_BACK' && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-700">
                        <span className="font-semibold">{formatCurrency(cancelPopup.order.advanceAmount)}</span> will be marked as{' '}
                        <span className="font-semibold">Forfeited Advance</span> immediately. This cannot be undone.
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCancelPopup(null)}
                  className={ghostButtonCls}
                >
                  Close
                </button>
                <div className="flex gap-3">
                  {cancelledOrderId ? (
                    <Link
                      href={canUseAdvancedCancelManagement ? '/customer-wallet' : '/cancelled-bookings'}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      onClick={() => setCancelPopup(null)}
                    >
                      {canUseAdvancedCancelManagement ? 'View in Customer Wallet →' : 'View in Cancelled Bookings →'}
                    </Link>
                  ) : null}
                  <LoadingButton
                    type="button"
                    disabled={
                      isCancelSubmitting ||
                      (canUseAdvancedCancelManagement && !cancelPopup.reason.trim()) ||
                      (canUseAdvancedCancelManagement &&
                        cancelPopup.order.advanceAmount > 0 &&
                        (!cancelPopup.advanceOption ||
                          ((cancelPopup.advanceOption === 'DINE_IN' || cancelPopup.advanceOption === 'NEXT_BOOKING') &&
                            !cancelPopup.expiryMonths && !cancelPopup.expiryCustomDate)))
                    }
                    onClick={async () => {
                      await handleCancel(
                        cancelPopup.order.id,
                        cancelPopup.reason,
                        cancelPopup.order.advanceAmount > 0 ? cancelPopup.advanceOption : undefined,
                        cancelPopup.expiryMonths,
                        cancelPopup.expiryCustomDate,
                        cancelPopup.paybackMode,
                      );
                      if (cancelPopup.order.advanceAmount > 0 && cancelPopup.advanceOption) {
                        setCancelledOrderId(cancelPopup.order.id);
                      }
                      setCancelPopup(null);
                    }}
                    isLoading={isCancelSubmitting}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Confirm Cancel
                  </LoadingButton>
                </div>
              </div>
            </>
          </ModalShell>
        ) : null}

        {deletePopup ? (
          <ModalShell
            title={`Delete ${deletePopup.orderId}`}
            eyebrow="Delete Inquiry"
            onClose={() => setDeletePopup(null)}
            widthClassName="max-w-md"
          >
            <p className="mt-4 text-sm text-slate-500">
              This will permanently delete the inquiry record.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletePopup(null)}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                disabled={isDeleteSubmitting}
                onClick={() => void handleDelete(deletePopup.id)}
                isLoading={isDeleteSubmitting}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete inquiry
              </LoadingButton>
            </div>
          </ModalShell>
        ) : null}

        {followUpPopup ? (
          <ModalShell
            title="Add follow up"
            eyebrow="Follow Ups"
            onClose={() => setFollowUpPopup(null)}
            widthClassName="max-w-3xl"
            zIndexClassName="z-[80]"
          >
            <div className="mt-6 space-y-5">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {followUpPopup.orderName}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date">
                  <input
                    type="date"
                    value={followUpPopup.date}
                    onChange={(event) =>
                      setFollowUpPopup((current) =>
                        current ? { ...current, date: event.target.value } : current,
                      )
                    }
                    className={`${dateTimeInputCls} min-h-12`}
                  />
                </Field>
                <Field label="Next Follow Up Date">
                  <input
                    type="date"
                    value={followUpPopup.nextFollowUpDate}
                    onChange={(event) =>
                      setFollowUpPopup((current) =>
                        current ? { ...current, nextFollowUpDate: event.target.value } : current,
                      )
                    }
                    className={`${dateTimeInputCls} min-h-12`}
                  />
                </Field>
              </div>
              <Field label="Note">
                <textarea
                  value={followUpPopup.note}
                  onChange={(event) =>
                    setFollowUpPopup((current) =>
                      current ? { ...current, note: event.target.value } : current,
                    )
                  }
                  placeholder="Add follow up note"
                  className={`${inputCls} min-h-32 resize-none`}
                />
              </Field>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Set the next follow up date to keep today’s dashboard follow up list accurate.
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={followUpPopup.closeInquiry}
                  onChange={(event) =>
                    setFollowUpPopup((current) =>
                      current ? { ...current, closeInquiry: event.target.checked } : current,
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500"
                />
                <span>Close inquiry after saving this follow up</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFollowUpPopup(null)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="button"
                  onClick={() => void handleAddFollowUp()}
                  disabled={isFollowUpSubmitting}
                  isLoading={isFollowUpSubmitting}
                  className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Save follow up
                </LoadingButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {signaturePopup ? (
          <ModalShell
            title={signaturePopup.order.activeSignature ? 'Re-sign booking' : 'Sign booking'}
            eyebrow="Digital Signature"
            onClose={() => setSignaturePopup(null)}
            widthClassName="max-w-3xl"
            zIndexClassName="z-[90]"
          >
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    'Date',
                    signaturePopup.order.eventDate
                      ? formatDisplayDate(signaturePopup.order.eventDate)
                      : 'Date pending',
                  ],
                  ['Slot', signaturePopup.order.serviceSlot || 'Slot pending'],
                  [
                    'Time',
                    signaturePopup.order.startTime && signaturePopup.order.endTime
                      ? formatTimeRange(signaturePopup.order.startTime, signaturePopup.order.endTime)
                      : 'Time pending',
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
                  This booking was signed on{' '}
                  {formatFollowUpDate(signaturePopup.order.activeSignature.signedAt)} by{' '}
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
          </ModalShell>
        ) : null}

        {transferPopup ? (
          <ModalShell
            title={`Transfer ${transferPopup.status === 'CONFIRMED' ? 'Booking' : 'Inquiry'}`}
            eyebrow="Transfer"
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
                  {transferPopup.orderName}
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
                  <TimePicker
                    value={transferPopup.startTime}
                    onChange={(value) =>
                      setTransferPopup((current) =>
                        current ? { ...current, startTime: value } : current,
                      )
                    }
                  />
                </Field>
                <Field label="End Time">
                  <TimePicker
                    value={transferPopup.endTime}
                    onChange={(value) =>
                      setTransferPopup((current) =>
                        current ? { ...current, endTime: value } : current,
                      )
                    }
                  />
                </Field>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This transfers the entire {transferPopup.status === 'CONFIRMED' ? 'booking' : 'inquiry'} to another date. Service slot and timing can also be updated here.
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
                  onClick={() => void handleTransferBooking()}
                  disabled={isTransferSubmitting}
                  isLoading={isTransferSubmitting}
                  className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Transfer
                </LoadingButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {paymentPopup ? (
          <ModalShell
            title={paymentEditor?.paymentId ? 'Edit Payment' : 'Record Payment'}
            eyebrow="Advance Payment"
            onClose={() => {
              setPaymentPopup(null);
              setPaymentAmount('');
              setPaymentPopupMode(defaultPaymentMode);
              setPaymentRemark('');
              setPaymentEditor(null);
            }}
            widthClassName="max-w-md"
            zIndexClassName="z-[60]"
          >
            <div className="mt-6 space-y-4">
              <Field label="Amount">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Payment Mode">
                <select
                  value={paymentPopupMode}
                  onChange={(e) => setPaymentPopupMode(e.target.value as PaymentMode)}
                  className={inputCls}
                >
                  {popupPaymentModeChoices.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Remarks">
                <textarea
                  value={paymentRemark}
                  onChange={(e) => setPaymentRemark(e.target.value)}
                  placeholder="Add remarks if needed"
                  className={`${inputCls} min-h-24 resize-none`}
                />
              </Field>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setPaymentPopup(null);
                  setPaymentAmount('');
                  setPaymentPopupMode(defaultPaymentMode);
                  setPaymentRemark('');
                  setPaymentEditor(null);
                }}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                disabled={isPaymentSubmitting}
                onClick={() =>
                  void (paymentEditor?.paymentId
                    ? handleSaveAdvancePayment()
                    : handleAddAdvancePayment())
                }
                isLoading={isPaymentSubmitting}
                className={primaryButtonCls}
              >
                {paymentEditor?.paymentId ? 'Save payment' : 'Record payment'}
              </LoadingButton>
            </div>
          </ModalShell>
        ) : null}

        {addonPopup ? (
          <ModalShell
            title={`Add-on — ${addonPopup.sectionTitle}`}
            eyebrow="Custom Add-on"
            onClose={() => setAddonPopup(null)}
            widthClassName="max-w-md"
            zIndexClassName="z-[70]"
          >
            <p className="mt-4 text-sm text-slate-500">
              Type a custom item to add to this section alongside the existing selections.
            </p>
            <div className="mt-5">
              <Field label="Item name">
                <input
                  type="text"
                  value={addonPopup.value}
                  onChange={(e) =>
                    setAddonPopup((cur) => cur ? { ...cur, value: e.target.value.toUpperCase() } : cur)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAddonItem(addonPopup.menuId, addonPopup.menuTitle, addonPopup.sectionTitle, addonPopup.value);
                      setAddonPopup(null);
                    }
                  }}
                  placeholder="e.g. Jain Biryani"
                  className={`${inputCls} uppercase`}
                  autoFocus
                />
              </Field>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAddonPopup(null)}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  addAddonItem(addonPopup.menuId, addonPopup.menuTitle, addonPopup.sectionTitle, addonPopup.value);
                  setAddonPopup(null);
                }}
                className={primaryButtonCls}
              >
                Add item
              </button>
            </div>
          </ModalShell>
        ) : null}

        {customMenuPopup ? (
          <ModalShell
            title="Add custom menu"
            eyebrow="Manual Entry"
            onClose={() => setCustomMenuPopup(null)}
            widthClassName="max-w-md"
            zIndexClassName="z-[70]"
          >
            <p className="mt-4 text-sm text-slate-500">
              Add a manual item and its subitem(s). This does not require selection from the configured list.
            </p>
            <div className="mt-5 space-y-4">
              <Field label="Item name">
                <input
                  type="text"
                  value={customMenuPopup.sectionTitle}
                  onChange={(event) =>
                    setCustomMenuPopup((current) =>
                      current
                        ? { ...current, sectionTitle: event.target.value }
                        : current,
                    )
                  }
                  placeholder="e.g. Pizza"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Subitem name">
                <textarea
                  value={customMenuPopup.itemsText}
                  onChange={(event) =>
                    setCustomMenuPopup((current) =>
                      current
                        ? { ...current, itemsText: event.target.value }
                        : current,
                    )
                  }
                  placeholder="e.g. Italian Pizza"
                  className={`${inputCls} min-h-24 resize-none`}
                />
              </Field>
              <p className="text-xs text-slate-500">
                Use a new line or comma to add multiple subitems.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCustomMenuPopup(null)}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const items = parseCustomMenuItems(customMenuPopup.itemsText);

                  if (!customMenuPopup.sectionTitle.trim() || items.length === 0) {
                    setToast({
                      type: 'error',
                      message: 'Custom item and at least one subitem are required.',
                    });
                    return;
                  }

                  addCustomMenuEntry(customMenuPopup.sectionTitle, items);
                  setCustomMenuPopup(null);
                }}
                className={primaryButtonCls}
              >
                Add custom menu
              </button>
            </div>
          </ModalShell>
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
                    {formatDisplayDate(dayRecordsPopup.dateKey)}
                  </h3>
                  <p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 shadow-sm">
                    {dayRecordsPopup.orders.length} booking{dayRecordsPopup.orders.length === 1 ? '' : 's'}
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
                  onClick={() => {
                    setDayRecordsPopup(null);
                    openCreateInquiry({ functionDate: dayRecordsPopup.dateKey });
                  }}
                  className={`${primaryButtonCls} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40`}
                  title={dayRecordsPopup.dateKey < todayKey ? 'Cannot add booking for a past date' : undefined}
                >
                  Add booking
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="space-y-3">
                  {(() => {
                      const sortedOrders = [...dayRecordsPopup.orders].sort((a, b) => {
                        const statusOrder: Record<string, number> = { CONFIRMED: 0, INQUIRY: 1, CANCELLED: 2 };
                        const slotOrder: Record<string, number> = { Breakfast: 0, Lunch: 1, Dinner: 2 };
                        const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
                        if (statusDiff !== 0) return statusDiff;
                        return (slotOrder[a.serviceSlot ?? ''] ?? 9) - (slotOrder[b.serviceSlot ?? ''] ?? 9);
                      });
                      const hallSlotMatrix = buildDayHallSlotMatrix(sortedOrders, hallDetailOptions);

                      return (
                        <>
                          {showHallBookingInformation && hallSlotMatrix.halls.length > 0 ? (
                            <div className="border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Hall Slot Status</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Only confirmed bookings are shown here.
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    Booked
                                  </span>
                                </div>
                              </div>
                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full border-collapse text-left text-sm">
                                  <thead>
                                    <tr>
                                      <th className="border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Slot
                                      </th>
                                      {hallSlotMatrix.halls.map((hall) => (
                                        <th
                                          key={hall}
                                          className="border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                                        >
                                          {hall}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {hallSlotMatrix.slots.map((slot) => (
                                      <tr key={slot}>
                                        <td className="border border-slate-200 bg-white px-3 py-3 font-medium text-slate-900">
                                          {slot}
                                        </td>
                                        {hallSlotMatrix.halls.map((hall) => {
                                          const status = hallSlotMatrix.cellMap.get(`${hall}::${slot}`);
                                          return (
                                            <td key={`${slot}-${hall}`} className="border border-slate-200 bg-white px-3 py-3 text-center">
                                              {status ? (
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                                  ✓
                                                </span>
                                              ) : (
                                                <span className="text-slate-300">-</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                          {sortedOrders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                              No bookings for this day.
                            </div>
                          ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                              {sortedOrders.map((calendarOrder) => {
                        const cardCls =
                          calendarOrder.status === 'INQUIRY' && calendarOrder.inquiryClosed
                            ? 'border-slate-400 bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.12)]'
                            : calendarOrder.status === 'CONFIRMED'
                            ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]'
                            : calendarOrder.status === 'INQUIRY'
                              ? 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]'
                              : 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
                        const showMenuStatus = !['INQUIRY', 'CANCELLED'].includes(calendarOrder.status);
                        return (
                          <button
                            type="button"
                            key={`popup-${calendarOrder.id}`}
                            onClick={() => {
                              setDayRecordsPopup(null);
                              void openOrderDetail(calendarOrder.id);
                            }}
                            className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200 ${cardCls}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">{calendarOrder.customerName}</p>
                                <p className="mt-1 text-sm text-slate-600">{calendarOrder.functionName}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatTimeRange(calendarOrder.startTime, calendarOrder.endTime)} • {calendarOrder.pax} pax
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-900">
                                  Inquiry Date:{' '}
                                  {calendarOrder.inquiryDate
                                    ? formatDisplayDate(calendarOrder.inquiryDate)
                                    : 'Inquiry date pending'}
                                </p>
                                {calendarOrder.serviceSlot ? (
                                  <p className="mt-1 text-xs font-semibold text-slate-900">
                                    Service Slot: {calendarOrder.serviceSlot}
                                  </p>
                                ) : null}
                                {calendarOrder.hallDetails ? (
                                  <p className="mt-1 text-xs font-semibold text-slate-900">
                                    Hall Details: {calendarOrder.hallDetails}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(
                                    calendarOrder.status,
                                    calendarOrder.inquiryClosed,
                                  )}`}
                                >
                                  {calendarOrder.inquiryClosed ? 'CLOSED INQUIRY' : calendarOrder.status}
                                </span>
                                {showMenuStatus ? (
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${
                                      calendarOrder.hasMenuSelection
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    {calendarOrder.hasMenuSelection ? 'Menu Selected' : 'Menu Pending'}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                </div>
              </div>
            </aside>
          </>
        ) : null}

        {printTagPopup ? (
          <ModalShell
            title="Print Tag"
            eyebrow="Selected Items"
            onClose={() => setPrintTagPopup(null)}
            widthClassName="max-w-3xl"
            zIndexClassName="z-[60]"
          >
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {printTagPopup.order.orderId}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {printTagPopup.selectedIds.length} of {printTagPopup.items.length} item
                      {printTagPopup.items.length === 1 ? '' : 's'} selected
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTagPopup((current) =>
                          current
                            ? {
                                ...current,
                                selectedIds: current.items.map((item) => item.id),
                              }
                            : current,
                        )
                      }
                      className={ghostButtonCls}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTagPopup((current) =>
                          current ? { ...current, selectedIds: [] } : current,
                        )
                      }
                      className={ghostButtonCls}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
                {Array.from(
                  printTagPopup.items.reduce((groups, item) => {
                    const key = `${item.menuTitle}::${item.sectionTitle}`;
                    const existing = groups.get(key);
                    if (existing) {
                      existing.items.push(item);
                    } else {
                      groups.set(key, {
                        menuTitle: item.menuTitle,
                        sectionTitle: item.sectionTitle,
                        items: [item],
                      });
                    }
                    return groups;
                  }, new Map<string, { menuTitle: string; sectionTitle: string; items: PrintTagItem[] }>()),
                ).map(([key, group]) => (
                  <section key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {group.menuTitle}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {group.sectionTitle}
                      </h3>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {group.items.map((item) => {
                        const checked = printTagPopup.selectedIds.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                              checked
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const isChecked = event.target.checked;
                                setPrintTagPopup((current) => {
                                  if (!current) return current;
                                  const selectedIds = isChecked
                                    ? [...current.selectedIds, item.id]
                                    : current.selectedIds.filter((id) => id !== item.id);
                                  return { ...current, selectedIds };
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                            />
                            <span className="min-w-0 flex-1 font-medium">
                              {item.itemName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPrintTagPopup(null)}
                  className={ghostButtonCls}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={printTagPopup.selectedIds.length === 0}
                  onClick={() => {
                    const params = new URLSearchParams({
                      id: printTagPopup.order.id,
                      items: printTagPopup.selectedIds.join('|'),
                    });
                    window.open(`/print/tags?${params.toString()}`, '_blank', 'noopener,noreferrer');
                  }}
                  className={`${primaryButtonCls} disabled:cursor-not-allowed`}
                >
                  Print
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {isDetailOpen ? (
          <ModalShell
            title="Event Detail"
            eyebrow=""
            onClose={() => {
              setIsDetailOpen(false);
              setDetailOrder(null);
              setDetailError('');
              setIsMobileDetailActionsOpen(false);
              setPrintTagPopup(null);
            }}
            widthClassName="max-w-4xl"
            panelClassName="flex flex-col !pb-0"
            scrollablePanel={false}
          >
            {isDetailLoading && !detailOrder ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                Loading booking details…
              </div>
            ) : detailError ? (
              <EmptyState title="Unable to open booking" description={detailError} />
            ) : detailOrder ? (
              <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pb-5 pr-1">
                {(() => {
                  const menuStatus = selectionStatus(detailOrder);
                  const payoutEntries = detailOrder.cancelAdvanceManagement?.payoutEntries ?? [];
                  const reversedByPaymentId = payoutEntries.reduce<Record<string, number>>((accumulator, entry) => {
                    if (entry.sourcePaymentId) {
                      accumulator[entry.sourcePaymentId] = (accumulator[entry.sourcePaymentId] ?? 0) + entry.amount;
                    }
                    return accumulator;
                  }, {});
                  const legacyReversedByMode = payoutEntries.reduce<Record<string, number>>((accumulator, entry) => {
                    if (entry.sourcePaymentId) {
                      return accumulator;
                    }
                    accumulator[entry.mode] = (accumulator[entry.mode] ?? 0) + entry.amount;
                    return accumulator;
                  }, {});

                  return (
                    <>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                      detailOrder.status,
                      detailOrder.inquiryClosed,
                    )}`}
                  >
                    {detailOrder.inquiryClosed ? 'CLOSED INQUIRY' : detailOrder.status}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${menuStatus.className}`}
                  >
                    {menuStatus.label}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inquiry Details</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {detailOrder.functionName || 'Booking details pending'}
                        </p>
                      </div>
                      <div className="min-w-[180px] rounded-xl bg-slate-50 px-3 py-2 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Package</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {detailOrder.categorySnapshot?.name ||
                            (detailOrder.inquiryCustomPrice !== null
                              ? 'Custom Price'
                              : 'Package pending')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ['Customer', `${detailOrder.customer.firstName} ${detailOrder.customer.lastName}`],
                        ['Mobile', detailOrder.customer.phone],
                        [
                          'Inquiry Date',
                          detailOrder.inquiryDate
                            ? formatDisplayDate(detailOrder.inquiryDate)
                            : 'Inquiry date pending',
                        ],
                        [
                          'Event Date',
                          detailOrder.eventDate
                            ? formatDisplayDate(detailOrder.eventDate)
                            : 'Date pending',
                        ],
                        [
                          'Time',
                          detailOrder.startTime && detailOrder.endTime
                            ? formatTimeRange(detailOrder.startTime, detailOrder.endTime)
                            : 'Time pending',
                        ],
                        ['Service Slot', detailOrder.serviceSlot || 'Service slot pending'],
                        ['Hall', detailOrder.hallDetails || 'Hall details pending'],
                        ['Jain/Swaminarayan', `${detailOrder.jainSwaminarayanPax ?? 'Pending'}`],
                        ['PAX', `${detailOrder.pax ?? 0}`],
                        [
                          'Price',
                          formatCurrency(
                            detailOrder.customPricePerPlate !== null
                              ? detailOrder.customPricePerPlate
                              : detailOrder.inquiryCustomPrice !== null
                                ? detailOrder.inquiryCustomPrice
                              : detailOrder.pricePerPlate,
                          ),
                        ],
                        ...(detailOrder.referenceBy ? [['Reference', detailOrder.referenceBy]] : []),
                        ...(detailOrder.confirmedAt
                          ? [['Confirmed', formatFollowUpDate(detailOrder.confirmedAt)]]
                          : []),
                        ['Created By', detailOrder.bookingTakenBy || 'N/A'],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    {detailOrder.addonServiceSnapshots.length > 0 ? (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-500">Addons: </span>
                        {detailOrder.addonServiceSnapshots
                          .map(
                            (item) =>
                              `${item.label} (${formatCurrency(item.price)})`,
                          )
                          .join(', ')}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                        detailOrder.menuSelectionSnapshot.map((menu) => {
                          return (
                            <div
                              key={menu.menuId}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                            >
                              <h3 className="text-sm font-semibold text-slate-900">{menu.title}</h3>
                              <div className="mt-2 grid gap-x-4 gap-y-2 text-sm text-slate-700 xl:grid-cols-2">
                                {menu.sections.map((section) => (
                                  <div
                                    key={`${menu.menuId}-${section.sectionTitle}`}
                                    className="min-w-0"
                                  >
                                    {section.sectionTitle.trim().toLowerCase() !==
                                    menu.title.trim().toLowerCase() ? (
                                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        {section.sectionTitle}
                                      </p>
                                    ) : null}
                                    <p className="mt-0.5 leading-5">{section.items.join(', ')}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {detailOrder.menuComment ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Menu Comment
                      </p>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {detailOrder.menuComment}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <div className="space-y-4">
                    {detailOrder.additionalInformation || detailOrder.notes ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Additional Information
                        </p>
                        {detailOrder.additionalInformation ? (
                          <p className="mt-4 text-sm leading-7 text-slate-700">
                            {detailOrder.additionalInformation}
                          </p>
                        ) : null}
                        {detailOrder.notes && detailOrder.notes !== detailOrder.additionalInformation ? (
                          <p className="mt-4 text-sm leading-7 text-slate-700">
                            {detailOrder.notes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {detailOrder.status === 'CONFIRMED' ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Event Planner
                        </p>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <select
                                value={selectedEventPlanner}
                                onChange={(event) => setSelectedEventPlanner(event.target.value)}
                                className={inputCls}
                              >
                                <option value="">Select event planner</option>
                                {(settings?.eventPlanners ?? []).map((planner) => (
                                  <option key={planner.id} value={planner.label}>
                                    {planner.label}
                                  </option>
                                ))}
                              </select>
                              <LoadingButton
                                type="button"
                                disabled={
                                  isAssigningEventPlanner ||
                                  !selectedEventPlanner.trim() ||
                                  selectedEventPlanner ===
                                    (detailOrder.currentEventPlanner?.plannerName ?? '')
                                }
                                isLoading={isAssigningEventPlanner}
                                onClick={() => void handleAssignEventPlanner()}
                                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                              >
                                Assign planner
                              </LoadingButton>
                            </div>
                            {detailOrder.currentEventPlanner ? (
                              <p className="text-sm text-slate-600">
                                Current planner: <span className="font-semibold text-slate-900">{detailOrder.currentEventPlanner.plannerName}</span>{' '}
                                on {formatFollowUpDate(detailOrder.currentEventPlanner.assignedAt)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {detailOrder.cancelReason ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Cancel reason: {detailOrder.cancelReason}
                  </p>
                ) : null}
                {(detailOrder.status === 'CONFIRMED' || detailOrder.status === 'CANCELLED') && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Advance Payments
                      </p>
                    </div>
                    {(!detailOrder.advancePayments || detailOrder.advancePayments.length === 0) ? (
                      <p className="mt-4 text-sm text-slate-500">No advance payments recorded yet.</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-amber-200 text-slate-500">
                              <th className="px-3 py-2 font-medium">Date</th>
                              <th className="px-3 py-2 font-medium">Amount</th>
                              <th className="px-3 py-2 font-medium">Mode</th>
                              {detailOrder.status === 'CANCELLED' ? (
                                <th className="px-3 py-2 font-medium">Reversed</th>
                              ) : null}
                              <th className="px-3 py-2 font-medium">Remarks</th>
                              <th className="px-3 py-2 font-medium">Recorded By</th>
                              {isCompanyAdmin ? (
                                <th className="px-3 py-2 font-medium text-right">Actions</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {[...detailOrder.advancePayments]
                              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                              .map((payment) => {
                                const reversedForPayment = reversedByPaymentId[payment.id] ?? 0;
                                const legacyReversedForMode = legacyReversedByMode[payment.paymentMode] ?? 0;
                                const reversedForRow = Math.min(
                                  payment.amount,
                                  reversedForPayment + legacyReversedForMode,
                                );
                                const reversibleAmount = Math.min(
                                  Math.max(payment.amount - reversedForRow, 0),
                                  detailOrder.cancelAdvanceManagement?.remainingBalance ?? 0,
                                );
                                const canReverse =
                                  isCompanyAdmin &&
                                  detailOrder.status === 'CANCELLED' &&
                                  detailOrder.cancelAdvanceManagement?.option === 'PAY_BACK' &&
                                  detailOrder.cancelAdvanceManagement.status === 'ACTIVE' &&
                                  reversibleAmount > 0;

                                return (
                                  <tr key={payment.id} className="border-b border-amber-100 last:border-b-0">
                                    <td className="px-3 py-3 text-slate-700">{formatFollowUpDate(payment.date)}</td>
                                    <td className="px-3 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                                    <td className="px-3 py-3 text-slate-700">{payment.paymentMode}</td>
                                    {detailOrder.status === 'CANCELLED' ? (
                                      <td className="px-3 py-3 text-slate-700">
                                        {reversedForRow > 0 ? formatCurrency(reversedForRow) : '-'}
                                      </td>
                                    ) : null}
                                    <td className="px-3 py-3 text-slate-700">{payment.remark || '-'}</td>
                                    <td className="px-3 py-3 text-slate-700">{payment.recordedByName}</td>
                                    {isCompanyAdmin && detailOrder.status === 'CONFIRMED' ? (
                                    <td className="px-3 py-3">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPaymentAmount(String(payment.amount));
                                            setPaymentPopupMode(payment.paymentMode);
                                            setPaymentRemark(payment.remark ?? '');
                                            setPaymentEditor({
                                              orderId: detailOrder.id,
                                              paymentId: payment.id,
                                            });
                                            setPaymentPopup({ orderId: detailOrder.id });
                                          }}
                                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleDeleteAdvancePayment(detailOrder.id, payment.id)
                                          }
                                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                    ) : isCompanyAdmin ? (
                                      <td className="px-3 py-3 text-right">
                                        {canReverse ? (
                                          <LoadingButton
                                            type="button"
                                            disabled={reversingPaymentId === payment.id}
                                            isLoading={reversingPaymentId === payment.id}
                                            onClick={() => void handleReverseAdvancePayment(detailOrder, payment.id)}
                                            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                                          >
                                            Reverse {formatCurrency(reversibleAmount)}
                                          </LoadingButton>
                                        ) : (
                                          <span className="text-xs text-slate-400">-</span>
                                        )}
                                      </td>
                                    ) : null}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {detailOrder.status === 'CANCELLED' &&
                    detailOrder.cancelAdvanceManagement?.option === 'PAY_BACK' &&
                    payoutEntries.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                          Pay Back Reversals
                        </p>
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-blue-100 text-blue-700">
                                <th className="px-3 py-2 font-medium">Date</th>
                                <th className="px-3 py-2 font-medium">Amount</th>
                                <th className="px-3 py-2 font-medium">Mode</th>
                                <th className="px-3 py-2 font-medium">Note</th>
                                <th className="px-3 py-2 font-medium">Processed By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payoutEntries.map((entry, index) => (
                                <tr key={`${entry.createdAt}-${index}`} className="border-b border-blue-100 last:border-b-0">
                                  <td className="px-3 py-2 text-slate-700">{formatFollowUpDate(entry.date)}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(entry.amount)}</td>
                                  <td className="px-3 py-2 text-slate-700">{entry.mode}</td>
                                  <td className="px-3 py-2 text-slate-700">{entry.note || '-'}</td>
                                  <td className="px-3 py-2 text-slate-700">{entry.processedByName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between border-t border-amber-200 pt-4 text-sm font-semibold text-slate-900">
                      <span>Total Advance Paid</span>
                      <span>{formatCurrency(detailOrder.advanceAmount)}</span>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Follow Ups
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setFollowUpPopup({
                          orderId: detailOrder.id,
                          orderName: `${detailOrder.customer.firstName} ${detailOrder.customer.lastName}`.trim(),
                          note: '',
                          date: toDateInputValue(new Date()),
                          nextFollowUpDate: '',
                          closeInquiry: false,
                        })
                      }
                      className={ghostButtonCls}
                    >
                      Add follow up
                    </button>
                  </div>
                  {detailOrder.followUps.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No follow ups added yet.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="px-3 py-2 font-medium">Follow Up By</th>
                            <th className="px-3 py-2 font-medium">Date</th>
                            <th className="px-3 py-2 font-medium">Next Follow Up</th>
                            <th className="px-3 py-2 font-medium">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...detailOrder.followUps]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((followUp, index) => (
                              <tr key={`${followUp.createdAt}-${index}`} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-3 py-3 text-slate-700">{followUp.followUpByName}</td>
                                <td className="px-3 py-3 text-slate-700">{formatFollowUpDate(followUp.date)}</td>
                                <td className="px-3 py-3 text-slate-700">{followUp.nextFollowUpDate ? formatFollowUpDate(followUp.nextFollowUpDate) : '-'}</td>
                                <td className="px-3 py-3 text-slate-700">{followUp.note}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                      </>
                    );
                  })()}
              </div>
              <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.5rem+var(--zb-safe-bottom))] pt-2 shadow-[0_-18px_35px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 sm:pb-[calc(0.75rem+var(--zb-safe-bottom))] sm:pt-3">
                {(() => {
                  const renderDetailActionButtons = () => (
                    <>
                      {detailOrder.status === 'CONFIRMED' ? (
                        <>
                          <Link
                            href={`/print/order?id=${detailOrder.id}`}
                            target="_blank"
                            className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Print
                          </Link>
                          <Link
                            href={`/print/order?id=${detailOrder.id}&copy=kitchen`}
                            target="_blank"
                            className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Kitchen Print
                          </Link>
                          {settings?.enablePrintTag &&
                          settings.printTagLogoUrl &&
                          detailOrder.menuSelectionSnapshot.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const items = buildPrintTagItems(detailOrder);
                                setPrintTagPopup({
                                  order: detailOrder,
                                  items,
                                  selectedIds: items.map((item) => item.id),
                                });
                              }}
                              className="inline-flex min-w-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                            >
                              Print Tag
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentAmount('');
                              setPaymentPopupMode(defaultPaymentMode);
                              setPaymentRemark('');
                              setPaymentEditor({ orderId: detailOrder.id });
                              setPaymentPopup({ orderId: detailOrder.id });
                            }}
                            className="inline-flex min-w-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                          >
                            Add Advance
                          </button>
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
                      {detailOrder.status === 'INQUIRY' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenConvertInquiry(detailOrder)}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                        >
                          Confirm Inquiry
                        </button>
                      ) : null}
                      {isCompanyAdmin &&
                      (detailOrder.status === 'INQUIRY' ||
                        detailOrder.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => openTransferPopup(detailOrder)}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Transfer
                        </button>
                      ) : null}
                      {(detailOrder.status === 'INQUIRY' ||
                        detailOrder.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setIsMobileDetailActionsOpen(false);
                            openEditInquiry(detailOrder);
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Edit inquiry
                        </button>
                      ) : null}
                      {(detailOrder.status === 'INQUIRY' ||
                        detailOrder.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setIsMobileDetailActionsOpen(false);
                            openCategoryChooser(detailOrder);
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          {detailOrder.categorySnapshot ? 'Select Menu' : 'Choose category'}
                        </button>
                      ) : null}
                      {isCompanyAdmin &&
                      (detailOrder.status === 'INQUIRY' ||
                        detailOrder.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setIsMobileDetailActionsOpen(false);
                            setCancelPopup({
                              order: detailOrder,
                              reason: '',
                              advanceOption: null,
                              expiryMonths: null,
                              expiryCustomDate: '',
                              paybackMode: null,
                            });
                          }}
                          className="inline-flex min-w-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                        >
                          Cancel order
                        </button>
                      ) : null}
                    </>
                  );

                  return (
                    <>
                      <div className="hidden items-center justify-between gap-3 sm:mb-2 sm:flex">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Actions</p>
                        {detailOrder.status === 'CONFIRMED' ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Advance {formatCurrency(detailOrder.advanceAmount)}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`grid gap-2 overflow-hidden transition-[max-height,opacity,margin] duration-200 sm:hidden ${
                          isMobileDetailActionsOpen
                            ? 'mb-2 max-h-[420px] grid-cols-2 opacity-100'
                            : 'mb-0 max-h-0 grid-cols-2 opacity-0'
                        }`}
                      >
                        {isMobileDetailActionsOpen ? renderDetailActionButtons() : null}
                      </div>
                      <div className="sm:hidden">
                        <button
                          type="button"
                          aria-label={isMobileDetailActionsOpen ? 'Hide booking actions' : 'Show booking actions'}
                          aria-expanded={isMobileDetailActionsOpen}
                          onClick={() => setIsMobileDetailActionsOpen((current) => !current)}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <span>Actions</span>
                          <span className={isMobileDetailActionsOpen ? 'transition-transform' : 'rotate-180 transition-transform'}>
                            <IconChevronDown />
                          </span>
                        </button>
                      </div>
                      <div className="hidden grid-cols-2 gap-2 sm:grid min-[520px]:grid-cols-3 md:grid-cols-4">
                        {renderDetailActionButtons()}
                      </div>
                    </>
                  );
                })()}
              </div>
              </div>
            ) : null}
          </ModalShell>
        ) : null}
      </section>
    </BookingsRoute>
  );
}

function metadataLine(label: string, value: string, highlighted = false) {
  return (
    <p className={highlighted ? 'mt-1 text-sm font-semibold text-slate-900' : 'mt-1 text-sm text-slate-500'}>
      <span className="font-medium text-slate-600">{label}: </span>
      {value}
    </p>
  );
}

function formatFollowUpDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getHallParts(hallDetails: string | null | undefined) {
  if (!hallDetails) return [];
  return hallDetails
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildDayHallSlotMatrix(orders: CalendarOrder[], hallLabels: string[]) {
  const slotPriority = ['Breakfast', 'Lunch', 'Dinner'];
  const slots = slotPriority;
  const halls = Array.from(new Set(hallLabels.map((hall) => hall.trim()).filter(Boolean)));
  const cellMap = new Map<string, 'confirmed'>();

  for (const order of orders) {
    const slot = order.serviceSlot?.trim();
    if (!slot) continue;

    for (const hall of getHallParts(order.hallDetails)) {
      const key = `${hall}::${slot}`;
      if (order.status === 'CONFIRMED' || order.status === 'COMPLETED') {
        cellMap.set(key, 'confirmed');
      }
    }
  }

  return { halls, slots, cellMap };
}

function ModalShell({
  eyebrow,
  title,
  children,
  onClose,
  widthClassName = 'max-w-3xl',
  fullScreen = false,
  zIndexClassName = 'z-50',
  panelClassName = '',
  scrollablePanel = true,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
  fullScreen?: boolean;
  zIndexClassName?: string;
  panelClassName?: string;
  scrollablePanel?: boolean;
}) {
  return (
    <div
      className={`modal-viewport-pad fixed inset-0 ${zIndexClassName} bg-slate-900/50 backdrop-blur-sm ${
        fullScreen
          ? 'flex items-center justify-center px-3 sm:px-4 sm:py-4'
          : 'flex items-center justify-center px-3 sm:px-4 sm:py-6'
      }`}
      >
        <div
        className={`relative w-full border border-slate-200 bg-white ${
          scrollablePanel ? 'app-scrollbar overflow-y-auto' : 'overflow-hidden'
        } ${
          fullScreen
            ? 'modal-panel-fullscreen-height max-w-6xl rounded-[28px] px-4 py-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)] sm:max-h-[calc(100vh-2rem-var(--zb-safe-top)-var(--zb-safe-bottom))] sm:min-h-[calc(100vh-2rem-var(--zb-safe-top)-var(--zb-safe-bottom))] sm:px-6 sm:py-6'
            : `modal-panel-height safe-pad-bottom rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${widthClassName}`
        } ${panelClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:right-6 sm:top-6"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
        <div className="pr-12 sm:pr-14">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function TimePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hourPlaceholder?: string;
  minutePlaceholder?: string;
}) {
  function parseValue(v: string) {
    if (!v) return { hour: '', minute: '00', period: '' };
    const [hourPart, minutePart] = v.split(':');
    const h24 = parseInt(hourPart, 10);
    return {
      hour: String(h24 % 12 || 12),
      minute: minutePart || '00',
      period: h24 >= 12 ? 'PM' : 'AM',
    };
  }

  const parsed = parseValue(value);
  const [localHour, setLocalHour] = useState(parsed.hour);
  const [localMinute, setLocalMinute] = useState(parsed.minute);
  const [localPeriod, setLocalPeriod] = useState(parsed.period);

  useEffect(() => {
    const p = parseValue(value);
    setLocalHour(p.hour);
    setLocalMinute(p.minute);
    setLocalPeriod(p.period);
  }, [value]);

  function emitTime(nextHour: string, nextMinute: string, nextPeriod: string) {
    if (!nextHour || !nextMinute || !nextPeriod) {
      onChange('');
      return;
    }

    let h24 = parseInt(nextHour, 10) % 12;
    if (nextPeriod === 'PM') h24 += 12;
    onChange(`${String(h24).padStart(2, '0')}:${nextMinute}`);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select
        value={localHour}
        disabled={disabled}
        onChange={(e) => {
          const nextHour = e.target.value;
          setLocalHour(nextHour);
          emitTime(nextHour, localMinute, localPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1 ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
      >
        <option value="">Hour</option>
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <select
        value={localMinute}
        disabled={disabled}
        onChange={(e) => {
          const nextMinute = e.target.value;
          setLocalMinute(nextMinute);
          emitTime(localHour, nextMinute, localPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1 ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
      >
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
      <select
        value={localPeriod}
        disabled={disabled}
        onChange={(e) => {
          const nextPeriod = e.target.value;
          setLocalPeriod(nextPeriod);
          emitTime(localHour, localMinute, nextPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1 ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
      >
        <option value="">--</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function IconActionButton({
  label,
  onClick,
  icon,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  onClick: () => void;
  icon: 'view' | 'edit' | 'delete' | 'convert' | 'cancel' | 'complete';
  tone?: 'neutral' | 'danger' | 'success' | 'info';
  compact?: boolean;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : tone === 'success'
        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
        : tone === 'info'
          ? 'border-sky-200 text-sky-700 hover:bg-sky-50'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-xl border transition ${toneClass} ${
        compact ? 'h-9 w-9' : 'h-10 w-10'
      }`}
    >
      <IconGlyph icon={icon} />
    </button>
  );
}

function IconGlyph({
  icon,
}: {
  icon:
    | 'view'
    | 'edit'
    | 'delete'
    | 'convert'
    | 'cancel'
    | 'complete'
    | 'expand'
    | 'search'
    | 'previous'
    | 'next';
}) {
  switch (icon) {
    case 'view':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
          <path d="M1.5 10s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" />
          <circle cx="10" cy="10" r="2.5" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
          <path d="m13.5 3.5 3 3" />
          <path d="M4 13.5 13.5 4a2.12 2.12 0 0 1 3 3L7 16.5 3.5 17Z" />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
          <path d="M3.5 5.5h13" />
          <path d="M7.5 5.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" />
          <path d="M6.5 7.5v8" />
          <path d="M10 7.5v8" />
          <path d="M13.5 7.5v8" />
        </svg>
      );
    case 'convert':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
          <path d="M4 10h10" />
          <path d="m10 6 4 4-4 4" />
        </svg>
      );
    case 'cancel':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4.5 w-4.5">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      );
    case 'complete':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5">
          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.6-3.6a1 1 0 111.415-1.42l2.893 2.894 6.493-6.494a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    case 'expand':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
          <path d="M10 4v12" />
          <path d="M4 10h12" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
      );
    case 'previous':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
          <path d="m12.5 4.5-5 5 5 5" />
        </svg>
      );
    case 'next':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
          <path d="m7.5 4.5 5 5-5 5" />
        </svg>
      );
  }
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getMonthTileStatusCounts(orders: CalendarOrder[]) {
  return orders.reduce(
    (counts, order) => {
      if (order.status === 'INQUIRY' && order.inquiryClosed) {
        counts.closed += 1;
      } else if (order.status === 'INQUIRY') {
        counts.inquiry += 1;
      } else if (order.status === 'CANCELLED') {
        counts.cancelled += 1;
      } else {
        counts.booked += 1;
      }

      return counts;
    },
    { inquiry: 0, booked: 0, cancelled: 0, closed: 0 },
  );
}

function buildPrintTagItems(order: Order): PrintTagItem[] {
  return order.menuSelectionSnapshot.flatMap((menu, menuIndex) =>
    menu.sections.flatMap((section, sectionIndex) =>
      section.items.map((itemName, itemIndex) => ({
        id: `${menuIndex}:${sectionIndex}:${itemIndex}`,
        menuTitle: menu.title,
        sectionTitle: section.sectionTitle,
        itemName,
      })),
    ),
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-10'
      }`}
    >
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function ToastMessage({ toast }: { toast: ToastState }) {
  return (
    <div
      className={`fixed right-4 top-20 z-[70] max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg sm:right-6 ${
        toast.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {toast.message}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function splitFullName(value: string) {
  return { firstName: value.trim(), lastName: '' };
}

function formatDisplayDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthRange(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function shiftMonth(value: Date, direction: -1 | 1) {
  const next = new Date(value);
  return new Date(next.getFullYear(), next.getMonth() + direction, 1);
}

function buildMonthGrid(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = start.getDay();
  const totalCells = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    return new Date(month.getFullYear(), month.getMonth(), dayNumber);
  });
}

function withCurrentOption(options: string[], current?: string | null) {
  const normalized = options.filter(Boolean);

  if (!current?.trim()) {
    return normalized;
  }

  return normalized.includes(current) ? normalized : [current, ...normalized];
}

function resolveEventFormValue(options: string[], current?: string | null) {
  if (!current?.trim()) {
    return {
      formValue: '',
      customValue: '',
    };
  }

  return options.includes(current)
    ? {
        formValue: current,
        customValue: '',
      }
    : {
        formValue: EVENT_OTHER_VALUE,
        customValue: current,
      };
}

function getResolvedEventName(selectedValue: string, customValue: string) {
  if (selectedValue === EVENT_OTHER_VALUE) {
    return customValue.trim() || '';
  }

  return selectedValue.trim();
}

function formatTimeOptionLabel(value: string) {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;

  return `${String(hour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')} ${suffix}`;
}

function isValidTimeRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) {
    return true;
  }

  return startTime !== endTime;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) {
    return `${formatTimeOptionLabel(startTime)} - ${formatTimeOptionLabel(endTime)}`;
  }

  if (startTime) {
    return formatTimeOptionLabel(startTime);
  }

  if (endTime) {
    return formatTimeOptionLabel(endTime);
  }

  return 'Time pending';
}
