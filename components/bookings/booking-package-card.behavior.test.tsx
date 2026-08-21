import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingPackageCard } from './booking-package-card';

function packageCard(id: string, expanded: boolean) {
  return (
    <BookingPackageCard
      id={id}
      label={id === 'primary' ? 'Primary package' : 'Additional package'}
      categoryName={id === 'primary' ? 'Lunch' : 'Breakfast'}
      pax="60"
      serviceSlot="Breakfast"
      startTime="08:00"
      endTime="10:00"
      effectiveRate={400}
      subtotal={24000}
      selectedItemCount={2}
      expanded={expanded}
      onToggle={() => undefined}
    >
      <input name={`${id}-pax`} defaultValue="60" />
    </BookingPackageCard>
  );
}

const html = renderToStaticMarkup(
  <div data-package-wizard-content="true" className="pb-32">
    {packageCard('primary', true)}
    {packageCard('breakfast', false)}
    <footer data-package-wizard-footer="true">Save all packages</footer>
  </div>,
);

assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1);
assert.equal((html.match(/data-package-card-body="true"/g) ?? []).length, 1);
assert.match(html, /Primary package/);
assert.match(html, /Breakfast/);
assert.match(html, /60 pax/);
assert.match(html, /08:00 - 10:00/);
assert.match(html, /2 items selected/);
assert.match(html, /data-package-wizard-footer="true"/);
assert.match(html, /pb-32/);
