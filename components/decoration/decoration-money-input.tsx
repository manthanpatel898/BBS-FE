'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export function normalizeDecorationMoneyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = cleaned.split('.');
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join('').slice(0, 2)}`;
}

type DecorationMoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export const DecorationMoneyInput = forwardRef<
  HTMLInputElement,
  DecorationMoneyInputProps
>(function DecorationMoneyInput(
  { value, onValueChange, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) =>
        onValueChange(normalizeDecorationMoneyInput(event.target.value))
      }
    />
  );
});
