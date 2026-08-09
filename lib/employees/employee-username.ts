export type UsernameMode = 'auto' | 'manual';

export type UsernameStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'invalid'
  | 'error';

export function normalizeUsernameInput(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 50)
    .replace(/[._-]+$/g, '');
}

export function shouldAutoGenerateUsername(input: {
  editing: boolean;
  mode: UsernameMode;
}) {
  return !input.editing && input.mode === 'auto';
}
