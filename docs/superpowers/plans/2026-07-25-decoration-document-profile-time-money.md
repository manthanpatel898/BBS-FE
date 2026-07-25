# Decoration Document, Profile, Time, and Money Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete event-document finances and company address, manual banquet-style times alongside Time Slot, and wheel-safe monetary inputs.

**Architecture:** Extend the existing backend customer-document contract rather than calculating values in two renderers. Reuse existing restaurant and booking fields, make interactive time input explicit, and isolate reusable frontend controls under decoration/UI helpers so banquet behavior is untouched.

**Tech Stack:** NestJS 11, Mongoose 8, class-validator, PDFKit, Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- Changes apply only to `EVENT_DECORATION` companies.
- Keep Time Slot, Start Time, and End Time.
- Time Slot must not assign default times.
- Preserve all existing records without a migration.
- Do not change banquet booking behavior.
- Mobile is the primary viewport; tablet and desktop remain responsive.

---

### Task 1: Extend the customer-document financial and company contract

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Test: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.spec.ts`
- Test: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

**Interfaces:**
- Produces: `DecorationCustomerDocument.company.address`
- Produces: `DecorationCustomerDocument.financials`
- Produces: `DecorationCustomerDocument.payments`

- [ ] Add failing contract and PDF tests for address, finalized/unfinalized totals, and payment history.
- [ ] Run the focused tests and confirm the new assertions fail.
- [ ] Map existing restaurant and booking fields into the document contract.
- [ ] Render the same information in the server PDF.
- [ ] Re-run the focused backend tests.

### Task 2: Add company address to event profile settings

**Files:**
- Modify: `apps/BBS-BE/src/modules/restaurants/dto/update-my-restaurant-branding.dto.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/components/decoration/settings/company-profile-section.tsx`
- Modify: `apps/BBS-FE/lib/decoration/settings-view.ts`
- Test: existing restaurant and decoration settings tests

**Interfaces:**
- Consumes: existing `Restaurant.address`
- Produces: branding update payload `{ address: string }`

- [ ] Add failing validation and component-contract tests for address.
- [ ] Allow a trimmed bounded address in the backend branding DTO.
- [ ] Add the responsive address field to event company profile.
- [ ] Persist and reload the address through the existing endpoint.
- [ ] Run focused frontend and backend tests.

### Task 3: Add independent manual start/end time

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `apps/BBS-FE/lib/decoration/inquiry-form.ts`
- Modify: `apps/BBS-FE/components/decoration/decoration-inquiry-form.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-time-picker.tsx`
- Test: decoration booking domain/service and inquiry-form tests

**Interfaces:**
- Produces: required `startTime` and `endTime` in `HH:mm`
- Keeps: required independent `timeSlot`

- [ ] Add failing tests for required manual times and unchanged slot selection.
- [ ] Add the banquet-style Hour / Minute / AM-PM event time picker.
- [ ] Require both times in interactive create payloads and validate edit pairs.
- [ ] Remove slot-derived defaults from interactive booking payload creation.
- [ ] Verify existing booking hydration and partner/import compatibility tests.

### Task 4: Harden all event monetary inputs

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-money-input.tsx`
- Modify: event inquiry, confirmation, payment, decoration-selection, and report editors
- Test: new money-input behavior test and existing form-domain tests

**Interfaces:**
- Produces: wheel-safe decimal string input
- Preserves: existing backend numeric payloads and validation

- [ ] Add failing tests proving wheel events cannot mutate amounts.
- [ ] Implement `type="text"` plus `inputMode="decimal"` and decimal normalization.
- [ ] Replace event monetary number inputs only.
- [ ] Run form, confirmation, payment, and selection tests.

### Task 5: Complete regression verification

- [ ] Run backend decoration booking/document tests and backend build.
- [ ] Run frontend decoration tests, typecheck, and lint.
- [ ] Run the static frontend production build.
- [ ] Confirm banquet booking files have no behavioral changes.
- [ ] Review diffs for credential exposure and unrelated edits.
