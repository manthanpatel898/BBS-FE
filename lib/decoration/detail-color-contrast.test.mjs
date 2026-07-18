import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  followup: '../../components/decoration/decoration-followup-modal.tsx',
  ledger: '../../components/decoration/decoration-advance-ledger.tsx',
  snapshot: '../../components/decoration/decoration-snapshot-gallery.tsx',
};

test('follow-up controls explicitly use a readable light input palette', async () => {
  const source = await readFile(new URL(files.followup, import.meta.url), 'utf8');
  assert.match(source, /bg-white/);
  assert.match(source, /text-slate-900/);
  assert.match(source, /placeholder:text-slate-400/);
});

test('advance ledger and decoration snapshot explicitly own their foreground colors', async () => {
  const [ledger, snapshot] = await Promise.all([
    readFile(new URL(files.ledger, import.meta.url), 'utf8'),
    readFile(new URL(files.snapshot, import.meta.url), 'utf8'),
  ]);
  assert.match(ledger, /text-slate-700/);
  assert.match(ledger, /bg-white text-slate-700/);
  assert.match(snapshot, /bg-white text-slate-900/);
  assert.match(snapshot, /text-slate-700[\s\S]*aria-label="Close image preview"/);
});
