import { strict as assert } from 'assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HorizontalCategoryPerformance } from './banquet-analytics-sections';

const categories = renderToStaticMarkup(
  createElement(HorizontalCategoryPerformance, {
    items: [
      { name: 'Premium Events', bookings: 12, revenue: 1_234_567 },
      { name: 'Wedding', bookings: 8, revenue: 800_000 },
    ],
  }),
);
assert.match(categories, /Premium Events/);
assert.match(categories, /12 bookings/);
assert.match(categories, /₹12,34,567/);
