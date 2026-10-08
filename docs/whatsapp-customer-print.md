# WhatsApp customer print surface

`/print/whatsapp/` is an empty, no-index rendering shell, not a public booking lookup. The backend's headless browser injects a version-2 immutable snapshot via `window.renderWhatsappPrint`. No snapshot is read from URLs, local storage, or a public API. It renders the existing `PrintDocument` with `copyType="customer"` and the same CSS as normal Customer Print. Keep both flows on this component when editing print layout.

This route bypasses PWA/auth providers so no installation toast, service worker or auth redirect enters the document. It does not grant access to protected routes or APIs.

Deploy this frontend before the corresponding backend. Backend deployment checks the page with synthetic data before activating its release. The component test covers an empty shell, two packages, rules/signatures and cleanup; the backend browser integration test validates PDF text and multi-page output.
