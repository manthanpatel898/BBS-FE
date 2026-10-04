# Dependency security maintenance — 4 October 2026

Application behavior is unchanged by the dependency updates. The separate pending menu-reconciliation work remains intact.

- Next.js and its ESLint configuration updated together to 16.3.8.
- brace-expansion pinned within each consumer's existing major: 1.1.21, 2.1.7 and 5.0.12. Do not replace legacy callable versions with the incompatible modern export shape.
- Test-tool Undici updated to 7.29.1.
- Audit policy now fails closed on registry errors or incomplete reports. Retry an unavailable audit; it must not silently allow a deployment.

The full dependency audit now reports zero known vulnerabilities and `npm run audit:ci` passes. A scoped override replaces only `@next/eslint-plugin-next`'s `fast-glob` dependency with `tinyglobby@0.2.17`, removing the micromatch → braces chain affected by GHSA-vfj7-8cjw-p6xm.

As of this review the official advisory lists no patched braces version:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

No exception, forced downgrade, or suppression has been added. The plugin uses only `globSync` for root-directory discovery. Regression tests verify default, literal, brace and array patterns, directory-only filtering, and removal of the vulnerable parser. Relative and absolute output spellings are compared as resolved paths, matching the consuming rule's filesystem behavior. Recheck this scoped override when upgrading the plugin. Audit success is not a claim of complete application security.

Current release checks: lint has zero errors and one existing dashboard navigation warning; six audit-policy, two lint-glob compatibility and fourteen menu-reconciliation tests pass. Food-service and mobile wizard source assertions still fail and block release pending investigation. Prior full-suite checks also reported decoration inquiry payload and booking report footer expectation failures. Production browser and SMTP workflows are not exercised by these offline checks.
