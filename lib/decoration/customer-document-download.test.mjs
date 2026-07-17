import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getCustomerPdfFilename, saveDownloadedPdf } from './customer-document-download.ts';

const apiUrl = new URL('../auth/api.ts', import.meta.url);

test('customer PDF filename accepts safe headers and rejects malformed or unsafe values', () => {
  assert.equal(getCustomerPdfFilename('attachment; filename="BBS-12-decoration-proposal.pdf"'), 'BBS-12-decoration-proposal.pdf');
  assert.equal(getCustomerPdfFilename("attachment; filename*=UTF-8''BBS%2012.pdf"), 'BBS 12.pdf');
  assert.equal(getCustomerPdfFilename("attachment; filename*=UTF-8''%E0%A4%A"), 'decoration-proposal.pdf');
  assert.equal(getCustomerPdfFilename('attachment; filename="../../bad:name.pdf"'), 'bad-name.pdf');
  assert.equal(getCustomerPdfFilename('attachment; filename="proposal.txt"'), 'decoration-proposal.pdf');
});

test('customer PDF fetch uses bearer auth and the binary pdf endpoint', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /export async function downloadDecorationCustomerPdf/);
  assert.match(source, /customer-document\.pdf/);
  assert.match(source, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(source, /application\/pdf/);
  assert.doesNotMatch(source, /authorizedRequest<[^>]+>\([^\n]*customer-document\.pdf/);
});

test('customer PDF fetch handles session expiry, API errors, and safe filenames', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /response\.status === 401/);
  assert.match(source, /notifySessionExpired\(\)/);
  assert.match(source, /Content-Disposition/);
  assert.match(source, /getCustomerPdfFilename/);
  assert.match(source, /extractApiError/);
});

test('saveDownloadedPdf clicks a temporary link and always revokes its object URL', () => {
  const operations = [];
  const link = {
    href: '',
    download: '',
    click() { operations.push('click'); },
    remove() { operations.push('remove'); },
  };
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { URL: {
    createObjectURL() { operations.push('create'); return 'blob:test'; },
    revokeObjectURL(value) { operations.push(`revoke:${value}`); },
  } };
  globalThis.document = {
    createElement(tag) { assert.equal(tag, 'a'); return link; },
    body: { appendChild(value) { assert.equal(value, link); operations.push('append'); } },
  };
  try {
    saveDownloadedPdf({ blob: new Blob(['%PDF']), filename: 'proposal.pdf' });
    assert.equal(link.href, 'blob:test');
    assert.equal(link.download, 'proposal.pdf');
    assert.deepEqual(operations, ['create', 'append', 'click', 'remove', 'revoke:blob:test']);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test('saveDownloadedPdf revokes the object URL when clicking fails', () => {
  const operations = [];
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { URL: {
    createObjectURL() { return 'blob:test'; },
    revokeObjectURL(value) { operations.push(`revoke:${value}`); },
  } };
  globalThis.document = {
    createElement() { return { click() { throw new Error('blocked'); }, remove() { operations.push('remove'); } }; },
    body: { appendChild() {} },
  };
  try {
    assert.throws(() => saveDownloadedPdf({ blob: new Blob(), filename: 'proposal.pdf' }), /blocked/);
    assert.deepEqual(operations, ['remove', 'revoke:blob:test']);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
