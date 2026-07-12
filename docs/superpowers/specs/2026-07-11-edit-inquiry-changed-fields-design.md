# Edit Inquiry Changed-Field PATCH Design

## Goal

Edit Inquiry must send only values intentionally changed by the user, preventing unchanged form values from triggering field-level RBAC checks or overwriting concurrent updates.

## Design

Create a focused payload builder that normalizes an order into the editable form's API representation, builds the corresponding representation from current form values, and returns a recursive changed-field PATCH. Nested customer properties are emitted individually; unchanged objects and arrays are omitted. Arrays are treated as atomic values and sent only when their normalized contents differ. Explicit clearing uses the DTO-supported empty or null value instead of `undefined`.

The create flow continues sending a complete payload. The edit flow uses the changed-field builder, skips the API call when no values changed, and relies on existing backend field-level RBAC as the authoritative security boundary. Backend protected-string comparisons normalize whitespace and null/empty equivalence to avoid false changes from harmless representation differences.

## Verification

Unit tests cover pax-only edits, omitted unchanged customer data, nested customer changes, cleared optional fields, arrays, and no-op edits. Backend permission tests cover harmless customer formatting and real protected changes.
