import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingPackageTabs } from './booking-package-tabs';

const html = renderToStaticMarkup(
  <BookingPackageTabs
    activeId="primary"
    packages={[
      {
        id: 'primary',
        label: 'Primary',
        categoryName: 'Lunch',
        pax: '200',
      },
      {
        id: 'breakfast',
        label: 'Additional 1',
        categoryName: 'Breakfast',
        pax: '80',
        removable: true,
      },
    ]}
    onSelect={() => undefined}
    onAdd={() => undefined}
    onRemove={() => undefined}
  />,
);

assert.match(html, /role="tablist"/);
assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
assert.match(html, /Lunch/);
assert.match(html, /200 pax/);
assert.doesNotMatch(html, /₹/);
assert.match(html, /Breakfast/);
assert.match(html, /aria-label="Add meal package"/);
assert.match(html, /aria-label="Remove Breakfast package"/);
