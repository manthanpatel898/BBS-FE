import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { useModalViewport } from '../../components/ui/use-modal-viewport';

function Layer({ name, onClose }: { name: string; onClose: () => void }) {
  useModalViewport(onClose);
  return <div>{name}</div>;
}

test.afterEach(() => cleanup());

test('Escape closes only the top modal and shared body lock survives its unmount', async () => {
  const closed: string[] = [];
  const view = render(<><Layer name="parent" onClose={() => closed.push('parent')} /><Layer name="crop" onClose={() => closed.push('crop')} /></>);
  assert.equal(document.body.style.overflow, 'hidden');
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.deepEqual(closed, ['crop']);
  view.rerender(<Layer name="parent" onClose={() => closed.push('parent')} />);
  await waitFor(() => assert.equal(document.body.style.overflow, 'hidden'));
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.deepEqual(closed, ['crop', 'parent']);
  view.unmount();
  assert.equal(document.body.style.overflow, '');
});
