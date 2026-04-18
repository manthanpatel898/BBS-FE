export type UserRole = 'super_admin' | 'company_admin' | 'employee';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  designation?: string | null;
  role: UserRole;
  restaurantId: string | null;
  canAccessCancelledBookings?: boolean;
  canAccessVoucherFlow?: boolean;
  restaurantLogoUrl?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  isFirstLogin: boolean;
  isActive: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SubscriptionLog {
  action: 'activated' | 'deactivated' | 're-subscribed';
  endDate?: string | null;
  notes?: string | null;
  performedAt: string;
}

export interface SubscriptionStatus {
  isExpired: boolean;
  isInGracePeriod: boolean;
  isWithinWarningWindow: boolean;
  isAccessAllowed: boolean;
  daysUntilExpiry: number;
  graceDaysRemaining: number;
  warningStartsInDays: number;
  gracePeriodDays: number;
  severity: 'info' | 'warning' | 'critical' | null;
  message: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonNumber: string;
  contactNumbers: string[];
  website: string | null;
  logoUrl: string | null;
  address: string;
  startDate: string;
  endDate: string;
  bookingPrefix: string;
  enableCancelledBookings?: boolean;
  enableVoucherFlow?: boolean;
  enableWhatsappNotifications?: boolean;
  isActive?: boolean;
  subscriptionStatus?: SubscriptionStatus | null;
  notes?: string | null;
  subscriptionLogs?: SubscriptionLog[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRestaurants {
  items: Restaurant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogItem {
  id: string;
  module: string;
  action: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  entityType: string | null;
  entityId: string | null;
  restaurantId: string | null;
  actor: {
    userId: string | null;
    name: string | null;
    role: string | null;
  } | null;
  route: string | null;
  method: string | null;
  summary: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  contactNo: string;
  designation: string | null;
  role: UserRole;
  restaurantId: string | null;
  isFirstLogin: boolean;
  isActive: boolean;
}

export interface PaginatedEmployees {
  items: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Category {
  menuRules: CategoryMenuRule[];
  id: string;
  restaurantId: string;
  name: string;
  pricePerPlate: number;
  description: string | null;
  isActive?: boolean;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMenuRule {
  menuId: string;
  menuTitle: string;
  displayOrder?: number;
  sectionTitle: string;
  allowedItems: string[];
  selectionLimit: number;
}

export interface PaginatedCategories {
  items: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MenuSection {
  sectionTitle: string;
  items: string[];
  hotSellingItems?: string[];
}

export interface Menu {
  id: string;
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  title: string;
  displayOrder: number;
  sections: MenuSection[];
  hotSelling?: boolean;
  isActive?: boolean;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMenus {
  items: Menu[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'INQUIRY' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMode = string;

export interface SettingOption {
  id: string;
  label: string;
}

export interface AppSettings {
  id: string;
  restaurantId: string;
  paymentOptions: SettingOption[];
  eventOptions: SettingOption[];
  eventPlanners: SettingOption[];
  hallDetails: SettingOption[];
  hiddenHallDetailCombinations: string[];
  showHallBookingInformation?: boolean;
  banquetRules: SettingOption[];
  addonServices: SettingOption[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderCategorySnapshot {
  categoryId: string;
  name: string;
  pricePerPlate: number;
  description: string | null;
}

export interface OrderMenuSelectionSnapshot {
  menuId: string;
  title: string;
  sections: MenuSection[];
}

export interface OrderAddonServiceSnapshot {
  addonServiceId: string;
  label: string;
  price: number;
}

export interface OrderFollowUp {
  followUpByName: string;
  date: string;
  nextFollowUpDate: string | null;
  note: string;
  createdAt: string;
}

export interface OrderAdvancePayment {
  id: string;
  amount: number;
  paymentMode: PaymentMode;
  date: string;
  remark: string | null;
  recordedByName: string;
  createdAt: string;
}

export interface OrderDiningRedemption {
  id: string;
  amount: number;
  date: string;
  remark: string | null;
  recordedByName: string;
  createdAt: string;
}

export interface OrderVoucher {
  voucherNumber: string;
  voucherUrl: string;
  customerName: string;
  bookingId: string;
  amount: number;
  generatedByName: string;
  issuedAt: string;
}

export interface MenuSelectionSession {
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  trigger: 'initial' | 'change';
  categoryIdBefore: string | null;
  categoryIdAfter: string | null;
  savedByName: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  customer: Customer;
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  pax: number | null;
  eventType: string | null;
  functionName: string | null;
  eventDate: string | null;
  inquiryDate: string | null;
  confirmedAt: string | null;
  startTime: string | null;
  endTime: string | null;
  categorySnapshot: OrderCategorySnapshot | null;
  menuSelectionSnapshot: OrderMenuSelectionSnapshot[];
  pricePerPlate: number;
  customPricePerPlate: number | null;
  inquiryCustomPrice: number | null;
  baseTotal: number;
  addonServiceSnapshots: OrderAddonServiceSnapshot[];
  extrasTotal: number;
  discountAmount: number;
  grandTotal: number;
  advanceAmount: number;
  paymentMode: PaymentMode | null;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  inquiryToConfirmationDays?: number | null;
  jainSwaminarayanPax: number | null;
  jainSwaminarayanDetails: string | null;
  seatingRequired: number | null;
  serviceSlot: string | null;
  hallDetails: string | null;
  referenceBy: string | null;
  additionalInformation: string | null;
  cancelReason: string | null;
  voucher: OrderVoucher | null;
  menuSelectionSessions?: MenuSelectionSession[];
  followUps: OrderFollowUp[];
  advancePayments: OrderAdvancePayment[];
  diningRedemptions: OrderDiningRedemption[];
  currentEventPlanner: {
    plannerName: string;
    assignedAt: string;
    assignedByName: string;
  } | null;
  eventPlannerAssignments: Array<{
    plannerName: string;
    assignedAt: string;
    assignedByName: string;
  }>;
  redeemableBalance: number;
  cancelAdvanceManagement: CancelAdvanceManagement | null;
  bookingTakenBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CancelAdvanceOption = 'DINE_IN' | 'PAY_BACK' | 'NEXT_BOOKING' | 'NO_PAY_BACK';
export type CancelAdvanceStatus = 'PENDING_OPTION' | 'ACTIVE' | 'SETTLED' | 'FORFEITED';
export type ForfeitedReason = 'NO_PAY_BACK' | 'DINE_IN_EXPIRED' | 'NEXT_BOOKING_EXPIRED';

export interface DineInUsage {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  acceptedByName: string;
  remainingAfter: number;
  createdAt: string;
}

export interface PayoutEntry {
  amount: number;
  date: string;
  mode: 'CASH' | 'ONLINE';
  note: string | null;
  processedByName: string;
  createdAt: string;
}

export interface NextBookingUsage {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  processedByName: string;
  remainingAfter: number;
  createdAt: string;
}

export interface CancelAdvanceManagement {
  option: CancelAdvanceOption | null;
  expiryDate: string | null;
  status: CancelAdvanceStatus;
  initialAdvanceAmount: number;
  remainingBalance: number;
  dineInUsages: DineInUsage[];
  payoutEntry: PayoutEntry | null;
  nextBookingUsages: NextBookingUsage[];
  forfeitedAmount: number | null;
  forfeitedAt: string | null;
  forfeitedReason: ForfeitedReason | null;
  forfeitedByName: string | null;
}

export interface CustomerWalletItem {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  cancelDate: string;
  eventDate: string | null;
  cancelReason: string | null;
  advanceAmount: number;
  advancePayments: OrderAdvancePayment[];
  cancelAdvanceManagement: CancelAdvanceManagement | null;
}

export interface PaginatedCustomerWallet {
  items: CustomerWalletItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdvanceSummary {
  confirmedAdvance: number;
  cancelledAdvance: number;
  forfeitedAdvance: number;
  total: number;
}

export interface TreasuryLedgerEntry {
  date: string;
  createdAt: string;
  type: string;
  typeLabel: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  bookingDate?: string | null;
  cancelDate?: string | null;
  amount: number;
  mode?: string;
  note?: string;
  performedBy?: string;
  runningBalance: number;
}

export interface TreasuryReport {
  entries: TreasuryLedgerEntry[];
  summary: {
    totalAdvanceReceived: number;
    totalDineInUsed: number;
    totalPayouts: number;
    totalNextBookingApplied: number;
    totalForfeited: number;
  };
}

export interface CalendarOrder {
  id: string;
  orderId: string;
  status: OrderStatus;
  eventType?: string;
  functionName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  pax: number;
  serviceSlot: string | null;
  hallDetails: string | null;
  hasMenuSelection: boolean;
  customerName: string;
}

export interface PaginatedOrders {
  items: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RestaurantStats {
  total: number;
  active: number;
  addedThisMonth: number;
  expiringSoon: number;
  expired: number;
  expiringSoonList: Restaurant[];
  recentlyAdded: Restaurant[];
}

export interface OrderStats {
  total: number;
  inquiries: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  followUps: number;
  monthRevenue: number;
  monthAdvance: number;
  monthAdvanceByPaymentMethod: Array<{
    label: string;
    amount: number;
    count: number;
  }>;
  avgMenuSelectionDurationSeconds: number;
  avgInitialMenuSelectionDurationSeconds: number;
  avgCategoryChangeDurationSeconds: number;
  menuSelectionSampleCount: number;
  avgInquiryToConfirmationDays: number;
  inquiryToConfirmationSampleCount: number;
  confirmationConversionRate: number;
}

export interface ReportMetric {
  label: string;
  bookings: number;
  revenue: number;
}

export interface ReportCategory {
  name: string;
  bookings: number;
  revenue: number;
}

export interface ReportMenuItem {
  name: string;
  count: number;
  categories: string[];
}

export interface OrderReports {
  highestSellingCategories: ReportCategory[];
  busiestMonth: ReportMetric;
  yearComparison: {
    current: ReportMetric;
    previous: ReportMetric;
  };
  monthComparison: {
    current: ReportMetric;
    previous: ReportMetric;
  };
  bestSellingMenuItems: ReportMenuItem[];
}

export interface AdvancePaymentReportRow {
  orderId: string;
  customerName: string;
  customerPhone: string;
  eventType: string | null;
  functionDate: string | null;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  recordedByName: string;
  remark: string | null;
}

export interface EventPlannerReportRow {
  orderId: string;
  plannerName: string;
  assignedAt: string;
  assignedByName: string;
  customerName: string;
  customerPhone: string;
  eventType: string | null;
  functionDate: string | null;
  pax: number | null;
  serviceSlot: string | null;
  hallDetails: string | null;
}

export interface ItemSalesReportRow {
  itemName: string;
  timesSold: number;
  subitems: string[];
}

export interface PendingPaymentReportRow {
  orderId: string;
  customerName: string;
  customerPhone: string;
  eventType: string | null;
  functionDate: string | null;
  serviceSlot: string | null;
  hallDetails: string | null;
  pax: number | null;
  grandTotal: number;
  advanceAmount: number;
  pendingAmount: number;
  inquiryDate: string;
}

export interface RevenueReportRow {
  label: string;
  bookings: number;
  revenue: number;
  totalPax: number;
  avgRevenue: number;
}

export interface UpcomingEventReportRow {
  orderId: string;
  customerName: string;
  customerPhone: string;
  eventType: string | null;
  functionDate: string | null;
  serviceSlot: string | null;
  hallDetails: string | null;
  pax: number | null;
  grandTotal: number;
  advanceAmount: number;
  pendingAmount: number;
  plannerName: string | null;
}

export interface HallOccupancyReportRow {
  hall: string;
  bookings: number;
  revenue: number;
  totalPax: number;
  avgPax: number;
}

export interface RepeatCustomerReportRow {
  customerName: string;
  customerPhone: string;
  totalBookings: number;
  totalRevenue: number;
  lastBookingDate: string | null;
  firstBookingDate: string | null;
}

export interface HotDate {
  id: string;
  restaurantId: string;
  year: number;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkUploadError {
  row: number;
  message: string;
}

export interface BulkUploadResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: BulkUploadError[];
}
