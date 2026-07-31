# Decoration Customer Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional customer address to event-decoration bookings and display it consistently in edit flows, event details, customer document view, and downloaded PDF.

**Architecture:** Persist the value as nullable `customer.address` in the existing decoration booking customer snapshot. Transport it through the existing create/partial-update DTO and booking/customer-document contracts, while keeping the existing top-level `address` exclusively for the event venue. Frontend form normalization will distinguish omitted partial updates from explicit clearing.

**Tech Stack:** NestJS, Mongoose, class-validator, PDFKit, Next.js static export, React, TypeScript, Tailwind CSS.

## Global Constraints

- Change only the event-decoration module; banquet behaviour must remain unchanged.
- Customer address is optional, trimmed, limited to 1,000 characters, and blank input is stored as `null`.
- Existing records without `customer.address` remain valid; no migration or index is required.
- Event/venue `address` remains separate and unchanged.
- Create, edit, event detail, browser document view, and downloaded PDF must use the same customer address.
- UI must remain mobile-first and responsive on tablet and desktop.

---

### Task 1: Backend booking contract and persistence

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.spec.ts`

**Interfaces:**
- Consumes: create/update decoration booking payloads.
- Produces: `customer.address: string | null` in stored records and mapped API responses.

- [ ] **Step 1: Write failing DTO and compatibility tests**

Add assertions equivalent to:

```ts
const valid = plainToInstance(DecorationBookingDto, {
  ...validBooking,
  customerAddress: "  12 Riverfront Road\nAhmedabad  ",
});
assert.equal(
  validateSync(valid).some((error) => error.property === "customerAddress"),
  false,
);

const invalid = plainToInstance(DecorationBookingDto, {
  ...validBooking,
  customerAddress: "x".repeat(1001),
});
assert.equal(
  validateSync(invalid).some((error) => error.property === "customerAddress"),
  true,
);
```

Cover nullable update input and a legacy mapped record whose customer has no
address.

- [ ] **Step 2: Run the tests and verify the new assertions fail**

Run:

```bash
cd apps/BBS-BE
npx ts-node src/modules/decoration-bookings/decoration-booking-domain.spec.ts
npx ts-node src/modules/decoration-bookings/decoration-booking-view.spec.ts
```

Expected: failure because the DTO/schema/service do not yet support customer
address.

- [ ] **Step 3: Add the DTO and schema field**

Use:

```ts
@IsOptional()
@IsString()
@MaxLength(1000)
customerAddress?: string;
```

For updates, accept `string | null` with the same nullable validation pattern
used by the existing optional booking fields. Add
`address: string | null` to `CustomerSnapshot` with `default: null`.

- [ ] **Step 4: Map create, edit hydration, and partial update**

Extend `DecorationBookingValues` and the service payload:

```ts
customer: {
  name: values.customerName.trim(),
  mobile: values.mobile,
  alternativeMobile: values.alternativeMobile?.trim() || null,
  address: values.customerAddress?.trim() || null,
}
```

Return `record.customer.address ?? null` from `editableValues`. Because update
payloads are merged from the current record, omitted `customerAddress` must
preserve the existing value while an explicit `null` clears it.

- [ ] **Step 5: Run focused backend tests**

Run the two commands from Step 2 and expect both to pass.

- [ ] **Step 6: Commit the backend persistence change**

```bash
cd apps/BBS-BE
git add src/modules/decoration-bookings
git commit -m "feat: store decoration customer address"
```

---

### Task 2: Customer document and downloaded PDF

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`

**Interfaces:**
- Consumes: stored `customer.address`.
- Produces: nullable customer address in `DecorationCustomerDocument` and a
  conditional Address row in the PDF Customer panel.

- [ ] **Step 1: Write failing document and PDF tests**

Add `address: "12 Riverfront Road, Ahmedabad"` to the booking fixture and
assert that the built document preserves it. Add a second fixture with the
field missing and assert it normalizes to `null`.

Expose or reuse a customer-row helper and assert:

```ts
assert.deepEqual(customerDocumentCustomerRows(document), [
  ["Name", "Asha Shah"],
  ["Mobile", "9123456789"],
  ["Alternative mobile", "9000000000"],
  ["Address", "12 Riverfront Road, Ahmedabad"],
]);
```

Verify the row is absent when address is blank or missing.

- [ ] **Step 2: Run the document and PDF specs and verify failure**

```bash
cd apps/BBS-BE
npx ts-node src/modules/decoration-bookings/decoration-customer-document.spec.ts
npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
```

- [ ] **Step 3: Extend the document contracts and service mapper**

Add `address?: string | null` to both customer contracts. Normalize it in
`buildDecorationCustomerDocument`, and map it from the Mongoose record in
`customerDocumentBooking`.

- [ ] **Step 4: Render the conditional PDF row safely**

Build Customer rows from name, mobile, optional alternative mobile, and
optional address. Calculate the customer panel height from its row count and
use the maximum of the Customer and Event & Venue row counts for the paired
panel height. Keep wrapped address text within the Customer panel; do not
replace the event address.

- [ ] **Step 5: Run the focused specs and render a visual fixture**

```bash
cd apps/BBS-BE
WRITE_DECORATION_PDF_FIXTURE=1 npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
pdftoppm -f 1 -singlefile -png -r 144 tmp/pdfs/decoration-proposal.pdf tmp/pdfs/customer-address
```

Inspect the PNG and confirm both Customer Address and Event Address are
legible, correctly labelled, and do not overlap.

- [ ] **Step 6: Commit the backend document change**

```bash
cd apps/BBS-BE
git add src/modules/decoration-bookings
git commit -m "feat: show customer address in decoration PDFs"
```

---

### Task 3: Frontend form state, validation, and API types

**Files:**
- Modify: `apps/BBS-FE/lib/decoration/inquiry-form.ts`
- Create: `apps/BBS-FE/lib/decoration/inquiry-form.spec.ts`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/components/decoration/decoration-inquiry-form.tsx`

**Interfaces:**
- Consumes: `DecorationBooking.customer.address`.
- Produces: `customerAddress` in create and changed-field edit payloads.

- [ ] **Step 1: Write failing form-state tests**

Cover:

```ts
assert.equal(createDecorationInquiryValues().customerAddress, "");
assert.equal(
  validateDecorationInquiry({
    ...validValues,
    customerAddress: "x".repeat(1001),
  }).customerAddress,
  "Customer address cannot exceed 1000 characters",
);
assert.deepEqual(
  buildDecorationBookingPatch(null, {
    ...validValues,
    customerAddress: "  Ahmedabad  ",
  }).customerAddress,
  "Ahmedabad",
);
assert.equal(
  buildDecorationBookingPatch(
    { ...validValues, customerAddress: "Ahmedabad" },
    { ...validValues, customerAddress: "" },
  ).customerAddress,
  null,
);
```

- [ ] **Step 2: Run the new frontend spec and verify failure**

```bash
cd apps/BBS-FE
npx tsx lib/decoration/inquiry-form.spec.ts
```

- [ ] **Step 3: Extend types and normalization**

Add `customerAddress: string` to `DecorationInquiryValues`, initialize it to
`""`, validate its length, normalize it to `customerAddress: string | null`,
and preserve changed-field patch behaviour.

Extend:

```ts
customer: {
  name: string;
  mobile: string;
  alternativeMobile?: string | null;
  address?: string | null;
}
```

in both `DecorationBooking` and `DecorationCustomerDocument`.

- [ ] **Step 4: Add and hydrate the textarea**

Populate `customerAddress` from `booking.customer.address ?? ""`. Add a
full-width multiline field directly after the customer phone fields:

```tsx
<Field label="Customer Address (optional)" error={errors.customerAddress}>
  <textarea
    disabled={busy}
    maxLength={1000}
    className={`${input} min-h-24 resize-y`}
    value={values.customerAddress}
    onChange={(event) => set("customerAddress", event.target.value)}
  />
</Field>
```

Ensure it spans both columns at tablet/desktop widths and remains a single
column on mobile.

- [ ] **Step 5: Run the form spec and frontend type/lint checks**

```bash
cd apps/BBS-FE
npx tsx lib/decoration/inquiry-form.spec.ts
npx tsc --noEmit
npm run lint
```

- [ ] **Step 6: Commit the frontend form change**

```bash
cd apps/BBS-FE
git add lib/decoration components/decoration/decoration-inquiry-form.tsx lib/auth/types.ts
git commit -m "feat: capture decoration customer address"
```

---

### Task 4: Event Detail and browser customer document

**Files:**
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-customer-document.tsx`
- Create: `apps/BBS-FE/lib/decoration/customer-address-rendering.behavior.test.tsx`

**Interfaces:**
- Consumes: optional customer address from booking and customer document.
- Produces: conditional plain-text rendering in both user-facing views.

- [ ] **Step 1: Write failing rendering tests**

Render both components with and without customer address. Assert that a present
address is visible under the Customer heading, retains line breaks, and that
no Customer Address label is rendered for a legacy record.

- [ ] **Step 2: Run the behaviour test and verify failure**

```bash
cd apps/BBS-FE
npx tsx lib/decoration/customer-address-rendering.behavior.test.tsx
```

- [ ] **Step 3: Add conditional Customer Address rows**

Append the row only when `address?.trim()` is non-empty. Use
`whitespace-pre-wrap`, `break-words`, and full-width customer-grid treatment
for the multiline value so mobile cards do not overflow.

- [ ] **Step 4: Run focused and static-build verification**

```bash
cd apps/BBS-FE
npx tsx lib/decoration/customer-address-rendering.behavior.test.tsx
npx tsc --noEmit
npm run lint
npm run build
```

Verify that the static export completes and no dynamic route parameter is
introduced.

- [ ] **Step 5: Commit the frontend display change**

```bash
cd apps/BBS-FE
git add components/decoration lib/decoration
git commit -m "feat: display decoration customer address"
```

---

### Task 5: Full regression and final handoff

**Files:**
- Verify only; update the design or plan documents only if implementation
  reveals an approved requirement change.

- [ ] **Step 1: Run backend decoration regressions**

```bash
cd apps/BBS-BE
for spec in src/modules/decoration-bookings/*.spec.ts; do npx ts-node "$spec"; done
npm run lint
npm run build
git diff --check
```

- [ ] **Step 2: Run frontend decoration regressions**

```bash
cd apps/BBS-FE
for spec in lib/decoration/*.spec.ts lib/decoration/*.test.ts lib/decoration/*.test.tsx; do
  test -f "$spec" && npx tsx "$spec"
done
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Perform responsive manual checks**

Verify create, edit, Event Detail, View, and downloaded PDF with:

- no customer address;
- one-line customer address;
- multiline 1,000-character customer address;
- separate customer and event addresses;
- mobile width around 390 px;
- tablet width around 768 px;
- desktop width around 1440 px.

- [ ] **Step 4: Confirm repository state**

```bash
git -C apps/BBS-BE status --short
git -C apps/BBS-FE status --short
git -C apps/BBS-BE log -3 --oneline
git -C apps/BBS-FE log -3 --oneline
```

Report the backend and frontend commits, verification results, and explicitly
state that no database migration is required.
