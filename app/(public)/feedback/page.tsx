import type { Metadata } from 'next';
import { PublicFeedbackForm } from '@/components/feedback/public-feedback-form';

export const metadata: Metadata = {
  title: 'Share Your Feedback | ZenBooking',
  description: 'Share your ZenBooking customer experience securely.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function FeedbackPage() {
  return <PublicFeedbackForm />;
}

