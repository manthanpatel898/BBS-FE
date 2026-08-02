'use client';

const minuteOptions = ['00', '15', '30', '45'];
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

export function FoodServiceTimeSelect({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const parts = toDisplayParts(value);
  const selectClass =
    'min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100 disabled:text-slate-500';

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    onChange(toStoredTime(merged.hour, merged.minute, merged.period));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-900">{label}</label>
        <button
          type="button"
          disabled={disabled || !value}
          onClick={() => onChange('')}
          className="min-h-11 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40"
        >Clear</button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_1.1fr] gap-2">
        <select aria-label={`${label} hour`} value={parts.hour} disabled={disabled} onChange={(event) => update({ hour: event.target.value })} className={selectClass}>
          {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select aria-label={`${label} minute`} value={parts.minute} disabled={disabled} onChange={(event) => update({ minute: event.target.value })} className={selectClass}>
          {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select aria-label={`${label} period`} value={parts.period} disabled={disabled} onChange={(event) => update({ period: event.target.value as 'AM' | 'PM' })} className={selectClass}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function toDisplayParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const storedHour = match ? Number(match[1]) : 12;
  return {
    hour: String(storedHour % 12 || 12),
    minute: match && minuteOptions.includes(match[2]) ? match[2] : '00',
    period: (storedHour >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
}

function toStoredTime(hour: string, minute: string, period: 'AM' | 'PM') {
  const normalizedHour = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
  return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
}
