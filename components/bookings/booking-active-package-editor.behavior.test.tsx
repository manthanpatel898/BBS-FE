import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingActivePackageEditor } from './booking-active-package-editor';

const primaryHtml = renderToStaticMarkup(
  <BookingActivePackageEditor
    categoryId="lunch"
    categories={[{ id: 'lunch', name: 'Lunch', pricePerPlate: 780 }]}
    pax="637"
    paxReadOnly
    customPrice=""
    customPriceLocked={false}
    startTime="16:00"
    endTime="20:00"
    showSchedule={false}
    onCategoryChange={() => undefined}
    onPaxChange={() => undefined}
    onCustomPriceChange={() => undefined}
    onStartTimeChange={() => undefined}
    onEndTimeChange={() => undefined}
  />,
);

assert.match(primaryHtml, /Category/);
assert.match(primaryHtml, /Pax/);
assert.match(primaryHtml, /Custom price/);
assert.doesNotMatch(primaryHtml, /Service slot/);
assert.doesNotMatch(primaryHtml, /Start time/);
assert.doesNotMatch(primaryHtml, /End time/);
assert.match(primaryHtml, /readOnly=""/);
assert.doesNotMatch(primaryHtml, /Primary package/);
assert.doesNotMatch(primaryHtml, /Mr Abhinav Gothi/);
assert.match(primaryHtml, /grid-cols-2/);
assert.match(primaryHtml, /col-span-2/);

const additionalHtml = renderToStaticMarkup(
  <BookingActivePackageEditor
    categoryId="breakfast"
    categories={[{ id: 'breakfast', name: 'Breakfast', pricePerPlate: 450 }]}
    pax="80"
    customPrice=""
    customPriceLocked={false}
    startTime="08:00"
    endTime="10:00"
    showSchedule
    onCategoryChange={() => undefined}
    onPaxChange={() => undefined}
    onCustomPriceChange={() => undefined}
    onStartTimeChange={() => undefined}
    onEndTimeChange={() => undefined}
  />,
);

assert.doesNotMatch(additionalHtml, /Service slot/);
assert.match(additionalHtml, /Start time/);
assert.match(additionalHtml, /End time/);
