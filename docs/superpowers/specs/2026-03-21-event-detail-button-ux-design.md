# Event Detail Card — Button UX Improvements

**Date:** 2026-03-21
**Status:** Approved

## Problem

Three UX issues on the EventDetails card:

1. **Share & Duplicate buttons blend into the card** — both use `var(--color-border)` border and `var(--color-text-muted)` text, the same ambient styling as the card surface. They are not visually distinct as actionable buttons.
2. **Back button is too rectangular** — `border-radius: 2px` is inconsistent with the rest of the card's button language (edit/delete use `999px` pill).
3. **No swipe-to-go-back on mobile** — no gesture navigation; users must tap the back button.
4. **Duplicate button is gated to admins** — it should be available to all users as a way to pre-fill the event submission form.

## Design

### 1. Back button — pill shape
- Change `.event-detail-close` `border-radius: 2px` → `999px`
- No other changes; retains transparent/muted style

### 2. Share & Duplicate — accent outline treatment
Matches the existing "Add to Calendar" button pattern.

**Default state:**
- `border: 1px solid var(--color-accent)`
- `color: var(--color-accent)`
- `background: transparent`

**Hover state:**
- `background: var(--color-accent)`
- `color: var(--color-bg-card)`
- `transform: translateY(-1px)`
- `box-shadow: 0 3px 10px rgba(var(--color-shadow-accent), 0.25)`

Both share and duplicate get identical treatment — they are equal-weight actions.

### 3. Swipe left to go back (mobile only)
Implemented via `onTouchStart` / `onTouchEnd` handlers on the root `motion.div` of the card.

**Trigger condition:**
- Horizontal delta ≥ 60px leftward
- Vertical delta ≤ 40px (prevents firing during vertical scrolls)

**Behaviour:** calls `onClose()` — same as tapping Back. No visual drag or slide animation; the existing Framer Motion exit animation plays as normal.

### 4. Duplicate button visibility
- Remove the `{onDuplicate && ...}` guard that hides the button from non-admins
- The button renders whenever `onDuplicate` is passed as a prop
- Callers (EventPage, etc.) should pass `onDuplicate` regardless of login state, so all users can duplicate events to pre-fill the submission form

## Files Affected

- `src/components/events/EventDetails.css` — button style changes (back, share, duplicate)
- `src/components/events/EventDetails.tsx` — swipe handlers, duplicate visibility
- Any parent components that conditionally pass `onDuplicate` only when `isLoggedIn`

## Out of Scope

- SVG icons for share/duplicate (can be added later)
- Visual drag/slide animation on swipe
- Edge-only swipe (full-card swipe was chosen as horizontal scrolling is not needed on this view)
