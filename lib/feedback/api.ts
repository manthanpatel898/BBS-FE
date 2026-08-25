import type {
  CustomerFeedback,
  FeedbackCounts,
  FeedbackImageDisplayMode,
  FeedbackInvitation,
  FeedbackListQuery,
  FeedbackPagination,
  FeedbackPrefill,
  PublicInvitation,
  PublishedFeedback,
  SubmitFeedbackInput,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiEnvelope<T> = { success: boolean; message?: unknown; data: T };

const errorMessage = (payload: { message?: unknown } | null): string => {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  if (Array.isArray(payload?.message)) {
    const messages = payload.message
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    if (messages.length) return messages.join('. ');
  }
  return 'Unable to complete the request. Please try again.';
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) throw new Error(errorMessage(payload));
  return payload.data;
}

function adminHeaders(accessToken: string, headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set('Authorization', `Bearer ${accessToken}`);
  return result;
}

function jsonInit(accessToken: string, method: string, body?: unknown): RequestInit {
  const headers = adminHeaders(accessToken);
  headers.set('Content-Type', 'application/json');
  return { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}

export function validateFeedbackInvitation(token: string) {
  return request<PublicInvitation>('/feedback/public/invitation', {
    headers: { 'X-Feedback-Token': token },
    referrerPolicy: 'no-referrer',
  });
}

export function submitCustomerFeedback(token: string, input: SubmitFeedbackInput) {
  const form = new FormData();
  form.set('fullName', input.fullName);
  form.set('designation', input.designation);
  form.set('company', input.company);
  form.set('rating', String(input.rating));
  form.set('message', input.message);
  form.set('consentAccepted', 'true');
  form.set('displayMode', input.displayMode);
  form.set('image', input.image);
  return request<CustomerFeedback>('/feedback/public/submissions', {
    method: 'POST',
    headers: { 'X-Feedback-Token': token },
    body: form,
    referrerPolicy: 'no-referrer',
  });
}

export function listPublishedFeedback() {
  return request<PublishedFeedback[]>('/feedback/public/published', {
    referrerPolicy: 'no-referrer',
  });
}

function listQuery(query: FeedbackListQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.moderationStatus) params.set('moderationStatus', query.moderationStatus);
  if (query.invitationStatus) params.set('invitationStatus', query.invitationStatus);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : '';
}

export function createFeedbackInvitation(
  accessToken: string,
  input: FeedbackPrefill & { expiresAt?: string },
) {
  return request<{ invitation: FeedbackInvitation; link: string }>(
    '/admin/feedback/invitations',
    jsonInit(accessToken, 'POST', input),
  );
}

export function listFeedbackInvitations(accessToken: string, query: FeedbackListQuery = {}) {
  return request<FeedbackPagination<FeedbackInvitation>>(
    `/admin/feedback/invitations${listQuery(query)}`,
    { headers: adminHeaders(accessToken) },
  );
}

export function revokeFeedbackInvitation(accessToken: string, id: string, reason: string) {
  return request<FeedbackInvitation>(
    `/admin/feedback/invitations/${encodeURIComponent(id)}/revoke`,
    jsonInit(accessToken, 'POST', { reason }),
  );
}

export function replaceFeedbackInvitation(accessToken: string, id: string) {
  return request<{ invitation: FeedbackInvitation; link: string }>(
    `/admin/feedback/invitations/${encodeURIComponent(id)}/replace`,
    jsonInit(accessToken, 'POST'),
  );
}

export function listCustomerFeedback(accessToken: string, query: FeedbackListQuery = {}) {
  return request<FeedbackPagination<CustomerFeedback>>(
    `/admin/feedback/records${listQuery(query)}`,
    { headers: adminHeaders(accessToken) },
  );
}

export function getCustomerFeedback(accessToken: string, id: string) {
  return request<CustomerFeedback>(`/admin/feedback/records/${encodeURIComponent(id)}`, {
    headers: adminHeaders(accessToken),
  });
}

export function getFeedbackCounts(accessToken: string) {
  return request<FeedbackCounts>('/admin/feedback/records/counts', {
    headers: adminHeaders(accessToken),
  });
}

export function updateCustomerFeedbackPublicVersion(
  accessToken: string,
  id: string,
  input: Partial<FeedbackPrefill> & {
    rating?: number;
    message?: string;
    displayOrder?: number;
    expectedUpdatedAt?: string;
  },
) {
  return request<CustomerFeedback>(
    `/admin/feedback/records/${encodeURIComponent(id)}/public-version`,
    jsonInit(accessToken, 'PATCH', input),
  );
}

export function replaceCustomerFeedbackPublicImage(
  accessToken: string,
  id: string,
  image: File,
  displayMode: FeedbackImageDisplayMode,
) {
  const form = new FormData();
  form.set('image', image);
  form.set('displayMode', displayMode);
  return request<CustomerFeedback>(
    `/admin/feedback/records/${encodeURIComponent(id)}/public-image`,
    { method: 'POST', headers: adminHeaders(accessToken), body: form },
  );
}

function feedbackAction(
  accessToken: string,
  id: string,
  action: string,
  body?: unknown,
) {
  return request<CustomerFeedback>(
    `/admin/feedback/records/${encodeURIComponent(id)}/${action}`,
    jsonInit(accessToken, 'POST', body),
  );
}

export const approveCustomerFeedback = (accessToken: string, id: string, publish = false) =>
  feedbackAction(accessToken, id, 'approve', { publish });
export const rejectCustomerFeedback = (accessToken: string, id: string, reason: string) =>
  feedbackAction(accessToken, id, 'reject', { reason });
export const archiveCustomerFeedback = (accessToken: string, id: string) =>
  feedbackAction(accessToken, id, 'archive');
export const publishCustomerFeedback = (accessToken: string, id: string) =>
  feedbackAction(accessToken, id, 'publish');
export const unpublishCustomerFeedback = (accessToken: string, id: string) =>
  feedbackAction(accessToken, id, 'unpublish');

