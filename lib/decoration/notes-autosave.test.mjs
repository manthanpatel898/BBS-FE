import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecorationNotesAutosave } from './notes-autosave.ts';

function clock() {
  let next = 1;
  const jobs = new Map();
  return {
    setTimeout(fn, delay) { const id = next++; jobs.set(id, { fn, delay }); return id; },
    clearTimeout(id) { jobs.delete(id); },
    run() { const pending = [...jobs.values()]; jobs.clear(); pending.forEach((job) => job.fn()); },
    jobs,
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('debounces rapid changes and serializes a newer queued revision', async () => {
  const timer = clock();
  const calls = [];
  const resolvers = [];
  const statuses = [];
  const autosave = createDecorationNotesAutosave({
    save: (draft) => new Promise((resolve) => { calls.push(draft); resolvers.push(resolve); }),
    clock: timer,
    onChange: (state) => statuses.push(state.status),
  });
  autosave.edit({ revision: 1, value: 'a' });
  autosave.edit({ revision: 1, value: 'b' });
  assert.equal(timer.jobs.size, 1);
  timer.run();
  assert.deepEqual(calls.map((call) => [call.revision, call.value]), [[2, 'b']]);
  autosave.edit({ revision: 1, value: 'c' });
  timer.run();
  assert.equal(calls.length, 1);
  resolvers[0]({ revision: 2 });
  await tick();
  assert.deepEqual(calls.map((call) => [call.revision, call.value]), [[2, 'b'], [3, 'c']]);
  resolvers[1]({ revision: 3 });
  await tick();
  assert.equal(statuses.at(-1), 'saved');
});

test('failure keeps newest work retryable and flush saves immediately', async () => {
  const timer = clock();
  let fail = true;
  const calls = [];
  const autosave = createDecorationNotesAutosave({
    save: async (draft) => { calls.push(draft); if (fail) throw new Error('offline'); return { revision: draft.revision }; },
    clock: timer,
  });
  autosave.edit({ revision: 0, value: 'latest' });
  await autosave.flush();
  assert.equal(autosave.state().status, 'error');
  fail = false;
  await autosave.retry();
  assert.equal(autosave.state().status, 'saved');
  assert.equal(calls.at(-1).value, 'latest');
});

test('dispose aborts timers and prevents later state updates', async () => {
  const timer = clock();
  const statuses = [];
  const autosave = createDecorationNotesAutosave({
    save: async (draft) => ({ revision: draft.revision }),
    clock: timer,
    onChange: (state) => statuses.push(state.status),
  });
  autosave.edit({ revision: 0 });
  const before = statuses.length;
  autosave.dispose();
  timer.run();
  await tick();
  assert.equal(statuses.length, before);
});
