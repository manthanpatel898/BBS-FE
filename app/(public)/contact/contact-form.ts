export type InquiryForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  useCase: string;
  message: string;
  website: string;
};

export type CreateInquiryPayload = {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  useCase?: string;
  message: string;
  website: string;
};

const optional = (value: string): string | undefined =>
  value.trim() || undefined;

export function buildContactPayload(form: InquiryForm): CreateInquiryPayload {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: optional(form.phone),
    company: optional(form.company),
    useCase: optional(form.useCase),
    message: form.message.trim(),
    website: form.website.trim(),
  };
}

export async function getContactErrorMessage(
  payload: unknown,
  fallback: string,
): Promise<string> {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return fallback;
  }
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const values = message.filter(
      (item): item is string => typeof item === 'string' && Boolean(item.trim()),
    );
    if (values.length > 0) return values.join('. ');
  }
  return fallback;
}
