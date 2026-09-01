import { authorizedRequest } from '@/lib/auth/api';
import { AppSettings } from '@/lib/auth/types';
import { BookingFeedbackCaptureMethod, BookingFeedbackReport, BookingFeedbackResponse, BookingFeedbackState, PublicBookingFeedback } from './types';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const updateBookingFeedbackSettings = (token: string, input: { enableBookingFeedback: boolean; bookingFeedbackLinkExpiryDays: number; questions: Array<{ id: string; text: string; active: boolean; displayOrder: number }> }) => authorizedRequest<AppSettings>('/settings/booking-feedback', token, { method: 'PATCH', body: JSON.stringify(input) });
export const getBookingFeedbackState = (token: string, orderId: string) => authorizedRequest<BookingFeedbackState>(`/orders/${encodeURIComponent(orderId)}/booking-feedback`, token);
export const generateBookingFeedbackLink = (token: string, orderId: string, regenerate = false) => authorizedRequest<{ state: 'PENDING'; invitationId: string; expiresAt: string; link: string }>(`/orders/${encodeURIComponent(orderId)}/booking-feedback${regenerate ? '/regenerate' : ''}`, token, { method: 'POST' });
export const submitStaffBookingFeedback = (token: string, orderId: string, input: { answers: Array<{ questionId: string; rating: number }>; comment?: string; captureMethod: BookingFeedbackCaptureMethod; captureMethodOther?: string; staffContext?: string; consentConfirmed: true }) => authorizedRequest<BookingFeedbackResponse>(`/orders/${encodeURIComponent(orderId)}/booking-feedback/staff-entry`, token, { method: 'POST', body: JSON.stringify(input) });
export const updateBookingFeedbackNote = (token: string, orderId: string, internalNote: string) => authorizedRequest<BookingFeedbackResponse>(`/orders/${encodeURIComponent(orderId)}/booking-feedback/internal-note`, token, { method: 'PATCH', body: JSON.stringify({ internalNote }) });
export const createBookingFeedbackFollowUp = (token: string, orderId: string, input: { note: string; dueDate?: string; assigneeUserId?: string }) => authorizedRequest<BookingFeedbackResponse>(`/orders/${encodeURIComponent(orderId)}/booking-feedback/follow-up`, token, { method: 'POST', body: JSON.stringify(input) });
export const resolveBookingFeedbackFollowUp = (token: string, orderId: string, resolutionNote: string) => authorizedRequest<BookingFeedbackResponse>(`/orders/${encodeURIComponent(orderId)}/booking-feedback/follow-up/resolve`, token, { method: 'PATCH', body: JSON.stringify({ resolutionNote }) });
export const getBookingFeedbackReport = (token: string, params: Record<string, string | number | boolean | undefined>) => { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); }); return authorizedRequest<BookingFeedbackReport>(`/reports/booking-feedback?${query}`, token); };

async function publicRequest<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-Feedback-Token': token, ...(init?.headers ?? {}) } });
  const payload = await response.json(); if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Request failed'); return payload.data as T;
}
export const validatePublicBookingFeedback = (token: string) => publicRequest<PublicBookingFeedback>('/booking-feedback/public/invitation', token);
export const submitPublicBookingFeedback = (token: string, input: { answers: Array<{ questionId: string; rating: number }>; comment?: string; confirmed: true }) => publicRequest<PublicBookingFeedback>('/booking-feedback/public/submissions', token, { method: 'POST', body: JSON.stringify(input) });
