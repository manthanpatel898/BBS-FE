# Decoration Sidebar Cleanup Design

## Goal

Remove the `Decoration Catalog` and `Import Data` entries from the sidebar shown to event-decoration companies.

## Scope

- Remove only the two navigation entries from the `EVENT_DECORATION` sidebar configuration.
- Keep `/decoration/catalog` and `/decoration/import` pages available through their existing direct URLs.
- Keep existing route permissions, APIs, backend modules, settings-based decoration configuration, and banquet navigation unchanged.
- Remove sidebar-only permission calculations that become unused after the links are removed.

## Verification

- Add a navigation regression asserting that the decoration sidebar does not contain either link.
- Assert that the route-permission mappings for both direct URLs remain unchanged.
- Run the focused regression, TypeScript, lint, and the static production build.

## Migration and Deployment

No database migration, API deployment change, or route rewrite is required.
