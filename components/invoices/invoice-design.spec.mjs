import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('both invoice entry points share the light-surface boundary', () => {
  for (const file of ['components/invoices/banquet-invoice-workspace.tsx', 'components/bookings/banquet-invoice-modal.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /data-invoice-surface="true"/);
  }
});

test('invoice styles protect field contrast and responsive scrolling', () => {
  const css = readFileSync('components/invoices/invoice-surface.css', 'utf8');
  assert.match(css, /color-scheme: light/);
  assert.match(css, /::placeholder/);
  assert.match(css, /:disabled/);
  assert.match(css, /overscroll-behavior: contain/);
  assert.match(css, /max-width: 1199px/);
});
