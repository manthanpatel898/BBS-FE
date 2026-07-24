# Decoration Inventory Gallery Design

**Date:** 2026-07-25  
**Scope:** Event-decoration selection popup only  
**Status:** Approved interaction design, pending implementation plan

## Problem

The Decoration Notes Builder currently exposes only **Add Photo Note** as the main action. Existing catalog inventory is hidden inside a name-only dropdown on each note. This creates two usability problems:

1. Staff cannot discover that existing inventory can be selected.
2. A name-only dropdown becomes impractical when the company has many items and staff recognize items primarily from photographs.

## Approved Experience

The notes builder will expose two equally clear creation paths:

1. **Browse Existing Inventory** — primary action that opens the inventory gallery.
2. **Add Custom Photo Note** — uploads and crops an event-specific image that is not in the catalog.

The existing **Link inventory item (optional)** dropdown will be removed from note cards. Catalog linking will happen only through the inventory gallery, eliminating duplicate and confusing selection methods.

## Inventory Gallery

The gallery opens as a nested, mobile-first popup above the Decoration Notes Builder. It will use the platform’s existing modal layering, focus restoration, body-lock, and responsive patterns.

### Discovery and filtering

The gallery provides:

- search by inventory item name;
- category/type filters such as Sofa, Couple Entry, and Stage;
- an **All** filter;
- image-first cards using each item’s configured cover image;
- item name and decoration type;
- live available quantity and total quantity;
- a clear unavailable state.

Search and category filtering run locally over the catalog already loaded for the booking. Availability remains sourced from the booking-specific availability API.

### Selection rules

- An active item with available quantity greater than zero can be selected.
- An active item with zero availability remains visible for awareness but is disabled and labelled **Not available**.
- Inactive items are not shown.
- Selecting an item immediately creates one ordered note block with:
  - its catalog item and category identifiers;
  - its item name as the default title;
  - quantity `1`;
  - the catalog cover image;
  - the catalog description as the default description when available.
- Selecting the same catalog item again is not allowed. The existing note is focused instead.
- The final backend availability validation remains authoritative and protects against concurrent bookings.

## Multiple Images

The configured cover image is used by default.

When an item contains multiple images, its note card exposes **Change image**. This opens a compact image picker containing only that inventory item’s configured images. Changing the presentation image does not change the linked item, quantity, availability, or reservation.

An inventory item without an image cannot be selected because the approved notes workflow requires an image. Its card remains visible with **Image required** and directs administrators to configure an image in Settings.

## Selected Note Editing

After a catalog item is added, staff may edit:

- title;
- quantity, constrained to a positive integer and current live availability;
- optional description;
- selected presentation image when the item has multiple images;
- order;
- removal.

Catalog identity is displayed as a read-only badge rather than an editable dropdown. A staff member who wants another inventory item removes the note and chooses the correct item from the gallery.

Custom photo notes retain the existing image upload/crop, title, quantity, description, ordering, and removal behaviour. They show a **Custom item** badge.

## Main Popup Layout

On mobile, the actions appear as full-width buttons above the selected notes:

1. amber **Browse Existing Inventory**;
2. outlined **Add Custom Photo Note**.

On tablet and desktop they may appear side by side. Selected notes remain vertically ordered below the actions. General Notes and Final Package Price remain unchanged.

The action footer stays fixed and the note content scrolls inside the popup.

## Loading and Error Handling

- Catalog and initial booking availability load once when the notes builder opens.
- Opening or filtering the gallery does not call the server repeatedly.
- The final save revalidates availability on the backend.
- If availability changed, the existing reservation error explains which item is unavailable and the gallery refreshes before the user retries.
- Broken catalog images display a stable fallback and block selection if no valid configured image remains.
- Upload, crop, stale-request, retry, autosave, and draft recovery protections remain unchanged for custom notes.

## Data and API Impact

No new database collection or migration is required.

The existing decoration category, item, image, availability, draft, snapshot, and reservation models already contain the required information. Frontend state will carry the selected inventory image key and URL in the existing draft block and final snapshot structures.

No banquet module APIs, screens, permissions, or booking flows will change.

## Accessibility and Responsiveness

- Minimum touch target size remains 44 pixels.
- Gallery cards and actions have accessible names.
- Keyboard focus returns to **Browse Existing Inventory** when the gallery closes.
- Disabled cards expose their unavailable reason.
- Mobile uses a two-column image grid where width permits and a single column on narrow screens.
- Tablet and desktop use denser responsive grids without horizontal page scrolling.

## Test Coverage

Automated tests will cover:

- both main actions being visible;
- removal of the name-only inventory dropdown;
- search and category filtering;
- image, category, and availability presentation;
- disabled unavailable and image-missing items;
- catalog selection creating a quantity-one ordered note;
- prevention of duplicate catalog selection;
- cover-image default and alternate-image selection;
- quantity validation against availability;
- custom photo flow regression;
- draft recovery and final-save regression;
- nested modal focus/body-lock behaviour;
- static production build;
- banquet isolation.

## Success Criteria

Staff can recognize and select configured inventory without remembering item names, while custom event-specific photo notes remain available as a separate, obvious workflow. The selection remains fast on mobile, displays truthful availability, and preserves existing production data and banquet behaviour.
