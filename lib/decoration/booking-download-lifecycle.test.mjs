import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BookingDownloadLifecycle } from './booking-download-lifecycle.ts';
import { createPdfDownloadController } from './customer-document-download.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('keyed React lifecycle resets on rerender, blocks duplicates, and aborts stale work', async () => {
  const pending = new Map();
  const calls = [];
  const saved = [];
  const factory = (identity) => ({ onBusy, onError }) => createPdfDownloadController({
    onBusy, onError, save: (result) => saved.push(result.filename),
    download: (signal) => {
      calls.push({ identity, signal });
      return new Promise((resolve, reject) => pending.set(identity, { resolve, reject }));
    },
  });
  const view = ({ busy, error, start }) => React.createElement('button', { disabled: busy, onClick: start, 'data-error': error }, busy ? 'Downloading…' : 'Download');
  const renderIdentity = (identity) => React.createElement(BookingDownloadLifecycle, { key: identity, controllerFactory: factory(identity) }, view);

  let renderer;
  await act(async () => { renderer = TestRenderer.create(renderIdentity('booking-a:token-a')); });
  let button = renderer.root.findByType('button');
  await act(async () => { button.props.onClick(); });
  assert.equal(button.props.children, 'Downloading…');
  await act(async () => { pending.get('booking-a:token-a').reject(new Error('Old booking failed')); });
  button = renderer.root.findByType('button');
  assert.equal(button.props['data-error'], 'Old booking failed');

  await act(async () => { renderer.update(renderIdentity('booking-b:token-b')); });
  button = renderer.root.findByType('button');
  assert.deepEqual({ label: button.props.children, error: button.props['data-error'] }, { label: 'Download', error: '' });
  await act(async () => { button.props.onClick(); button.props.onClick(); });
  assert.equal(calls.filter((call) => call.identity === 'booking-b:token-b').length, 1);

  await act(async () => { renderer.update(renderIdentity('booking-c:token-c')); });
  assert.equal(calls.at(-1).signal.aborted, true);
  button = renderer.root.findByType('button');
  assert.deepEqual({ label: button.props.children, error: button.props['data-error'] }, { label: 'Download', error: '' });
  await act(async () => { pending.get('booking-b:token-b').resolve({ blob: new Blob(), filename: 'stale.pdf' }); });
  assert.deepEqual(saved, []);

  await act(async () => { button.props.onClick(); });
  await act(async () => { pending.get('booking-c:token-c').resolve({ blob: new Blob(), filename: 'current.pdf' }); });
  assert.deepEqual(saved, ['current.pdf']);
  button = renderer.root.findByType('button');
  await act(async () => { button.props.onClick(); });
  await act(async () => { renderer.unmount(); });
  assert.equal(calls.at(-1).signal.aborted, true);
});

test('reports busy transitions so the shared document action state can be released', async () => {
  let finish;
  const transitions = [];
  const controllerFactory = ({ onBusy, onError }) => createPdfDownloadController({
    onBusy,
    onError,
    save() {},
    download: () => new Promise((resolve) => { finish = resolve; }),
  });
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(
      BookingDownloadLifecycle,
      { controllerFactory, onBusyChange: (value) => transitions.push(value) },
      ({ start }) => React.createElement('button', { onClick: start }, 'Download'),
    ));
  });
  await act(async () => { renderer.root.findByType('button').props.onClick(); });
  await act(async () => { finish({ blob: new Blob(), filename: 'done.pdf' }); });
  assert.deepEqual(transitions, [true, false]);
  await act(async () => { renderer.unmount(); });
});
