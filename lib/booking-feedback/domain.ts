import { OrderStatus } from '@/lib/auth/types';
export function canShowBookingFeedbackAction(input: { enabled: boolean; status: OrderStatus; eventDate: string | null; today: string; canManage: boolean }) {
  return Boolean(input.enabled && input.canManage && input.status === 'COMPLETED' && input.eventDate && input.eventDate.slice(0, 10) < input.today);
}
export function bookingFeedbackAverage(ratings: number[]) { return ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 100) / 100 : 0; }
