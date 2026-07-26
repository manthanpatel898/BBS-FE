# Dependency Audit Exceptions

The production deployment runs `npm run audit:ci`. The command evaluates the
complete npm audit report and fails for every unapproved vulnerability with
moderate, high, or critical severity.

Exceptions must be narrowly scoped, time-bound, documented here, and enforced
by `scripts/audit-policy.mjs`. Removing or weakening the audit step is not an
acceptable remediation.

## GHSA-MH99-V99M-4GVG

- Package: `brace-expansion`
- Severity: High
- Added: 25 July 2026
- Review deadline: 25 August 2026
- Status: Temporary exception

### Reason

The advisory was published after the current frontend dependencies were
released. The affected copies are reached through:

- Next.js/ESLint build tooling.
- ExcelJS Node-side archive dependencies.

BBS-FE is compiled into a static site. The deployment publishes only the
generated `out` directory to S3 and does not publish `node_modules`. The
application does not pass user-controlled brace patterns to these packages.

The only patched `brace-expansion` release is currently in a newer major line.
Forcing it into older `minimatch` dependency ranges makes the npm dependency
tree invalid. `npm audit fix --force` also proposes breaking and unrelated
ESLint/ExcelJS changes, so neither option is safe for a production deployment.

### Required follow-up

Before the review deadline:

1. Check whether Next.js, ESLint, and ExcelJS have released compatible
   dependency updates.
2. Upgrade the parent packages and regenerate `package-lock.json`.
3. Run `npm ci`, the complete audit, tests, lint, and static build.
4. Remove the exception from `scripts/audit-policy.mjs` after the dependency
   tree no longer contains the advisory.

The CI policy automatically fails after the review deadline if this exception
has not been reviewed.
