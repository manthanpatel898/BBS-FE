import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const locationsUrl = new URL('../../components/decoration/settings/locations-section.tsx', import.meta.url);
const settingsUrl = new URL('../../components/decoration/settings/decoration-settings.tsx', import.meta.url);
const inquiryUrl = new URL('../../components/decoration/decoration-inquiry-form.tsx', import.meta.url);
const detailUrl = new URL('../../components/decoration/decoration-event-detail-modal.tsx', import.meta.url);
const sidebarUrl = new URL('../../components/decoration/decoration-day-sidebar.tsx', import.meta.url);

test('location settings separates location master from selected hall detail', async () => {
  const source = await readFile(locationsUrl, 'utf8');

  assert.match(source, /Banquets & Outdoor Venues/);
  assert.match(source, />Open Location</);
  assert.match(source, /Back to Locations/);
  assert.match(source, /selectedLocation\.halls/);
  assert.match(source, /selectedLocation \?.*Add hall/s);
});

test('decoration screens use banquet and outdoor venue terminology', async () => {
  const sources = await Promise.all([settingsUrl, inquiryUrl, detailUrl, sidebarUrl].map((url) => readFile(url, 'utf8')));
  const combined = sources.join('\n');

  assert.match(combined, /Banquet/);
  assert.match(combined, /Outdoor Venue/);
  assert.match(combined, /\["Location", booking\.venue\.name\]/);
  assert.match(combined, />Location: </);
});
