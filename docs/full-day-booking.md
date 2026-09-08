# Full Day Booking

Company admins can enable the feature under Settings → Full Day Booking. It is off by default. Existing Breakfast, Lunch and Dinner choices remain; Full Day is the only new selectable option.

Create/edit/transfer selectors offer Full Day when enabled. Existing Full Day bookings retain their value when disabled. Booking permissions continue to control who can change the slot. Existing meal-package selection, pax and pricing are independent.

Calendar search results and day-sidebar cards use purple for Full Day, keeping the status badge. Month tiles show a purple count for confirmed/completed Full Day bookings without counting them again in the ordinary booked count. Hall Slot Status expands their occupancy and shows Full Day Booked / Blocked by Full Day. Cancelled and inquiry records do not mark occupied cells.

Pure helper tests cover feature-on/off options, retained existing values, combined halls, occupied/empty cells and booking statuses. Package document regression tests cover primary/additional ordering and legacy bookings. Existing print/report views receive the stored service-slot label.

Before release, visually test settings, create/edit/transfer, month calendar and day sidebar at 390px, 768px, 1024px and 1440px. The browser runtime failed to initialize in this session, so visual and signed-in end-to-end testing are not claimed. The dependency audit returned no report; its existing policy skipped the unavailable audit, so rerun it with registry access before deployment.

Deploy the backend first. No settings migration is required. Existing reservation database indexes must be verified before enabling Full Day for a restaurant.
