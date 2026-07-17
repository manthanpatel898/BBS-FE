export type ConfigurationActionVariant = 'edit' | 'activate' | 'deactivate' | 'add';

const variants: Record<ConfigurationActionVariant, string> = {
  edit: 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
  activate: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
  deactivate: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  add: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
};

export function configurationActionClass(variant: ConfigurationActionVariant, disabled = false): string {
  return [
    'inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
    variants[variant],
    disabled ? 'cursor-not-allowed opacity-50' : '',
  ].filter(Boolean).join(' ');
}
