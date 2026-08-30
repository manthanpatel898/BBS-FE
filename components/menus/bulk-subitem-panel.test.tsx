import '@/lib/decoration/image-crop-test-dom.mjs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BulkSubitemPanel } from './bulk-subitem-panel';

test('previews and adds valid lines while reporting skipped lines', () => {
  let added: string[] = [];
  render(
    <BulkSubitemPanel
      existingItems={['Orange Juice']}
      onAdd={(items) => {
        added = items;
      }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /bulk add subitems/i }));
  fireEvent.change(screen.getByLabelText(/one subitem per line/i), {
    target: {
      value: 'Mango Juice\nmango juice\nOrange Juice\nPineapple Juice',
    },
  });

  assert.ok(screen.getByText('2 ready to add'));
  assert.ok(screen.getByText('2 skipped'));
  fireEvent.click(screen.getByRole('button', { name: /add 2 subitems/i }));
  assert.deepEqual(added, ['Mango Juice', 'Pineapple Juice']);
  assert.equal((screen.getByLabelText(/one subitem per line/i) as HTMLTextAreaElement).value, '');
  cleanup();
});
