import Link from 'next/link';
import { BookingsRoute } from '@/components/auth/bookings-route';

export default function MenuSelectionPage() {
  return (
    <BookingsRoute>
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
            Menu Selection
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Menu selection workflow</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-stone-300">
            Menu selection is now handled from the inquiry flow. Create an inquiry
            first, then open it from bookings and continue with package, menu,
            booking details, and confirmation.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/20 p-6">
          <p className="text-sm leading-8 text-stone-300">
            Use the bookings module to manage the full sequence:
            customer inquiry, menu selection, booking details, preview, and final
            confirmation with advance, discount, and extra add-ons.
          </p>
          <div className="mt-6">
            <Link
              href="/bookings"
              className="inline-flex rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-400"
            >
              Open bookings
            </Link>
          </div>
        </div>
      </section>
    </BookingsRoute>
  );
}
