import type { DecorationBooking, DecorationBookingStatus } from '@/lib/auth/types';

export type DecorationDetailActionId =
  | 'edit'
  | 'advance'
  | 'followup'
  | 'confirm'
  | 'choose-decoration'
  | 'edit-decoration'
  | 'view'
  | 'download'
  | 'delete';

export type DecorationDetailCapabilities = {
  canEdit: boolean;
  canConfirm: boolean;
  canAddPayment: boolean;
  canManageFollowups: boolean;
  canSelectDecoration: boolean;
  canPrint: boolean;
  canDelete: boolean;
};

export type DecorationDetailAction = {
  id: DecorationDetailActionId;
  label: string;
  tone: 'secondary' | 'primary' | 'success' | 'danger';
};

type DetailBooking = Pick<
  DecorationBooking,
  'status' | 'decorationSnapshot' | 'packageRate' | 'totalCollected' | 'outstandingAmount' | 'payments'
>;

const MUTABLE_CONFIRMED_STATUSES = new Set<DecorationBookingStatus>([
  'CONFIRMED',
  'DECORATION_SELECTION_PENDING',
  'DECORATION_SELECTED',
  'IN_PROGRESS',
]);

export function canShowCustomerDocument(booking: Pick<DetailBooking, 'status' | 'decorationSnapshot'>): boolean {
  return booking.status !== 'CLOSED_INQUIRY'
    && Boolean(booking.decorationSnapshot?.length);
}

export function canSelectDecorationForStatus(status: DecorationBookingStatus): boolean {
  return status === 'INQUIRY' || MUTABLE_CONFIRMED_STATUSES.has(status);
}

export function getDecorationDetailActions(
  booking: DetailBooking,
  capabilities: DecorationDetailCapabilities,
): DecorationDetailAction[] {
  const actions: DecorationDetailAction[] = [];
  const mutable = booking.status === 'INQUIRY' || MUTABLE_CONFIRMED_STATUSES.has(booking.status);

  if (mutable && capabilities.canEdit) actions.push({ id: 'edit', label: 'Edit Inquiry', tone: 'secondary' });
  if (MUTABLE_CONFIRMED_STATUSES.has(booking.status) && booking.outstandingAmount > 0 && capabilities.canAddPayment) {
    actions.push({ id: 'advance', label: 'Add Advance', tone: 'secondary' });
  }
  if (mutable && capabilities.canManageFollowups) actions.push({ id: 'followup', label: 'Add Follow-up', tone: 'secondary' });
  if (booking.status === 'INQUIRY' && capabilities.canConfirm) {
    actions.push({ id: 'confirm', label: 'Confirm Booking', tone: 'success' });
  }
  if (canSelectDecorationForStatus(booking.status) && capabilities.canSelectDecoration) {
    const editing = Boolean(booking.decorationSnapshot?.length);
    actions.push({
      id: editing ? 'edit-decoration' : 'choose-decoration',
      label: editing ? 'Edit Decoration' : 'Choose Decoration',
      tone: 'primary',
    });
  }
  if (capabilities.canPrint && canShowCustomerDocument(booking)) {
    actions.push(
      { id: 'view', label: 'View', tone: 'secondary' },
      { id: 'download', label: 'Download', tone: 'secondary' },
    );
  }
  if (capabilities.canDelete) {
    actions.push({ id: 'delete', label: 'Delete', tone: 'danger' });
  }
  return actions;
}

export function getDecorationAdvanceSummary(booking: Pick<DetailBooking, 'packageRate' | 'totalCollected' | 'outstandingAmount'>) {
  return {
    packageAmount: booking.packageRate,
    receivedAmount: booking.totalCollected,
    outstandingAmount: booking.outstandingAmount,
  };
}

export function getDecorationAdvanceRows(booking: Pick<DetailBooking, 'payments'>) {
  return booking.payments
    .map((payment) => ({
      id: payment._id,
      amount: payment.amount,
      mode: payment.mode,
      date: payment.date,
      remark: payment.remark?.trim() || '—',
      recordedBy: payment.recordedBy?.trim() || '—',
    }))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}
