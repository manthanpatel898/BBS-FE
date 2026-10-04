import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAuditReport, isUnavailableAuditReport } from './audit-policy.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const allowedAdvisory = {
  source: 1124334,
  name: 'brace-expansion',
  dependency: 'brace-expansion',
  title: 'brace-expansion denial of service',
  url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
  severity: 'high',
  range: '<=5.0.7',
};

function reportWith(vulnerabilities) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
      },
    },
  };
}

test('accepts the temporary static-build brace-expansion exception', () => {
  const report = reportWith({
    'brace-expansion': {
      name: 'brace-expansion',
      severity: 'high',
      isDirect: false,
      via: [allowedAdvisory],
      effects: ['minimatch'],
      range: '<=5.0.7',
      nodes: ['node_modules/brace-expansion'],
    },
    minimatch: {
      name: 'minimatch',
      severity: 'high',
      isDirect: false,
      via: ['brace-expansion'],
      effects: [],
      range: '2.0.0 - 10.0.2',
      nodes: ['node_modules/minimatch'],
    },
  });

  const result = evaluateAuditReport(report, {
    now: new Date('2026-07-25T00:00:00.000Z'),
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.allowedAdvisoryIds, ['GHSA-MH99-V99M-4GVG']);
  assert.deepEqual(result.blockedAdvisoryIds, []);
});

test('blocks any non-allowlisted moderate-or-higher advisory', () => {
  const report = reportWith({
    example: {
      name: 'example',
      severity: 'critical',
      isDirect: true,
      via: [
        {
          source: 9999999,
          name: 'example',
          dependency: 'example',
          title: 'Different vulnerability',
          url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
          severity: 'critical',
          range: '*',
        },
      ],
      effects: [],
      range: '*',
      nodes: ['node_modules/example'],
    },
  });

  const result = evaluateAuditReport(report, {
    now: new Date('2026-07-25T00:00:00.000Z'),
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.blockedAdvisoryIds, ['GHSA-XXXX-YYYY-ZZZZ']);
});

test('blocks the allowlisted advisory after its review deadline', () => {
  const report = reportWith({
    'brace-expansion': {
      name: 'brace-expansion',
      severity: 'high',
      isDirect: false,
      via: [allowedAdvisory],
      effects: [],
      range: '<=5.0.7',
      nodes: ['node_modules/brace-expansion'],
    },
  });

  const result = evaluateAuditReport(report, {
    now: new Date('2026-08-26T00:00:00.000Z'),
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.expiredAdvisoryIds, ['GHSA-MH99-V99M-4GVG']);
});

test('identifies unavailable npm audit reports', () => {
  assert.equal(
    isUnavailableAuditReport({
      error: {
        summary: '',
      },
    }),
    true,
  );

  assert.equal(
    isUnavailableAuditReport({
      error: {
        summary: '',
      },
      vulnerabilities: {
        example: {
          name: 'example',
          severity: 'high',
          via: [],
        },
      },
    }),
    false,
  );
});

test('CLI fails closed when the audit registry is unavailable', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bbs-audit-'));
  try {
    writeFileSync(path.join(directory, 'npm'), '#!/bin/sh\necho \'{"error":{"code":"ENETUNREACH"}}\'\nexit 1\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, ['scripts/audit-policy.mjs'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /could not be completed/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects unavailable, incomplete and errored reports instead of reporting success', () => {
  for (const report of [{}, { error: { code: 'ENETUNREACH' } }, { ...reportWith({}), error: { code: 'EFAIL' } }]) {
    assert.equal(evaluateAuditReport(report).passed, false);
  }
  assert.equal(evaluateAuditReport(reportWith({})).passed, true);
});
