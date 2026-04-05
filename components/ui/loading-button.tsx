'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  spinnerClassName?: string;
  children: ReactNode;
};

export function LoadingButton({
  isLoading = false,
  disabled,
  className = '',
  children,
  spinnerClassName = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
      {isLoading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={`h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${spinnerClassName}`}
          />
        </span>
      ) : null}
    </button>
  );
}
