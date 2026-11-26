# Approved event finance responsive design

User approved the local desktop/tablet/mobile account mockups and requested implementation, merge to main and production testing.

Keep API contracts, calculations, permissions and Excel exports. Put the event picker and selected event identity in one full-width panel. Compact metric cards use two columns on phones, three on tablets and six only when the content area is wide enough. Payment and expense histories become readable ledger cards with metadata, amount and payment-mode badges; desktop account histories sit side by side when the content area allows. Long identifiers, names and amounts must not cause page overflow. Scope light input background, text, placeholder, focus and date-picker styles to finance fields so global dark-field styling cannot leak in. Use the same shared expense ledger and field fixes for expense report/settings/event detail. Maintain keyboard focus visibility and at least 44px touch targets, and 16px phone inputs to avoid iOS zoom.

No upload to Superdesign. Sample-data local screenshots are the visual verification. Test actual components within the application shell at 320/390/820/1024/1440 widths; ensure no horizontal page overflow and unchanged export/permission behavior. User authorized commit, merge and production deployment. Backend requires no change.
