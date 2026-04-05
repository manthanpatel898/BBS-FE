import { redirect } from 'next/navigation';

export default function HotDatesPage() {
  redirect('/settings?tab=hotDates');
}
