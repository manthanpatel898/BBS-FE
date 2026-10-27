'use client';

const minuteOptions = ['00', '15', '30', '45'];
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

export function FoodServiceTimeSelect({
  label,
  value,
  eventStartTime,
  eventEndTime,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  eventStartTime: string;
  eventEndTime: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const options = buildTimeOptions(eventStartTime, eventEndTime);
  const parts = toDisplayParts(value || options[0] || '00:00');
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
          {hourOptions.filter((hour) => options.some((option) => toDisplayParts(option).hour === hour && toDisplayParts(option).period === parts.period)).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </select>
        <select aria-label={`${label} minute`} value={parts.minute} disabled={disabled} onChange={(event) => update({ minute: event.target.value })} className={selectClass}>
          {minuteOptions.filter((minute) => options.some((option) => { const p = toDisplayParts(option); return p.hour === parts.hour && p.period === parts.period && p.minute === minute; })).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select aria-label={`${label} period`} value={parts.period} disabled={disabled} onChange={(event) => update({ period: event.target.value as 'AM' | 'PM' })} className={selectClass}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function buildTimeOptions(start: string, end: string) {
  const startMinute = toMinutes(start);
  const endMinute = toMinutes(end);
  if (startMinute === null || endMinute === null || startMinute === endMinute) return [];
  const duration = endMinute > startMinute ? endMinute - startMinute : endMinute + 1440 - startMinute;
  return Array.from({ length: Math.floor(duration / 15) + 1 }, (_, index) => {
    const minute = (startMinute + index * 15) % 1440;
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  });
}

function toMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
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
