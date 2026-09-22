# Invoice numbering settings

Location: **Settings → Tax Invoice → Invoice Numbering**. Available to company
admins of banquet restaurants with tax billing enabled. Existing invoice issue,
download, and print permissions are unchanged.

To make the next invoice `12/2026-2027`:

1. Choose Number / Financial year.
2. Choose full financial year and one digit (no zero padding).
3. Enter 12 as the next sequence, choose annual reset or continuation, and save.

The three-number preview is indicative, not reserved. Existing invoices are
unchanged. Enter a next number that also accounts for invoices created outside
Zenbooking. A stale save keeps your edits and explains the conflict; reloading
saved settings explicitly discards those edits.

New formats are limited to 16 characters; prefixes are optional and accept
letters, digits, and hyphens. Without a year in the format, use continuous
numbering. The financial year is supplied by the backend, not the device clock.

Deploy the matching backend first. Its existing `migrate:banquet-invoices`
command adds sequence lookup indexes; see the backend rollout documentation.
No restaurant changes series until its admin explicitly saves these settings.

Automated checks cover formatting, validation, save payloads, stale-save error
handling, and reload behavior. Fields stack on small screens and use two columns
on tablet/desktop. Browser-based visual verification at 390, 768, and 1024 pixels
remains a pre-release check because the browser tool was unavailable during development.
