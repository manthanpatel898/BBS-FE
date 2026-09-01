import { OrderStatus } from '@/lib/auth/types';
import type { BookingFeedbackQuestion } from './types';
export const DEFAULT_BOOKING_FEEDBACK_QUESTIONS: BookingFeedbackQuestion[] = [
  { id: 'overall-experience', text: 'How satisfied were you with the overall event experience?', active: true, displayOrder: 0 },
  { id: 'food-quality', text: 'How would you rate the food quality and presentation?', active: true, displayOrder: 1 },
  { id: 'staff-service', text: 'How would you rate the staff service and hospitality?', active: true, displayOrder: 2 },
  { id: 'venue-experience', text: 'How satisfied were you with the venue setup, cleanliness, and ambience?', active: true, displayOrder: 3 },
  { id: 'recommendation', text: 'How likely are you to recommend this banquet venue to others?', active: true, displayOrder: 4 },
];
export function resolveBookingFeedbackQuestions(questions?: BookingFeedbackQuestion[]) {
  const valid = questions?.filter((question) => question.id?.trim() && question.text?.trim()) ?? [];
  return valid.length ? valid : DEFAULT_BOOKING_FEEDBACK_QUESTIONS.map((question) => ({ ...question }));
}
export function buildBookingFeedbackAnswers(questions: Array<{ id: string }>, ratings: Record<string, number>) {
  const answers = questions.filter((question) => Number.isInteger(ratings[question.id])).map((question) => ({ questionId: question.id, rating: ratings[question.id] }));
  if (!answers.length) throw new Error('Please answer at least one question.');
  return answers;
}
export function validateStaffFeedbackCapture(input: { captureMethod: string; captureMethodOther?: string; consentConfirmed: boolean }) {
  if (!input.captureMethod) throw new Error('Please select how the feedback was captured.');
  if (input.captureMethod === 'OTHER' && !input.captureMethodOther?.trim()) throw new Error('Please describe how the feedback was captured.');
  if (!input.consentConfirmed) throw new Error('Please confirm that the customer supplied or approved this feedback.');
}
export function normalizeBookingFeedbackExpiryDays(value?: number) {
  const days = Number.isFinite(value) ? Math.round(value as number) : 15;
  return Math.min(90, Math.max(1, days));
}
export function canShowBookingFeedbackAction(input: { enabled: boolean; status: OrderStatus; eventDate: string | null; today: string; canManage: boolean }) {
  return Boolean(input.enabled && input.canManage && ['CONFIRMED', 'COMPLETED'].includes(input.status) && input.eventDate && input.eventDate.slice(0, 10) < input.today);
}
export function bookingFeedbackAverage(ratings: number[]) { return ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 100) / 100 : 0; }
