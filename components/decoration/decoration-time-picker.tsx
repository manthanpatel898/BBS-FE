'use client';

import { useEffect, useState } from 'react';

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
);

function parseTime(value: string) {
  if (!value) return { hour: '', minute: '00', period: '' };
  const [hourPart, minutePart = '00'] = value.split(':');
  const hour24 = Number(hourPart);
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) {
    return { hour: '', minute: '00', period: '' };
  }
  return {
    hour: String(hour24 % 12 || 12),
    minute: minutePart,
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function composeTime(hour: string, minute: string, period: string) {
  if (!hour || !minute || !period) return '';
  let hour24 = Number(hour) % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

export function DecorationTimePicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [parts, setParts] = useState(() => parseTime(value));
  useEffect(() => setParts(parseTime(value)), [value]);
  const selectClass = `light-form-field min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${className}`;
  const update = (next: typeof parts) => {
    setParts(next);
    onChange(composeTime(next.hour, next.minute, next.period));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Hour"
        disabled={disabled}
        value={parts.hour}
        onChange={(event) => update({ ...parts, hour: event.target.value })}
        className={selectClass}
      >
        <option value="">Hour</option>
        {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <select
        aria-label="Minute"
        disabled={disabled}
        value={parts.minute}
        onChange={(event) => update({ ...parts, minute: event.target.value })}
        className={selectClass}
      >
        {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
      <select
        aria-label="AM or PM"
        disabled={disabled}
        value={parts.period}
        onChange={(event) => update({ ...parts, period: event.target.value })}
        className={selectClass}
      >
        <option value="">AM/PM</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
