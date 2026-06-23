import { AuthUser } from './types';

export const PERMISSIONS = {
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CALENDAR_VIEW: 'bookings.calendar.view',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_UPDATE: 'bookings.update',
  BOOKINGS_DELETE: 'bookings.delete',
  BOOKINGS_PRINT: 'bookings.print',
  BOOKINGS_CONFIRM: 'bookings.confirm',
  BOOKINGS_SIGNATURE_VIEW: 'bookings.signature.view',
  BOOKINGS_SIGNATURE_SAVE: 'bookings.signature.save',
  BOOKINGS_FOLLOWUPS_MANAGE: 'bookings.followups.manage',
  BOOKINGS_EVENT_PLANNER_ASSIGN: 'bookings.event_planner.assign',
  BOOKINGS_ADVANCE_PAYMENTS_ADD: 'bookings.advance_payments.add',
  BOOKINGS_ADVANCE_PAYMENTS_EDIT: 'bookings.advance_payments.edit',
  BOOKINGS_ADVANCE_PAYMENTS_DELETE: 'bookings.advance_payments.delete',
  BOOKINGS_DINING_REDEMPTIONS_MANAGE: 'bookings.dining_redemptions.manage',
  BOOKINGS_CANCEL: 'bookings.cancel',
  BOOKINGS_CANCEL_ADVANCE_MANAGE: 'bookings.cancel_advance.manage',
  BOOKINGS_CUSTOMER_WALLET_VIEW: 'bookings.customer_wallet.view',
  BOOKINGS_VOUCHERS_VIEW: 'bookings.vouchers.view',
  BOOKINGS_CANCELLED_VIEW: 'bookings.cancelled.view',
  BOOKINGS_FIELD_CUSTOMER_NAME_UPDATE: 'bookings.fields.customer_name.update',
  BOOKINGS_FIELD_EVENT_NAME_UPDATE: 'bookings.fields.event_name.update',
  BOOKINGS_FIELD_FUNCTION_DATE_UPDATE: 'bookings.fields.function_date.update',
  BOOKINGS_FIELD_FUNCTION_TIME_AFTER_MENU_UPDATE:
    'bookings.fields.function_time_after_menu.update',
  BOOKINGS_FIELD_SERVICE_SLOT_UPDATE: 'bookings.fields.service_slot.update',
  BOOKINGS_FIELD_CUSTOM_PRICE_AFTER_MENU_UPDATE:
    'bookings.fields.custom_price_after_menu.update',
  BOOKINGS_FIELD_EXTRAS_TOTAL_UPDATE: 'bookings.fields.extras_total.update',
  BOOKINGS_FIELD_DISCOUNT_UPDATE: 'bookings.fields.discount.update',
  BOOKINGS_FIELD_ADVANCE_AMOUNT_UPDATE: 'bookings.fields.advance_amount.update',
  BOOKINGS_FIELD_PAYMENT_MODE_UPDATE: 'bookings.fields.payment_mode.update',
  BOOKINGS_FIELD_STATUS_UPDATE: 'bookings.fields.status.update',
  EMPLOYEES_PERMISSIONS_VIEW: 'employees.permissions.view',
  EMPLOYEES_PERMISSIONS_MANAGE: 'employees.permissions.manage',
} as const;

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  return Boolean(user?.effectivePermissions?.includes(permission));
}
