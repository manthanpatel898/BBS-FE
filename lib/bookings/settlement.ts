import { banquetBusinessDate } from '../banquet/booking-edit-window';
export function canSettleBooking(input: { businessType?: string; enabled?: boolean; status: string; eventDate?: string | null; today?: string }) {
  const date = input.eventDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return input.businessType === 'BANQUET' && input.enabled === true && ['CONFIRMED', 'COMPLETED'].includes(input.status) && Boolean(date && date < (input.today ?? banquetBusinessDate()));
}
