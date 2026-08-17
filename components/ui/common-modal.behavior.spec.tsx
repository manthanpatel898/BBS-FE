import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommonModal } from './common-modal';

async function main() {
  const html = renderToStaticMarkup(
    <CommonModal
      title="Create category setup"
      description="Configure a flexible category."
      onClose={() => undefined}
      mobileFullScreen
      footer={<button type="submit" form="category-form">Save category</button>}
    >
      <p>Category fields</p>
    </CommonModal>,
  );

  assert.match(html, /data-mobile-full-screen="true"/);
  assert.match(html, /h-\[100dvh\]/);
  assert.match(html, /sm:rounded-2xl/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /data-modal-footer="true"/);
  assert.match(html, /shrink-0/);
  assert.match(html, /form="category-form"/);
}

void main();
