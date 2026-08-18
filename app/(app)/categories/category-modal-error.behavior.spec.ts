import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const submitSource = pageSource.slice(
  pageSource.indexOf('async function handleSubmit'),
  pageSource.indexOf('async function handleDelete'),
);

assert.match(pageSource, /const \{ showToast \} = useToast\(\)/);
assert.match(pageSource, /const \[modalError, setModalError\] = useState\(''\)/);
assert.match(pageSource, /function showCategoryFormError\(message: string\)/);
assert.match(pageSource, /showToast\(message, 'error'\)/);
assert.match(pageSource, /role="alert"/);
assert.match(pageSource, /\{modalError\}/);
assert.match(submitSource, /showCategoryFormError\(/);
assert.doesNotMatch(submitSource, /setError\(/);

console.log('Category modal errors remain visible above and inside the active popup.');
