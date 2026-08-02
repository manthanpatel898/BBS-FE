import { strict as assert } from 'assert';
import { resolveActiveMenuTrendCategory } from './menu-category-trends';

const groups = [
  { category: 'Sabji', items: [{ name: 'Veg Handi', count: 4 }] },
  { category: 'Sweet', items: [{ name: 'Gulab Jamun', count: 3 }] },
];

assert.equal(resolveActiveMenuTrendCategory(groups, ''), 'Sabji');
assert.equal(resolveActiveMenuTrendCategory(groups, 'Sweet'), 'Sweet');
assert.equal(
  resolveActiveMenuTrendCategory(groups, 'Removed Category'),
  'Sabji',
);
assert.equal(resolveActiveMenuTrendCategory([], 'Sweet'), '');
