'use client';

import { Restaurant } from '@/lib/auth/types';

export function RoleBasedRestaurantSelector({
  isVisible,
  restaurants,
  value,
  onChange,
}: {
  isVisible: boolean;
  restaurants: Restaurant[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!isVisible) {
    return null;
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
    >
      <option value="">Select restaurant</option>
      {restaurants.map((restaurant) => (
        <option key={restaurant.id} value={restaurant.id}>
          {restaurant.name}
        </option>
      ))}
    </select>
  );
}
