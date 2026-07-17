import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { StrictMode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { useModalViewport } from '../../components/ui/use-modal-viewport';

function Layer({ name, onClose, blocked = false }: { name: string; onClose: () => void; blocked?: boolean }) {
  useModalViewport(onClose, blocked);
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

test('out-of-order parent unmount keeps the child lock and restores the exact prior overflow last', async () => {
  document.body.style.overflow = 'clip';
  const closed: string[] = [];
  const view = render(<><Layer key="parent" name="parent" onClose={() => closed.push('parent')} /><Layer key="crop" name="crop" onClose={() => closed.push('crop')} /></>);
  view.rerender(<Layer key="crop" name="crop" onClose={() => closed.push('crop')} />);
  await waitFor(() => assert.equal(document.body.style.overflow, 'hidden'));
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.deepEqual(closed, ['crop']);
  view.unmount();
  assert.equal(document.body.style.overflow, 'clip');
  document.body.style.overflow = '';
});

test('StrictMode replay retains one owner and restores body overflow on final unmount', () => {
  document.body.style.overflow = 'auto';
  const view = render(<StrictMode><Layer name="strict" onClose={() => {}} /></StrictMode>);
  assert.equal(document.body.style.overflow, 'hidden');
  view.unmount();
  assert.equal(document.body.style.overflow, 'auto');
  document.body.style.overflow = '';
});

test('blocked top Escape closes neither processing crop nor underlying parent', () => {
  const closed: string[] = [];
  const view = render(<><Layer name="parent" onClose={() => closed.push('parent')} /><Layer name="crop" blocked onClose={() => closed.push('crop')} /></>);
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.deepEqual(closed, []);
  view.unmount();
});
