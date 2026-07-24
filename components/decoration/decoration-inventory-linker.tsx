import type { DecorationItem } from '@/lib/auth/types';

export function DecorationInventoryLinker({
  items,
  value,
  disabled,
  onChange,
}: {
  items: DecorationItem[];
  value?: string;
  disabled: boolean;
  onChange: (item: DecorationItem | null) => void;
}) {
  return <label className="block text-sm font-semibold text-slate-700">
    Link inventory item (optional)
    <select disabled={disabled} value={value ?? ''} onChange={(event) => onChange(items.find((item) => item.id === event.target.value) ?? null)} className="light-form-field mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950">
      <option value="">Custom / not tracked</option>
      {items.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id} disabled={item.availableQuantity < 1}>{item.name} · {item.availableQuantity} available</option>)}
    </select>
  </label>;
}
