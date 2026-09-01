import { strict as assert } from 'assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeedbackSummaryCard, HorizontalCategoryPerformance } from './banquet-analytics-sections';

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
const feedback = renderToStaticMarkup(createElement(FeedbackSummaryCard, { summary: { averageRating: 4.2, customerResponses: 8, staffResponses: 2, lowRatingCount: 1, openFollowUpCount: 1 } }));
assert.match(feedback, /4.2/);
assert.match(feedback, /8 customer/);
assert.match(feedback, /2 staff/);
assert.match(feedback, /1 low rating/);
