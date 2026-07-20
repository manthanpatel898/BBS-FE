'use client';

import { useEffect, useState } from 'react';

export function DecorationQuantityInput({
  value,
  max,
  disabled = false,
  ariaLabel,
  className = '',
  onCommit,
}: {
  value: number;
  max?: number;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const parsed = /^\d+$/.test(draft) ? Number(draft) : Number.NaN;
  const valid = Number.isSafeInteger(parsed) && parsed >= 1;
  const exceedsMaximum = valid && max !== undefined && parsed > max;

  return <input
    aria-label={ariaLabel}
    aria-invalid={!valid || exceedsMaximum}
    type="text"
    inputMode="numeric"
    pattern="[1-9][0-9]*"
    disabled={disabled}
    value={draft}
    onChange={(event) => {
      const next = event.target.value;
      setDraft(next);
      if (/^[1-9]\d*$/.test(next)) onCommit(Number(next));
    }}
    onBlur={() => {
      if (!valid) setDraft(String(value));
    }}
    className={className}
  />;
}
