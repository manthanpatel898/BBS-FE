import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MINIMUM_BLOCKED_SEVERITY = 'moderate';
const SEVERITY_RANK = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const TEMPORARY_EXCEPTIONS = {
  'GHSA-MH99-V99M-4GVG': {
    reviewUntil: '2026-08-25',
    reason:
      'The affected brace-expansion chains are build tooling or ExcelJS Node-side archive dependencies. BBS-FE deploys only static output, does not deploy node_modules, and does not pass untrusted brace patterns to these packages.',
  },
};

function advisoryId(advisory) {
  const match = advisory.url?.match(/GHSA-[a-z0-9-]+/i);
  return match?.[0].toUpperCase() ?? `source:${String(advisory.source ?? 'unknown')}`;
}

function collectAdvisories(report, vulnerabilityName, visited = new Set()) {
  if (visited.has(vulnerabilityName)) {
    return [];
  }

  visited.add(vulnerabilityName);
  const vulnerability = report.vulnerabilities?.[vulnerabilityName];
  if (!vulnerability) {
    return [];
  }

  return (vulnerability.via ?? []).flatMap((entry) => {
    if (typeof entry === 'string') {
      return collectAdvisories(report, entry, new Set(visited));
    }

    return [entry];
  });
}

export function evaluateAuditReport(report, options = {}) {
  const now = options.now ?? new Date();
  const thresholdRank = SEVERITY_RANK[MINIMUM_BLOCKED_SEVERITY];
  const relevantVulnerabilities = Object.values(report.vulnerabilities ?? {}).filter(
    (vulnerability) => (SEVERITY_RANK[vulnerability.severity] ?? 0) >= thresholdRank,
  );

  const advisoryMap = new Map();
  const unresolvedVulnerabilityNames = [];

  for (const vulnerability of relevantVulnerabilities) {
    const advisories = collectAdvisories(report, vulnerability.name);
    if (advisories.length === 0) {
      unresolvedVulnerabilityNames.push(vulnerability.name);
      continue;
    }

    for (const advisory of advisories) {
      advisoryMap.set(advisoryId(advisory), advisory);
    }
  }

  const allowedAdvisoryIds = [];
  const blockedAdvisoryIds = [];
  const expiredAdvisoryIds = [];

  for (const id of [...advisoryMap.keys()].sort()) {
    const exception = TEMPORARY_EXCEPTIONS[id];
    if (!exception) {
      blockedAdvisoryIds.push(id);
      continue;
    }

    const reviewDeadline = new Date(`${exception.reviewUntil}T23:59:59.999Z`);
    if (now > reviewDeadline) {
      expiredAdvisoryIds.push(id);
      continue;
    }

    allowedAdvisoryIds.push(id);
  }

  return {
    passed:
      blockedAdvisoryIds.length === 0 &&
      expiredAdvisoryIds.length === 0 &&
      unresolvedVulnerabilityNames.length === 0,
    allowedAdvisoryIds,
    blockedAdvisoryIds,
    expiredAdvisoryIds,
    unresolvedVulnerabilityNames: [...new Set(unresolvedVulnerabilityNames)].sort(),
  };
}

function runAuditPolicy() {
  const audit = spawnSync('npm', ['audit', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (!audit.stdout) {
    console.error('npm audit did not return a JSON report.');
    if (audit.stderr) {
      console.error(audit.stderr.trim());
    }
    return 1;
  }

  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    console.error('npm audit returned invalid JSON.');
    return 1;
  }

  if (report.error) {
    console.error(`npm audit failed: ${report.error.summary ?? 'unknown audit error'}`);
    return 1;
  }

  const result = evaluateAuditReport(report);

  for (const id of result.allowedAdvisoryIds) {
    const exception = TEMPORARY_EXCEPTIONS[id];
    console.warn(
      `Temporarily allowing ${id} until ${exception.reviewUntil}. ${exception.reason}`,
    );
  }

  if (result.blockedAdvisoryIds.length > 0) {
    console.error(`Blocked advisories: ${result.blockedAdvisoryIds.join(', ')}`);
  }
  if (result.expiredAdvisoryIds.length > 0) {
    console.error(`Expired audit exceptions: ${result.expiredAdvisoryIds.join(', ')}`);
  }
  if (result.unresolvedVulnerabilityNames.length > 0) {
    console.error(
      `Unresolved vulnerable packages: ${result.unresolvedVulnerabilityNames.join(', ')}`,
    );
  }

  if (!result.passed) {
    console.error('Dependency audit policy failed.');
    return 1;
  }

  console.log('Dependency audit policy passed.');
  return 0;
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  process.exitCode = runAuditPolicy();
}
