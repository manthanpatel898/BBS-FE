# Decoration Mobile Responsive Hardening Design

## Goal

Make every event-decoration workflow reliably usable on mobile first, then tablet and desktop, while preserving static export and the established banquet visual language.

## Scope

- Application shell and navigation
- Dashboard and charts
- Calendar, date sidebar, inquiry form, event detail and child workflow popups
- Follow-ups
- Decoration selection and snapshots
- Decoration settings and company profile
- Employee list, create/edit, permissions and signature popups
- Audit Logs
- Reports and print views

## Shared UI Contract

- White/light surfaces establish `text-slate-950`; meaningful secondary content uses `text-slate-600` or darker.
- Every text-like control on a light surface uses `light-form-field`, including WebKit text fill, placeholders, autofill and disabled states.
- Mobile controls have a minimum 44px touch target.
- Modals fit `100dvh`, scroll internally, preserve safe-area padding and keep primary actions reachable.
- Wide data tables have equivalent mobile cards; horizontal table scrolling is desktop/tablet fallback, not the only mobile interface.
- Action groups wrap or use a two-column mobile grid without causing viewport overflow.
- Long names, IDs, notes and addresses wrap or truncate intentionally.
- Dynamic frontend navigation uses static routes with query-string state only.

## Module Design

### Shared forms and modals

Upgrade shared light-form class constants and `CommonModal` foregrounds. Do not change dark public/authentication forms.

### Audit Logs

Retain the desktop table at `md` and above. Below `md`, show one card per audit event with date, module, action, operation, actor and summary. Expanding a card reveals the same before/after/context and entity metadata as desktop.

### Event workflows

Allow Event Detail headers and action areas to wrap on narrow screens. Keep the detail content scrollable and the action bar fixed to the bottom. Apply readable forms to Inquiry, Confirmation, Advance and Follow-up popups.

### Employees and settings

Preserve existing mobile employee cards and sticky modal actions. Strengthen helper/empty-state text and apply readable light fields to create/edit, permissions, profile and configuration forms.

### Dashboard, calendar and follow-ups

Preserve the current responsive grids. Strengthen light-surface copy and protect narrow calendar/header layouts from overflow.

## Verification

- Automated source-level mobile/contrast invariants
- Targeted ESLint and TypeScript
- Full Next.js static production build
- Static route list review
- Final rendered review at 320, 360, 390, 768, 1024 and 1440 widths when an interactive browser is available

The rendered review is a release gate, but its current tool availability does not block implementing and verifying deterministic source/static requirements.
