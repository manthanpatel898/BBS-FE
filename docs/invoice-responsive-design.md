# Invoice interface

The invoice workspace and shared booking invoice dialog import a scoped light
surface stylesheet. It protects input, placeholder, disabled-control and inherited
text contrast from legacy dark-page styles without changing other modules.

The workspace uses the existing invoice cards below 1200px (two columns on tablet,
one on phones), and the complete invoice table on wider screens. Currency columns
are right-aligned. Dialog content scrolls independently of the footer; mobile
actions stack and long identifiers can wrap. The same dialog covers issue, view,
correction/reissue and cancelled-copy download from both entry points.

No invoice calculation, permission, payload or PDF changes are included.
Automated checks cover style boundaries and existing invoice business helpers.
Before release, visually check 390px, 768px, 1024px and desktop widths, including
populated/disabled fields, long customer details, errors, reissue and history.
