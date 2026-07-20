import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { DecorationQuantityInput } from '../../components/decoration/decoration-quantity-input';

test.afterEach(() => cleanup());

test('allows clear then type while committing only positive integers', () => {
  const commits: number[] = [];
  render(<DecorationQuantityInput value={1} max={5} ariaLabel="Quantity" onCommit={(value) => commits.push(value)} />);
  const input = within(document.body).getByRole('textbox', { name: 'Quantity' }) as HTMLInputElement;
  assert.equal(input.value, '1');
  fireEvent.change(input, { target: { value: '' } });
  assert.equal(input.value, '');
  assert.deepEqual(commits, []);
  fireEvent.change(input, { target: { value: '2' } });
  assert.deepEqual(commits, [2]);
});

test('restores the committed value after blank, zero, negative, or decimal drafts', () => {
  render(<DecorationQuantityInput value={1} ariaLabel="Quantity" onCommit={() => assert.fail('invalid draft must not commit')} />);
  const input = within(document.body).getByRole('textbox', { name: 'Quantity' }) as HTMLInputElement;
  for (const value of ['', '0', '-1', '1.5', 'abc']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    assert.equal(input.value, '1');
  }
});

test('keeps an over-availability integer visible so selection validation can reject it', () => {
  let committed = 1;
  render(<DecorationQuantityInput value={1} max={2} ariaLabel="Quantity" onCommit={(value) => { committed = value; }} />);
  const input = within(document.body).getByRole('textbox', { name: 'Quantity' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: '3' } });
  assert.equal(committed, 3);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
});
