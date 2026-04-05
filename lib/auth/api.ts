import {
  ApiEnvelope,
  AppSettings,
  Employee,
  AuthSession,
  AuthUser,
  BulkUploadResult,
  CalendarOrder,
  Category,
  Customer,
  HotDate,
  Menu,
  Order,
  OrderReports,
  AdvancePaymentReportRow,
  OrderStats,
  PaymentMode,
  OrderStatus,
  PaginatedEmployees,
  PaginatedCategories,
  PaginatedMenus,
  PaginatedOrders,
  PaginatedRestaurants,
  Restaurant,
  RestaurantStats,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : 'Request failed';
    throw new Error(message);
  }

  return payload.data;
}

export async function loginRequest(identifier: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, password }),
  });

  return parseResponse<AuthSession>(response);
}

export async function changePasswordRequest(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return parseResponse<AuthSession>(response);
}

export async function fetchProfile(accessToken: string) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse<AuthUser>(response);
}

async function authorizedRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
}

export async function fetchRestaurants(
  accessToken: string,
  params: { page: number; limit: number; search: string },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  return authorizedRequest<PaginatedRestaurants>(
    `/restaurants?${query.toString()}`,
    accessToken,
  );
}

export async function fetchRestaurantById(accessToken: string, restaurantId: string) {
  return authorizedRequest<Restaurant>(`/restaurants/${restaurantId}`, accessToken);
}

export async function fetchMyRestaurant(accessToken: string) {
  return authorizedRequest<Restaurant>('/restaurants/me', accessToken);
}

export async function createRestaurant(
  accessToken: string,
  payload: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionLogs'>,
) {
  return authorizedRequest<{ restaurant: Restaurant }>('/restaurants', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRestaurant(
  accessToken: string,
  restaurantId: string,
  payload: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionLogs'>,
) {
  return authorizedRequest<Restaurant>(
    `/restaurants/${restaurantId}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMyRestaurantBranding(
  accessToken: string,
  payload: Pick<Restaurant, 'name' | 'logoUrl' | 'contactNumbers'>,
) {
  return authorizedRequest<Restaurant>('/restaurants/me/branding', accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteRestaurant(accessToken: string, restaurantId: string) {
  return authorizedRequest<null>(`/restaurants/${restaurantId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function activateRestaurant(
  accessToken: string,
  restaurantId: string,
  endDate: string,
  notes?: string,
) {
  return authorizedRequest<Restaurant>(
    `/restaurants/${restaurantId}/activate`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ endDate, notes }),
    },
  );
}

export async function deactivateRestaurant(accessToken: string, restaurantId: string) {
  return authorizedRequest<Restaurant>(
    `/restaurants/${restaurantId}/deactivate`,
    accessToken,
    { method: 'PATCH' },
  );
}

export async function fetchEmployees(
  accessToken: string,
  params: { page: number; limit: number; search: string },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  return authorizedRequest<PaginatedEmployees>(
    `/employees?${query.toString()}`,
    accessToken,
  );
}

export async function createEmployee(
  accessToken: string,
  payload: Pick<Employee, 'firstName' | 'lastName' | 'username' | 'contactNo' | 'designation'> & {
    password: string;
    role: string;
  },
) {
  return authorizedRequest<Employee>('/employees', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(
  accessToken: string,
  employeeId: string,
  payload: Pick<
    Employee,
    'firstName' | 'lastName' | 'username' | 'contactNo' | 'designation' | 'isActive'
  > & { role: string; password?: string },
) {
  return authorizedRequest<Employee>(`/employees/${employeeId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployee(accessToken: string, employeeId: string) {
  return authorizedRequest<null>(`/employees/${employeeId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function fetchCategories(
  accessToken: string,
  params: {
    page: number;
    limit: number;
    search: string;
    restaurantId?: string;
  },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.restaurantId?.trim()) {
    query.set('restaurantId', params.restaurantId.trim());
  }

  return authorizedRequest<PaginatedCategories>(
    `/categories?${query.toString()}`,
    accessToken,
  );
}

export async function createCategory(
  accessToken: string,
  payload: {
    name: string;
    pricePerPlate: number;
    description: string | null;
    menuRules: Array<{
      menuId: string;
      sectionTitle: string;
      allowedItems: string[];
      selectionLimit: number;
    }>;
    restaurantId?: string;
  },
) {
  return authorizedRequest<Category>('/categories', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  payload: {
    name: string;
    pricePerPlate: number;
    description: string | null;
    menuRules: Array<{
      menuId: string;
      sectionTitle: string;
      allowedItems: string[];
      selectionLimit: number;
    }>;
  },
) {
  return authorizedRequest<Category>(`/categories/${categoryId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(accessToken: string, categoryId: string) {
  return authorizedRequest<null>(`/categories/${categoryId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function fetchMenus(
  accessToken: string,
  params: {
    page: number;
    limit: number;
    search: string;
    categoryId?: string;
    restaurantId?: string;
  },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.categoryId?.trim()) {
    query.set('categoryId', params.categoryId.trim());
  }

  if (params.restaurantId?.trim()) {
    query.set('restaurantId', params.restaurantId.trim());
  }

  return authorizedRequest<PaginatedMenus>(
    `/menus?${query.toString()}`,
    accessToken,
  );
}

export async function createMenu(
  accessToken: string,
  payload: Pick<Menu, 'title' | 'sections'> & {
    categoryId?: string;
    restaurantId?: string;
  },
) {
  return authorizedRequest<Menu>('/menus', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMenu(
  accessToken: string,
  menuId: string,
  payload: Pick<Menu, 'title' | 'sections'> & {
    categoryId?: string;
  },
) {
  return authorizedRequest<Menu>(`/menus/${menuId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMenu(accessToken: string, menuId: string) {
  return authorizedRequest<null>(`/menus/${menuId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function lookupCustomerByPhone(accessToken: string, phone: string) {
  const query = new URLSearchParams({ phone });
  return authorizedRequest<Customer | null>(
    `/customers/lookup?${query.toString()}`,
    accessToken,
  );
}

export async function fetchOrders(
  accessToken: string,
  params: {
    page: number;
    limit: number;
    search: string;
    status: string;
    eventType?: string;
    functionName?: string;
    from?: string;
    to?: string;
    inquiryFrom?: string;
    inquiryTo?: string;
    hasAdvancePayments?: boolean;
  },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.status.trim()) {
    query.set('status', params.status.trim());
  }

  if (params.eventType?.trim()) {
    query.set('eventType', params.eventType.trim());
  }

  if (params.functionName?.trim()) {
    query.set('functionName', params.functionName.trim());
  }

  if (params.from?.trim()) {
    query.set('from', params.from.trim());
  }

  if (params.to?.trim()) {
    query.set('to', params.to.trim());
  }

  if (params.inquiryFrom?.trim()) {
    query.set('inquiryFrom', params.inquiryFrom.trim());
  }

  if (params.inquiryTo?.trim()) {
    query.set('inquiryTo', params.inquiryTo.trim());
  }

  if (params.hasAdvancePayments) {
    query.set('hasAdvancePayments', 'true');
  }

  return authorizedRequest<PaginatedOrders>(`/orders?${query.toString()}`, accessToken);
}

export async function fetchCalendarOrders(
  accessToken: string,
  params: { from: string; to: string },
) {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
  });

  return authorizedRequest<CalendarOrder[]>(
    `/orders/calendar?${query.toString()}`,
    accessToken,
  );
}

export async function fetchOrderById(accessToken: string, orderId: string) {
  return authorizedRequest<Order>(`/orders/${orderId}`, accessToken);
}

export async function fetchOrderPrint(accessToken: string, orderId: string) {
  return authorizedRequest<Order>(`/orders/${orderId}/print`, accessToken);
}

export async function createOrder(
  accessToken: string,
  payload: {
    customer: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    };
    status?: 'INQUIRY' | 'CONFIRMED';
    pax?: number;
    eventType?: string;
    functionName?: string;
    eventDate?: string;
    inquiryDate?: string;
    startTime?: string;
    endTime?: string;
    categoryId?: string;
    addonServiceIds?: string[];
    addonServiceId?: string;
    addonServices?: Array<{ id?: string; label: string; price: number }>;
    customPricePerPlate?: number;
    selectedMenus?: Array<{
      menuId: string;
      sections: Array<{
        sectionTitle: string;
        items: string[];
      }>;
    }>;
    extrasTotal?: number;
    discountAmount?: number;
    advanceAmount?: number;
    paymentMode?: PaymentMode;
    notes?: string;
    jainSwaminarayanPax?: number;
    jainSwaminarayanDetails?: string;
    seatingRequired?: number;
    serviceSlot?: string;
    hallDetails?: string;
    referenceBy?: string;
    additionalInformation?: string;
    menuSelectionTracking?: {
      startedAt: string;
      trigger: 'initial' | 'change';
    };
  },
) {
  return authorizedRequest<Order>('/orders', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOrder(
  accessToken: string,
  orderId: string,
  payload: {
    customer?: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    };
    status?: OrderStatus;
    pax?: number;
    eventType?: string;
    functionName?: string;
    eventDate?: string;
    inquiryDate?: string;
    startTime?: string;
    endTime?: string;
    categoryId?: string;
    addonServiceIds?: string[];
    addonServiceId?: string;
    addonServices?: Array<{ id?: string; label: string; price: number }>;
    customPricePerPlate?: number;
    selectedMenus?: Array<{
      menuId: string;
      sections: Array<{
        sectionTitle: string;
        items: string[];
      }>;
    }>;
    extrasTotal?: number;
    discountAmount?: number;
    advanceAmount?: number;
    paymentMode?: PaymentMode;
    notes?: string;
    jainSwaminarayanPax?: number;
    jainSwaminarayanDetails?: string;
    seatingRequired?: number;
    serviceSlot?: string;
    hallDetails?: string;
    referenceBy?: string;
    additionalInformation?: string;
    menuSelectionTracking?: {
      startedAt: string;
      trigger: 'initial' | 'change';
    };
  },
) {
  return authorizedRequest<Order>(`/orders/${orderId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteOrder(accessToken: string, orderId: string) {
  return authorizedRequest<null>(`/orders/${orderId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function confirmInquiry(
  accessToken: string,
  orderId: string,
  payload: {
    advanceAmount?: number;
    paymentMode?: PaymentMode;
    extrasTotal?: number;
    discountAmount?: number;
    remark?: string;
  },
) {
  return authorizedRequest<Order>(`/orders/${orderId}/confirm`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelOrder(
  accessToken: string,
  orderId: string,
  payload?: { reason?: string; generateVoucher?: boolean },
) {
  return authorizedRequest<Order>(`/orders/${orderId}/cancel`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchVouchers(
  accessToken: string,
  params: { page: number; limit: number; search: string },
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  return authorizedRequest<PaginatedOrders>(
    `/orders/vouchers?${query.toString()}`,
    accessToken,
  );
}

export async function downloadVoucherFile(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/voucher/download`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to download voucher.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  const filename = filenameMatch?.[1] ?? 'voucher.png';
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function addOrderFollowUp(
  accessToken: string,
  orderId: string,
  payload: { note: string; date?: string; nextFollowUpDate?: string },
) {
  return authorizedRequest<Order>(`/orders/${orderId}/follow-ups`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addAdvancePayment(
  accessToken: string,
  orderId: string,
  payload: { amount: number; paymentMode: PaymentMode; date?: string; remark?: string },
) {
  return authorizedRequest<Order>(`/orders/${orderId}/advance-payments`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addDiningRedemption(
  accessToken: string,
  orderId: string,
  payload: { amount: number; date?: string; remark?: string },
) {
  return authorizedRequest<Order>(`/orders/${orderId}/dining-redemptions`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateAdvancePayment(
  accessToken: string,
  orderId: string,
  paymentId: string,
  payload: { amount: number; paymentMode: PaymentMode; date?: string; remark?: string },
) {
  return authorizedRequest<Order>(
    `/orders/${orderId}/advance-payments/${paymentId}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteAdvancePayment(
  accessToken: string,
  orderId: string,
  paymentId: string,
) {
  return authorizedRequest<Order>(
    `/orders/${orderId}/advance-payments/${paymentId}`,
    accessToken,
    {
      method: 'DELETE',
    },
  );
}

export async function forgotPasswordRequest(email: string) {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse<null>(response);
}

export async function resetPasswordWithTokenRequest(token: string, newPassword: string) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return parseResponse<null>(response);
}

export async function fetchRestaurantStats(accessToken: string) {
  return authorizedRequest<RestaurantStats>('/restaurants/stats', accessToken);
}

export async function fetchOrderStats(accessToken: string) {
  return authorizedRequest<OrderStats>('/orders/stats', accessToken);
}

export async function fetchOrderReports(accessToken: string) {
  return authorizedRequest<OrderReports>('/orders/reports', accessToken);
}

export async function fetchAdvancePaymentsReport(
  accessToken: string,
  params: {
    from?: string;
    to?: string;
    paymentMode?: string;
    customer?: string;
  },
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return authorizedRequest<AdvancePaymentReportRow[]>(
    `/orders/advance-payments-report${query ? `?${query}` : ''}`,
    accessToken,
  );
}

export async function fetchSettings(accessToken: string) {
  return authorizedRequest<AppSettings>('/settings', accessToken);
}

export async function createPaymentOption(accessToken: string, label: string) {
  return authorizedRequest<AppSettings>('/settings/payment-options', accessToken, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function updatePaymentOption(
  accessToken: string,
  optionId: string,
  label: string,
) {
  return authorizedRequest<AppSettings>(`/settings/payment-options/${optionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export async function deletePaymentOption(accessToken: string, optionId: string) {
  return authorizedRequest<AppSettings>(`/settings/payment-options/${optionId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function createEventOption(accessToken: string, label: string) {
  return authorizedRequest<AppSettings>('/settings/event-options', accessToken, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function createHallDetail(accessToken: string, label: string) {
  return authorizedRequest<AppSettings>('/settings/hall-details', accessToken, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function updateHallDetail(
  accessToken: string,
  optionId: string,
  label: string,
) {
  return authorizedRequest<AppSettings>(`/settings/hall-details/${optionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export async function deleteHallDetail(accessToken: string, optionId: string) {
  return authorizedRequest<AppSettings>(`/settings/hall-details/${optionId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function updateHallBookingInformationVisibility(
  accessToken: string,
  enabled: boolean,
) {
  return authorizedRequest<AppSettings>('/settings/hall-booking-information', accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function updateEventOption(
  accessToken: string,
  optionId: string,
  label: string,
) {
  return authorizedRequest<AppSettings>(`/settings/event-options/${optionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export async function deleteEventOption(accessToken: string, optionId: string) {
  return authorizedRequest<AppSettings>(`/settings/event-options/${optionId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function createBanquetRule(accessToken: string, label: string) {
  return authorizedRequest<AppSettings>('/settings/banquet-rules', accessToken, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function createAddonService(
  accessToken: string,
  label: string,
) {
  return authorizedRequest<AppSettings>('/settings/addon-services', accessToken, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function updateAddonService(
  accessToken: string,
  optionId: string,
  label: string,
) {
  return authorizedRequest<AppSettings>(`/settings/addon-services/${optionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export async function deleteAddonService(accessToken: string, optionId: string) {
  return authorizedRequest<AppSettings>(`/settings/addon-services/${optionId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function updateBanquetRule(
  accessToken: string,
  optionId: string,
  label: string,
) {
  return authorizedRequest<AppSettings>(`/settings/banquet-rules/${optionId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export async function deleteBanquetRule(accessToken: string, optionId: string) {
  return authorizedRequest<AppSettings>(`/settings/banquet-rules/${optionId}`, accessToken, {
    method: 'DELETE',
  });
}

// ── Hot Dates ──────────────────────────────────────────────────────────────────

export async function fetchHotDates(accessToken: string, year: number) {
  return authorizedRequest<HotDate[]>(`/hot-dates?year=${year}`, accessToken);
}

export async function createHotDate(
  accessToken: string,
  payload: { year: number; date: string; description: string },
) {
  return authorizedRequest<HotDate>('/hot-dates', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHotDate(
  accessToken: string,
  id: string,
  payload: { date?: string; description?: string },
) {
  return authorizedRequest<HotDate>(`/hot-dates/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteHotDate(accessToken: string, id: string) {
  return authorizedRequest<null>(`/hot-dates/${id}`, accessToken, {
    method: 'DELETE',
  });
}

export async function uploadLogo(accessToken: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  const payload = (await response.json()) as ApiEnvelope<{ url: string }>;
  if (!response.ok || !payload.success) {
    const message =
      typeof payload.message === 'string' ? payload.message : 'Upload failed';
    throw new Error(message);
  }
  return payload.data.url;
}

export async function bulkUploadHotDates(
  accessToken: string,
  year: number,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const response = await fetch(`${API_URL}/hot-dates/bulk?year=${year}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  const payload = (await response.json()) as ApiEnvelope<BulkUploadResult>;
  if (!response.ok || !payload.success) {
    const message =
      typeof payload.message === 'string' ? payload.message : 'Upload failed';
    throw new Error(message);
  }
  return payload.data;
}
