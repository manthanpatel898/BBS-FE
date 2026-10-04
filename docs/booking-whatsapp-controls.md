# Booking WhatsApp controls

- Super admin enables WhatsApp per restaurant and supplies its website, Instagram profile and contact number. Company users cannot enable the subscription themselves.
- The booking form records explicit customer consent; changing the entered number clears the checked state. Existing consent can be recorded or withdrawn in the event/menu WhatsApp panel.
- Inquiry creation and booking confirmation request their respective messages only when server-side gates pass.
- Normal **Save category** does not send a message. **Save & send on WhatsApp** appears only for enabled restaurants and confirmed bookings, never quotation drafts. It is disabled while saving or while global sending is unavailable.
- A successful save and a queued message are distinct from delivery. Event details show provider acceptance, sent, delivered, read or a safe failure explanation. Status polls briefly for queue reconciliation, then while pending; Refresh status can check later updates.
- Repeating the same saved menu does not resend its existing message. A changed menu creates a new revision, including all packages and selected items in its PDF.

Before release, complete real-device checks at mobile, tablet and desktop sizes, including keyboard-open scrolling. Full authenticated device testing and actual Twilio delivery require the staging environment and an explicitly approved internal recipient. No production sending is enabled by this code change.
