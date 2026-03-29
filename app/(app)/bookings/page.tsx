'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import {
  addAdvancePayment,
  addOrderFollowUp,
  cancelOrder,
  confirmInquiry,
  createOrder,
  deleteAdvancePayment,
  deleteOrder,
  fetchCalendarOrders,
  fetchCategories,
  fetchOrderById,
  fetchOrders,
  fetchSettings,
  updateAdvancePayment,
  updateOrder,
} from '@/lib/auth/api';
import {
  AppSettings,
  CalendarOrder,
  Category,
  Order,
  OrderAdvancePayment,
  OrderStatus,
  PaymentMode,
} from '@/lib/auth/types';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';

type ViewMode = 'list' | 'calendar';
type CalendarScope = 'month' | 'week' | 'day';

type SelectedMenuSection = {
  sectionTitle: string;
  items: string[];
};

type SelectedMenu = {
  menuId: string;
  title: string;
  sections: SelectedMenuSection[];
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
  additionalInformation: string;
  categoryId: string;
  inquiryCustomPrice: string;
  customPricePerPlate: string;
  selectedMenus: SelectedMenu[];
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
  additionalInformation: '',
  categoryId: '',
  inquiryCustomPrice: '',
  customPricePerPlate: '',
  selectedMenus: [],
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const dateTimeInputCls = `${inputCls} text-slate-900 [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;

const ghostButtonCls =
  'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50';

const primaryButtonCls =
  'rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60';

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

export default function BookingsPage() {
  const { accessToken, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [orders, setOrders] = useState<Order[]>([]);
  const [calendarOrders, setCalendarOrders] = useState<CalendarOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const todayKey = toDateInputValue(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [filterDate, setFilterDate] = useState(todayKey);
  const [calendarScope, setCalendarScope] = useState<CalendarScope>('month');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return new Date();
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() =>
    formatDateKey(new Date()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formState, setFormState] = useState<BookingFormState>(initialFormState);
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
  const [advanceRemark, setAdvanceRemark] = useState('');
  const [isAdvanceSubmitting, setIsAdvanceSubmitting] = useState(false);
  const [cancelPopup, setCancelPopup] = useState<{ order: Order; reason: string } | null>(
    null,
  );
  const [deletePopup, setDeletePopup] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [dayRecordsPopup, setDayRecordsPopup] = useState<{
    dateKey: string;
    orders: CalendarOrder[];
  } | null>(null);
  const [followUpPopup, setFollowUpPopup] = useState<FollowUpPopupState | null>(null);
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false);
  const [paymentPopup, setPaymentPopup] = useState<{ orderId: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPopupMode, setPaymentPopupMode] = useState<PaymentMode>('Cash');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentEditor, setPaymentEditor] = useState<{
    orderId: string;
    paymentId?: string;
  } | null>(null);
  const [addonPopup, setAddonPopup] = useState<{
    menuId: string;
    menuTitle: string;
    sectionTitle: string;
    value: string;
  } | null>(null);

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
    if (!accessToken) {
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setPageError('');
        const [ordersResponse, categoriesResponse, settingsResponse] = await Promise.all([
          fetchOrders(token, {
            page,
            limit,
            search: '',
            status: statusFilter,
            from: filterDate,
            to: filterDate,
          }),
          fetchCategories(token, { page: 1, limit: 100, search: '' }),
          fetchSettings(token),
        ]);

        setOrders(ordersResponse.items);
        setTotalPages(ordersResponse.pagination.totalPages);
        setTotalItems(ordersResponse.pagination.total);
        setCategories(categoriesResponse.items);
        setSettings(settingsResponse);
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
    filterDate,
    limit,
    page,
    statusFilter,
  ]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    const monthRange = getCalendarRange(calendarScope, calendarMonth);

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
  }, [accessToken, calendarMonth, calendarScope]);

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
  const popupPaymentModeChoices = withCurrentOption(paymentOptions, paymentPopupMode);
  const eventChoices = withCurrentOption(eventOptions, formState.eventName);

  const categoryRules = useMemo(
    () => selectedCategory?.menuRules ?? [],
    [selectedCategory],
  );

  const pax = Number(formState.totalPerson) || 0;
  const pricePerPlate = selectedCategory?.pricePerPlate ?? 0;
  const baseTotal = pax * pricePerPlate;
  const grandTotal = baseTotal;
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const ordersByDate = useMemo(() => {
    const grouped = new Map<string, CalendarOrder[]>();

    for (const order of calendarOrders) {
      const key = formatDateKey(order.eventDate);
      const current = grouped.get(key) ?? [];
      current.push(order);
      grouped.set(key, current);
    }

    return grouped;
  }, [calendarOrders]);
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
  const isServiceSlotLocked = !isCompanyAdmin && Boolean(editingOrder);

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
    setSelectedCalendarDay(formatDateKey(calendarMonth));
  }, [calendarMonth]);

  async function reloadOrders(token: string, nextPage: number) {
    const response = await fetchOrders(token, {
      page: nextPage,
      limit,
      search: '',
      status: statusFilter,
      from: filterDate,
      to: filterDate,
    });
    setOrders(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  async function reloadCalendar(token: string) {
    const response = await fetchCalendarOrders(token, getCalendarRange(calendarScope, calendarMonth));
    setCalendarOrders(response);
  }

  async function loadCategories(token: string) {
    const response = await fetchCategories(token, { page: 1, limit: 100, search: '' });
    setCategories(response.items);
    return response.items;
  }

  async function refreshBookingViews(token: string, nextPage = page) {
    await Promise.all([reloadOrders(token, nextPage), reloadCalendar(token)]);
  }

  function resetWizard() {
    setEditingOrder(null);
    setFormState(initialFormState);
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
    setIsInquiryOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  function openEditInquiry(order: Order) {
    setEditingOrder(order);
    setFormState({
      inquiryDate: order.inquiryDate ? formatDateKey(order.inquiryDate) : toDateInputValue(new Date()),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      mobileNumber: order.customer.phone,
      eventName: order.functionName ?? '',
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
      additionalInformation: order.additionalInformation ?? order.notes ?? '',
      categoryId: order.categorySnapshot?.categoryId ?? '',
      inquiryCustomPrice:
        order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
          ? String(order.inquiryCustomPrice)
          : '',
      customPricePerPlate:
        order.customPricePerPlate !== null && order.customPricePerPlate !== undefined
          ? String(order.customPricePerPlate)
          : '',
      selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        sections: menu.sections.map((section) => ({
          sectionTitle: section.sectionTitle,
          items: [...section.items],
        })),
      })),
    });
    setIsInquiryOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  function openCategoryChooser(order: Order) {
    setEditingOrder(order);
    setFormState({
      inquiryDate: order.inquiryDate ? formatDateKey(order.inquiryDate) : toDateInputValue(new Date()),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      mobileNumber: order.customer.phone,
      eventName: order.functionName ?? '',
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
      additionalInformation: order.additionalInformation ?? order.notes ?? '',
      categoryId: order.categorySnapshot?.categoryId ?? '',
      inquiryCustomPrice:
        order.inquiryCustomPrice !== null && order.inquiryCustomPrice !== undefined
          ? String(order.inquiryCustomPrice)
          : '',
      customPricePerPlate:
        order.customPricePerPlate !== null && order.customPricePerPlate !== undefined
          ? String(order.customPricePerPlate)
          : '',
      selectedMenus: order.menuSelectionSnapshot.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        sections: menu.sections.map((section) => ({
          sectionTitle: section.sectionTitle,
          items: [...section.items],
        })),
      })),
    });
    setIsWizardOpen(true);
    if (accessToken) {
      void loadCategories(accessToken).catch(() => {
        setToast({ type: 'error', message: 'Unable to load categories.' });
      });
    }
  }

  async function openOrderDetail(orderId: string, initialOrder?: Order) {
    if (!accessToken) {
      return;
    }

    setIsDetailOpen(true);
    setDetailOrder(initialOrder ?? null);
    setIsDetailLoading(true);
    setDetailError('');

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
  }

  function toggleMenuItem(
    rule: Category['menuRules'][number],
    sectionTitle: string,
    item: string,
    checked: boolean,
  ) {
    const selectedCount = formState.selectedMenus.find(
      (selectedMenu) => selectedMenu.menuId === rule.menuId,
    )?.sections.find((section) => section.sectionTitle === sectionTitle)?.items.length ?? 0;

    if (checked && selectedCount >= rule.selectionLimit) {
      setToast({
        type: 'error',
        message: `Only ${rule.selectionLimit} selection(s) allowed for ${sectionTitle}.`,
      });
      return;
    }

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

  function openAdvancePopup(mode: 'new' | 'convert', order: Order | null = null) {
    setAdvanceAmount(order?.advanceAmount ? String(order.advanceAmount) : '');
    setConfirmDiscount(order ? String(order.discountAmount || 0) : '0');
    setConfirmExtrasTotal(order ? String(order.extrasTotal || 0) : '0');
    setPaymentMode(order?.paymentMode ?? defaultPaymentMode);
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
    const { firstName, lastName } = splitFullName(customerName);

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setToast({ type: 'error', message: 'Contact number must be exactly 10 digits.' });
      return;
    }

    if (!customerName) {
      setToast({ type: 'error', message: 'Customer name is required.' });
      return;
    }

    if (!formState.hallDetails.trim()) {
      setToast({ type: 'error', message: 'Hall details is required.' });
      return;
    }

    if ((formState.startTime || formState.endTime) && (!formState.startTime || !formState.endTime)) {
      setToast({
        type: 'error',
        message: 'Start time and end time are both required.',
      });
      return;
    }

    if (formState.startTime && formState.endTime && formState.endTime <= formState.startTime) {
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
        eventType: formState.eventName.trim() || undefined,
        functionName: formState.eventName.trim() || undefined,
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
          eventType: formState.eventName.trim() || editingOrder.eventType || '',
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
      setPage(1);
      await refreshBookingViews(accessToken, 1);
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
    const { firstName, lastName } = splitFullName(formState.customerName.trim());

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setToast({ type: 'error', message: 'Contact number must be exactly 10 digits.' });
      return;
    }

    if (!formState.hallDetails.trim()) {
      setToast({ type: 'error', message: 'Hall details is required.' });
      return;
    }

    if (formState.endTime <= formState.startTime) {
      setToast({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    if (categoryRules.length === 0) {
      setToast({
        type: 'error',
        message: 'This category has no configured menu items. Update the category first.',
      });
      return;
    }

    for (const rule of categoryRules) {
      const selectedCount = selectedCountForRule(rule);

      if (selectedCount < rule.selectionLimit) {
        setToast({
          type: 'error',
          message: `Select ${rule.selectionLimit} item(s) for ${rule.sectionTitle} before saving.`,
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await updateOrder(accessToken, editingOrder.id, {
        customer: {
          firstName,
          lastName,
          phone: normalizedPhone,
        },
        status: editingOrder.status,
        pax,
        eventType: formState.eventName.trim() || editingOrder.eventType || '',
        functionName: formState.eventName.trim(),
        inquiryDate: formState.inquiryDate,
        eventDate: formState.functionDate,
        startTime: formState.startTime,
        endTime: formState.endTime,
        categoryId: formState.categoryId,
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
      });
      resetWizard();
      setToast({ type: 'success', message: 'Booking details saved successfully.' });
      await refreshBookingViews(accessToken, page);
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

    if ((Number(advanceAmount) || 0) < 1) {
      setToast({
        type: 'error',
        message: 'Advance amount must be at least 1 to confirm booking.',
      });
      return;
    }

    try {
      setIsAdvanceSubmitting(true);

      if (advancePopup?.mode === 'new' && pendingCreatePayload.current) {
        // Create a new confirmed booking with payment details
        const createdOrder = await createOrder(accessToken, {
          ...pendingCreatePayload.current,
          advanceAmount: Number(advanceAmount) || 0,
          paymentMode,
          notes:
            advanceRemark.trim() || pendingCreatePayload.current.notes || undefined,
        });
        pendingCreatePayload.current = null;
        setAdvancePopup(null);
        setEditingOrder(null);
        setFormState(initialFormState);
        setToast({ type: 'success', message: 'Booking confirmed successfully.' });
        setPage(1);
        await refreshBookingViews(accessToken, 1);
        await openOrderDetail(createdOrder.id, createdOrder);
      } else if (advancePopup?.order) {
        // Convert an existing inquiry to confirmed
        await confirmInquiry(accessToken, advancePopup.order.id, {
          advanceAmount: Number(advanceAmount) || 0,
          extrasTotal: Number(confirmExtrasTotal) || 0,
          discountAmount: Number(confirmDiscount) || 0,
          paymentMode,
          remark: advanceRemark.trim() || undefined,
        });
        setAdvancePopup(null);
        setToast({ type: 'success', message: 'Inquiry converted to booking successfully.' });
        await refreshBookingViews(accessToken, page);
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

  async function handleCancel(orderId: string, reason?: string) {
    if (!accessToken) {
      return;
    }

    try {
      await cancelOrder(accessToken, orderId, { reason });
      setToast({ type: 'success', message: 'Order cancelled successfully.' });
      await refreshBookingViews(accessToken, page);

      if (isDetailOpen) {
        await openOrderDetail(orderId);
      }
    } catch (requestError) {
      setToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Unable to cancel order.',
      });
    }
  }

  async function handleDelete(orderId: string) {
    if (!accessToken) {
      return;
    }

    try {
      await deleteOrder(accessToken, orderId);
      setDeletePopup(null);
      setToast({ type: 'success', message: 'Inquiry deleted successfully.' });
      await refreshBookingViews(accessToken, page);
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
      });
      setFollowUpPopup(null);
      setToast({ type: 'success', message: 'Follow up added successfully.' });
      await refreshBookingViews(accessToken, page);
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
      setCancelPopup({ order, reason: '' });
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
      await refreshBookingViews(accessToken, page);
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

function statusClasses(status: OrderStatus) {
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Bookings
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Inquiry and booking flow</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-amber-400 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'calendar'
                    ? 'bg-amber-400 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Calendar
              </button>
            </div>
            <button
              type="button"
              onClick={() => openCreateInquiry()}
              className={primaryButtonCls}
            >
              New inquiry
            </button>
          </div>
        </div>

        {toast ? <ToastMessage toast={toast} /> : null}

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[220px_220px_auto] md:items-end">
          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className={inputCls}
            >
              <option value="">All statuses</option>
              <option value="INQUIRY">Inquiry</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </Field>
          <Field label="Function Date">
            <input
              type="date"
              value={filterDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setPage(1);
                setFilterDate(nextDate);
                if (nextDate) {
                  const nextCalendarDate = new Date(`${nextDate}T00:00:00`);
                  setCalendarMonth(nextCalendarDate);
                  setSelectedCalendarDay(nextDate);
                }
              }}
              aria-label="Filter function date"
              className={`${dateTimeInputCls} min-h-12`}
            />
          </Field>
          <div className="text-right">
            <p className="text-xs text-slate-500">Bookings on selected function date</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
          </div>
        </div>

        {pageError ? (
          <EmptyState
            title="Unable to load bookings"
            description={pageError}
            compact
          />
        ) : null}

        {viewMode === 'list' ? (
          <>
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
                            description="Try a different search, clear the status filter, or create a new inquiry."
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
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <IconActionButton
                                label="View booking"
                                onClick={() => void openOrderDetail(order.id, order)}
                                icon="view"
                              />
                              {(order.status === 'INQUIRY' || order.status === 'CONFIRMED') ? (
                                <button
                                  type="button"
                                  onClick={() => openCategoryChooser(order)}
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                  {order.categorySnapshot ? 'Change Category' : 'Choose category'}
                                </button>
                              ) : null}
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
                                  onClick={() => setCancelPopup({ order, reason: '' })}
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
                  description="Try a different search, clear filters, or create a new inquiry."
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
                        )}`}
                      >
                        {order.status}
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
                      {(order.status === 'INQUIRY' || order.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => openCategoryChooser(order)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                        >
                          {order.categorySnapshot ? 'Change Category' : 'Choose category'}
                        </button>
                      ) : null}
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
                          onClick={() => setCancelPopup({ order, reason: '' })}
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
          </>
        ) : (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Calendar View
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCalendarHeading(calendarScope, calendarMonth)}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  {(['month', 'week', 'day'] as CalendarScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setCalendarScope(scope)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                        calendarScope === scope
                          ? 'bg-amber-400 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftCalendarDate(current, calendarScope, -1))}
                  className={ghostButtonCls}
                >
                  <span className="inline-flex items-center gap-2">
                    <IconGlyph icon="previous" />
                    <span>{formatMonthLabel(shiftCalendarDate(calendarMonth, calendarScope, -1))}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date())}
                  className={ghostButtonCls}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftCalendarDate(current, calendarScope, 1))}
                  className={ghostButtonCls}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{formatMonthLabel(shiftCalendarDate(calendarMonth, calendarScope, 1))}</span>
                    <IconGlyph icon="next" />
                  </span>
                </button>
              </div>
            </div>

            {isCalendarLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                Loading calendar…
              </div>
            ) : (
              calendarScope === 'month' ? (
                <div className="space-y-4">
                  {calendarOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No bookings in this range. You can still browse dates and add a new inquiry.
                    </div>
                  ) : null}
                  <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                    {monthGrid.map((day, index) => {
                      if (!day) {
                        return <div key={`month-empty-${index}`} className="hidden min-h-[96px] rounded-[20px] md:block" />;
                      }

                      const dayKey = formatDateKey(day);
                      const dayOrders = ordersByDate.get(dayKey) ?? [];
                      const isSelectedDay = selectedCalendarDay === dayKey;

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() => {
                            setSelectedCalendarDay(dayKey);
                            setDayRecordsPopup({ dateKey: dayKey, orders: dayOrders });
                          }}
                          className={`min-h-[96px] rounded-[20px] border p-2.5 text-left transition ${
                            isSelectedDay
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">{day.getDate()}</p>
                            {dayOrders.length ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {dayOrders.length}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {dayOrders.slice(0, 6).map((order) => (
                              <span
                                key={order.id}
                                className={`h-2.5 w-2.5 rounded-full ${monthDotClasses(order.status)}`}
                              />
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                            <span>
                              {dayOrders.length ? `${dayOrders.length} booking${dayOrders.length > 1 ? 's' : ''}` : 'No bookings'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <IconGlyph icon="expand" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                {calendarOrders.length === 0 ? (
                  <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    No bookings in this range. You can still browse dates and add a new inquiry.
                  </div>
                ) : null}
                <div className="space-y-3">
                  {(calendarScope === 'week' ? buildWeekDays(calendarMonth) : [calendarMonth]).map((day) => {
                    const dayKey = formatDateKey(day);
                    const dayOrders = ordersByDate.get(dayKey) ?? [];
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => {
                          setSelectedCalendarDay(dayKey);
                          setDayRecordsPopup({ dateKey: dayKey, orders: dayOrders });
                        }}
                        className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{formatDisplayDate(dayKey)}</p>
                            <p className="mt-1 text-xs text-slate-500">{dayOrders.length} booking{dayOrders.length === 1 ? '' : 's'}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-500" />
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                            {dayOrders.length === 0
                              ? 'No bookings for this day.'
                              : `${dayOrders.length} booking${dayOrders.length > 1 ? 's' : ''} available. Tap to open the day panel.`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day Panel</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    {formatDisplayDate(selectedCalendarDay)}
                  </h3>
                  {selectedCalendarOrders.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No bookings for this day.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {selectedCalendarOrders.map((order) => (
                        <button
                          key={`day-panel-${order.id}`}
                          type="button"
                          onClick={() => void openOrderDetail(order.id)}
                          className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition hover:opacity-90 ${statusClasses(
                            order.status,
                          )}`}
                        >
                          <p className="font-semibold">{order.orderId}</p>
                          <p className="mt-1">{formatTimeRange(order.startTime, order.endTime)}</p>
                          <p className="mt-1 truncate opacity-80">{order.customerName}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
              )
            )}
          </div>
        )}

        {isInquiryOpen ? (
          <ModalShell
            title={editingOrder ? 'Edit inquiry' : 'Create inquiry'}
            eyebrow="Inquiry Form"
            onClose={() => {
              setIsInquiryOpen(false);
              setEditingOrder(null);
              setFormState(initialFormState);
            }}
            widthClassName="max-w-5xl"
          >
            <div className="mt-6 space-y-5">
              <div>
                <Field label="Customer Name" required>
                  <input
                    value={formState.customerName}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                    placeholder="Enter customer name"
                    className={`${inputCls} min-h-12`}
                  />
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
                <Field label="Service Slot">
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
                        Employees can set the service slot while creating an inquiry, but only company admins can change it later.
                      </p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event Name">
                  <select
                    value={formState.eventName}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        eventName: event.target.value,
                      }))
                    }
                    className={`${inputCls} min-h-12`}
                  >
                    <option value="">Select event option</option>
                    {eventChoices.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Function Date">
                  <input
                    type="date"
                    value={formState.functionDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        functionDate: event.target.value,
                        }))
                      }
                    className={`${dateTimeInputCls} min-h-12`}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Function Start Time">
                  <TimePicker
                    value={formState.startTime}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        startTime: value,
                      }))
                    }
                    hourPlaceholder="Hour"
                    minutePlaceholder="Min"
                  />
                </Field>
                <Field label="Function End Time">
                  <TimePicker
                    value={formState.endTime}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        endTime: value,
                      }))
                    }
                    hourPlaceholder="Hour"
                    minutePlaceholder="Min"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="No Of Total Person">
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
                  <input
                    value={formState.hallDetails}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        hallDetails: event.target.value,
                      }))
                    }
                    placeholder="Enter hall details"
                    className={`${inputCls} min-h-12`}
                  />
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
                    placeholder="Optional custom price"
                    className={`${inputCls} min-h-12`}
                  />
                </Field>
              </div>

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
                }}
                className={`${ghostButtonCls} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleCreateInquiry('INQUIRY')}
                className={`${primaryButtonCls} w-full sm:w-auto`}
              >
                {isSubmitting ? 'Saving…' : editingOrder ? 'Save inquiry' : 'Create inquiry'}
              </button>
              {!editingOrder && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleCreateInquiry('CONFIRMED')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? 'Saving…' : 'Confirm Booking'}
                </button>
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
          >
            <div className="mt-8 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formState.customerName || 'Customer name'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
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
                  <Field label="Custom Price">
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
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              <div className="min-h-0">
                <div className="max-h-[58vh] overflow-y-auto pr-1">
                  {categoryRules.length === 0 ? (
                    <EmptyState
                      title="No configured items for this category"
                      description="Edit the category and assign item rules before continuing."
                    />
                  ) : (
                    categoryRules.map((rule) => (
                      <div
                        key={`${rule.menuId}-${rule.sectionTitle}`}
                        className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="mt-1 text-xl font-semibold text-slate-900">
                              {rule.sectionTitle}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              Choose {rule.selectionLimit}
                            </span>
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
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {(formState.selectedMenus
                            .find((m) => m.menuId === rule.menuId)
                            ?.sections.find((s) => s.sectionTitle === rule.sectionTitle)
                            ?.items.filter((i) => !rule.allowedItems.includes(i)) ?? []
                          ).map((addonItem) => (
                            <div
                              key={`addon-${rule.menuId}-${rule.sectionTitle}-${addonItem}`}
                              className="flex w-full items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white px-4 py-4 text-sm shadow-sm"
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
                          {rule.allowedItems.map((item) => {
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
                                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm transition ${
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
                                <span className="font-medium">{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={resetWizard} className={ghostButtonCls}>
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSaveBookingSelection()}
                className={primaryButtonCls}
              >
                {isSubmitting ? 'Saving…' : 'Save category'}
              </button>
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
                ? 'Enter the advance amount and payment mode to confirm this booking.'
                : 'Enter the advance amount, discount, and extra add-ons. The final payable balance is recalculated before confirmation.'}
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
                  min="1"
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
              <Field label="Remarks">
                <textarea
                  value={advanceRemark}
                  onChange={(event) => setAdvanceRemark(event.target.value)}
                  placeholder="Add remarks if needed"
                  className={`${inputCls} min-h-24 resize-none`}
                />
              </Field>
              <div className="flex justify-end gap-3">
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
                <button
                  type="submit"
                  disabled={isAdvanceSubmitting}
                  className={primaryButtonCls}
                >
                  {isAdvanceSubmitting ? 'Saving…' : 'Confirm booking'}
                </button>
              </div>
            </form>
          </ModalShell>
        ) : null}

        {cancelPopup ? (
          <ModalShell
            title={`Cancel ${cancelPopup.order.orderId}`}
            eyebrow="Cancel Booking"
            onClose={() => setCancelPopup(null)}
            widthClassName="max-w-md"
          >
            <p className="mt-4 text-sm text-slate-500">Add a cancellation reason.</p>
            <textarea
              value={cancelPopup.reason}
              onChange={(event) =>
                setCancelPopup((current) =>
                  current ? { ...current, reason: event.target.value } : current,
                )
              }
              placeholder="Reason (optional)"
              className={`${inputCls} mt-4 min-h-24 resize-none`}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelPopup(null)}
                className={ghostButtonCls}
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCancel(cancelPopup.order.id, cancelPopup.reason);
                  setCancelPopup(null);
                }}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Confirm cancel
              </button>
            </div>
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
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletePopup(null)}
                className={ghostButtonCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deletePopup.id)}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete inquiry
              </button>
            </div>
          </ModalShell>
        ) : null}

        {followUpPopup ? (
          <ModalShell
            title="Add follow up"
            eyebrow="Follow Ups"
            onClose={() => setFollowUpPopup(null)}
            widthClassName="max-w-lg"
            zIndexClassName="z-[80]"
          >
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {followUpPopup.orderName}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
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
                <Field label="Note">
                  <textarea
                    value={followUpPopup.note}
                    onChange={(event) =>
                      setFollowUpPopup((current) =>
                        current ? { ...current, note: event.target.value } : current,
                      )
                    }
                    placeholder="Add follow up note"
                    className={`${inputCls} min-h-28 resize-none`}
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFollowUpPopup(null)}
                  className={ghostButtonCls}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddFollowUp()}
                  disabled={isFollowUpSubmitting}
                  className={primaryButtonCls}
                >
                  {isFollowUpSubmitting ? 'Saving…' : 'Save follow up'}
                </button>
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
            <div className="mt-6 flex justify-end gap-3">
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
              <button
                type="button"
                disabled={isPaymentSubmitting}
                onClick={() =>
                  void (paymentEditor?.paymentId
                    ? handleSaveAdvancePayment()
                    : handleAddAdvancePayment())
                }
                className={primaryButtonCls}
              >
                {isPaymentSubmitting
                  ? 'Saving…'
                  : paymentEditor?.paymentId
                    ? 'Save payment'
                    : 'Record payment'}
              </button>
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
                  onChange={(e) => setAddonPopup((cur) => cur ? { ...cur, value: e.target.value } : cur)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAddonItem(addonPopup.menuId, addonPopup.menuTitle, addonPopup.sectionTitle, addonPopup.value);
                      setAddonPopup(null);
                    }
                  }}
                  placeholder="e.g. Jain Biryani"
                  className={inputCls}
                  autoFocus
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
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

        {dayRecordsPopup ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setDayRecordsPopup(null)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                    Day Bookings
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    {formatDisplayDate(dayRecordsPopup.dateKey)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
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
                  {dayRecordsPopup.orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      No bookings for this day.
                    </div>
                  ) : (
                    [...dayRecordsPopup.orders]
                      .sort((a, b) => {
                        const statusOrder: Record<string, number> = { CONFIRMED: 0, INQUIRY: 1, CANCELLED: 2 };
                        const slotOrder: Record<string, number> = { Breakfast: 0, Lunch: 1, Dinner: 2 };
                        const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
                        if (statusDiff !== 0) return statusDiff;
                        return (slotOrder[a.serviceSlot ?? ''] ?? 9) - (slotOrder[b.serviceSlot ?? ''] ?? 9);
                      })
                      .map((calendarOrder) => {
                        const cardCls =
                          calendarOrder.status === 'CONFIRMED'
                            ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]'
                            : calendarOrder.status === 'INQUIRY'
                              ? 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]'
                              : 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';
                        return (
                          <div
                            key={`popup-${calendarOrder.id}`}
                            className={`rounded-2xl border p-4 ${cardCls}`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{calendarOrder.customerName}</p>
                                <p className="mt-1 text-sm text-slate-600">{calendarOrder.functionName}</p>
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
                              <div className="flex flex-col items-start gap-2 sm:items-end">
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(calendarOrder.status)}`}>
                                  {calendarOrder.status}
                                </span>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                    calendarOrder.hasMenuSelection
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {calendarOrder.hasMenuSelection ? 'Menu Selected' : 'Menu Pending'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <IconActionButton
                                label="View booking"
                                onClick={() => {
                                  setDayRecordsPopup(null);
                                  void openOrderDetail(calendarOrder.id);
                                }}
                                icon="view"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setDayRecordsPopup(null);
                                  setFollowUpPopup({
                                    orderId: calendarOrder.id,
                                    orderName: calendarOrder.customerName,
                                    note: '',
                                    date: toDateInputValue(new Date()),
                                  });
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Follow ups
                              </button>
                              {isCompanyAdmin &&
                              (calendarOrder.status === 'INQUIRY' || calendarOrder.status === 'CONFIRMED') ? (
                                <IconActionButton
                                  label="Cancel booking"
                                  onClick={() => void handleOpenCancelFromCalendar(calendarOrder.id)}
                                  icon="cancel"
                                  tone="danger"
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </aside>
          </>
        ) : null}

        {isDetailOpen ? (
          <ModalShell
            title="Event Detail"
            eyebrow=""
            onClose={() => {
              setIsDetailOpen(false);
              setDetailOrder(null);
              setDetailError('');
            }}
            widthClassName="max-w-4xl"
          >
            {isDetailLoading && !detailOrder ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
                Loading booking details…
              </div>
            ) : detailError ? (
              <EmptyState title="Unable to open booking" description={detailError} />
            ) : detailOrder ? (
              <div className="mt-6 space-y-6">
                {(() => {
                  const menuStatus = selectionStatus(detailOrder);

                  return (
                    <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Customer">
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {detailOrder.customer.firstName} {detailOrder.customer.lastName}
                    </p>
                    <p className="mt-2 text-slate-700">{detailOrder.customer.phone}</p>
                    <p className="mt-1 text-slate-500">
                      {detailOrder.customer.email || 'No email provided'}
                    </p>
                  </InfoCard>
                  <InfoCard label="Inquiry Details">
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {detailOrder.functionName || 'Booking details pending'}
                    </p>
                    <p className="mt-2 text-slate-700">
                      {detailOrder.eventDate
                        ? formatDisplayDate(detailOrder.eventDate)
                        : 'Date pending'}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {detailOrder.startTime && detailOrder.endTime
                        ? formatTimeRange(detailOrder.startTime, detailOrder.endTime)
                        : 'Time pending'}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {detailOrder.serviceSlot || 'Service slot pending'}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Hall details: {detailOrder.hallDetails || 'Hall details pending'}
                    </p>
                    {detailOrder.referenceBy ? (
                      <p className="mt-1 text-slate-500">Reference: {detailOrder.referenceBy}</p>
                    ) : null}
                  </InfoCard>
                  <InfoCard label="Package">
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {detailOrder.categorySnapshot?.name ||
                        (detailOrder.status === 'INQUIRY' && detailOrder.inquiryCustomPrice !== null
                          ? 'Custom Price'
                          : 'Package pending')}
                    </p>
                    {detailOrder.status === 'INQUIRY' &&
                    detailOrder.inquiryCustomPrice !== null ? (
                      <p className="mt-2 text-slate-700">
                        Custom Price: {formatCurrency(detailOrder.inquiryCustomPrice)}
                      </p>
                    ) : (
                      <p className="mt-2 text-slate-700">
                        {detailOrder.pax ?? 0} guests at{' '}
                        {formatCurrency(detailOrder.pricePerPlate)} per plate
                      </p>
                    )}
                  </InfoCard>
                  <InfoCard label="Status">
                    <span
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                        detailOrder.status,
                      )}`}
                    >
                      {detailOrder.status}
                    </span>
                    <span
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${menuStatus.className}`}
                    >
                      {menuStatus.label}
                    </span>
                    <p className="mt-3 text-slate-500">
                      Order number #{detailOrder.orderNumber}
                    </p>
                    {detailOrder.confirmedAt ? (
                      <p className="mt-1 text-slate-500">
                        Confirmed on {formatFollowUpDate(detailOrder.confirmedAt)}
                      </p>
                    ) : null}
                  </InfoCard>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Menu Snapshot
                    </p>
                    <div className="mt-4 space-y-4">
                      {detailOrder.menuSelectionSnapshot.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                          No menu selected yet.
                        </p>
                      ) : (
                        detailOrder.menuSelectionSnapshot.map((menu) => (
                          <div
                            key={menu.menuId}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <h3 className="text-lg font-semibold text-slate-900">
                              {menu.title}
                            </h3>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                              {menu.sections.map((section) => (
                                <div key={`${menu.menuId}-${section.sectionTitle}`}>
                                  {section.sectionTitle.trim().toLowerCase() !==
                                  menu.title.trim().toLowerCase() ? (
                                    <p className="font-medium text-slate-900">
                                      {section.sectionTitle}
                                    </p>
                                  ) : null}
                                  <p>{section.items.join(', ')}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
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

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </p>
                      {detailOrder.cancelReason ? (
                        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          Cancel reason: {detailOrder.cancelReason}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {detailOrder.status === 'CONFIRMED' ? (
                          <Link
                            href={`/print/order?id=${detailOrder.id}`}
                            target="_blank"
                            className={ghostButtonCls}
                          >
                            Print
                          </Link>
                        ) : null}
                        {detailOrder.status === 'INQUIRY' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenConvertInquiry(detailOrder)}
                            className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Confirm Inquiry
                          </button>
                        ) : null}
                        {(detailOrder.status === 'INQUIRY' ||
                          detailOrder.status === 'CONFIRMED') ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailOpen(false);
                              openEditInquiry(detailOrder);
                            }}
                            className={ghostButtonCls}
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
                              openCategoryChooser(detailOrder);
                            }}
                            className={ghostButtonCls}
                          >
                            {detailOrder.categorySnapshot ? 'Change Category' : 'Choose category'}
                          </button>
                        ) : null}
                      {isCompanyAdmin &&
                      (detailOrder.status === 'INQUIRY' ||
                        detailOrder.status === 'CONFIRMED') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setCancelPopup({ order: detailOrder, reason: '' });
                          }}
                          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Cancel order
                        </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                {detailOrder.status === 'CONFIRMED' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Advance Payments
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentAmount('');
                          setPaymentPopupMode(defaultPaymentMode);
                          setPaymentRemark('');
                          setPaymentEditor({ orderId: detailOrder.id });
                          setPaymentPopup({ orderId: detailOrder.id });
                        }}
                        className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Add Advance
                      </button>
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
                              .map((payment) => (
                                <tr key={payment.id} className="border-b border-amber-100 last:border-b-0">
                                  <td className="px-3 py-3 text-slate-700">{formatFollowUpDate(payment.date)}</td>
                                  <td className="px-3 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                                  <td className="px-3 py-3 text-slate-700">{payment.paymentMode}</td>
                                  <td className="px-3 py-3 text-slate-700">{payment.remark || '-'}</td>
                                  <td className="px-3 py-3 text-slate-700">{payment.recordedByName}</td>
                                  {isCompanyAdmin ? (
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
                                  ) : null}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

function ModalShell({
  eyebrow,
  title,
  children,
  onClose,
  widthClassName = 'max-w-3xl',
  fullScreen = false,
  zIndexClassName = 'z-50',
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
  fullScreen?: boolean;
  zIndexClassName?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} bg-slate-900/50 backdrop-blur-sm ${
        fullScreen
          ? 'flex items-center justify-center px-3 py-3 sm:px-4 sm:py-4'
          : 'flex items-end justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-6'
      }`}
    >
      <div
        className={`w-full overflow-y-auto border border-slate-200 bg-white ${
          fullScreen
            ? 'max-h-[calc(100vh-1.5rem)] min-h-[calc(100vh-1.5rem)] max-w-6xl rounded-[28px] px-4 py-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)] sm:max-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-2rem)] sm:px-6 sm:py-6'
            : `max-h-[92vh] rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${widthClassName}`
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
}: {
  value: string;
  onChange: (value: string) => void;
  hourPlaceholder?: string;
  minutePlaceholder?: string;
}) {
  function parseValue(v: string) {
    if (!v) return { hour: '', minute: '', period: '' };
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
    <div className="grid grid-cols-3 gap-2">
      <select
        value={localHour}
        onChange={(e) => {
          const nextHour = e.target.value;
          setLocalHour(nextHour);
          emitTime(nextHour, localMinute, localPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1`}
      >
        <option value="">Hour</option>
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <select
        value={localMinute}
        onChange={(e) => {
          const nextMinute = e.target.value;
          setLocalMinute(nextMinute);
          emitTime(localHour, nextMinute, localPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1`}
      >
        <option value="">Min</option>
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
      <select
        value={localPeriod}
        onChange={(e) => {
          const nextPeriod = e.target.value;
          setLocalPeriod(nextPeriod);
          emitTime(localHour, localMinute, nextPeriod);
        }}
        className={`${inputCls} light-form-field min-h-12 flex-1`}
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

function monthDotClasses(status: OrderStatus) {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-emerald-500';
    case 'CANCELLED':
      return 'bg-red-400';
    case 'COMPLETED':
      return 'bg-sky-500';
    default:
      return 'bg-amber-400';
  }
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
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || firstName;

  return { firstName, lastName };
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

function formatCalendarHeading(scope: CalendarScope, value: Date) {
  if (scope === 'day') {
    return formatDisplayDate(value);
  }

  if (scope === 'week') {
    const weekDays = buildWeekDays(value);
    return `${formatDisplayDate(weekDays[0])} - ${formatDisplayDate(weekDays[6])}`;
  }

  return formatMonthLabel(value);
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

function getWeekRange(value: Date) {
  const days = buildWeekDays(value);
  return {
    from: toDateInputValue(days[0]),
    to: toDateInputValue(days[6]),
  };
}

function getDayRange(value: Date) {
  const day = toDateInputValue(value);
  return { from: day, to: day };
}

function getCalendarRange(scope: CalendarScope, value: Date) {
  if (scope === 'week') {
    return getWeekRange(value);
  }

  if (scope === 'day') {
    return getDayRange(value);
  }

  return getMonthRange(value);
}

function shiftCalendarDate(value: Date, scope: CalendarScope, direction: -1 | 1) {
  const next = new Date(value);

  if (scope === 'day') {
    next.setDate(next.getDate() + direction);
    return next;
  }

  if (scope === 'week') {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }

  return new Date(next.getFullYear(), next.getMonth() + direction, 1);
}

function buildWeekDays(value: Date) {
  const current = new Date(value);
  const start = new Date(current);
  start.setDate(current.getDate() - current.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
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

function formatTimeOptionLabel(value: string) {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;

  return `${String(hour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')} ${suffix}`;
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
