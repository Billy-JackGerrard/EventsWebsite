# Event Detail Card — Button UX Improvements

**Date:** 2026-03-21
**Status:** Approved

## Problem

Three UX issues on the EventDetails card:

1. **Share & Duplicate buttons blend into the card** — both use `var(--color-border)` border and `var(--color-text-muted)` text, the same ambient styling as the card surface. Not visually distinct as actionable buttons. Duplicate should be clearly available to all users (to pre-fill the event submission form).
2. **Back button is too rectangular** — `border-radius: 2px` inconsistent with edit/delete which use `999px` pill.
3. **No swipe-to-go-back on mobile** — users must tap the back button.

## Design

### 1. Back button — pill shape

Change `.event-detail-close` `border-radius: 2px` → `999px`. CSS-only change. The element is already `<motion.button whileTap={scaleSpring.tap}>` — no element type change needed.

### 2. Share & Duplicate — accent outline treatment

Matches the existing "Add to Calendar" button (`.event-detail-cal-btn`), including the hover `color: var(--color-bg-card)` pattern which is already in use there and works across all themes.

**CSS tokens (confirmed in all 14 theme variants in `src/themes.css`):**
- `var(--color-accent)` — accent colour
- `var(--color-bg-card)` — card surface; used as filled-state text colour (same as existing cal button)
- `var(--color-shadow-accent)` — RGB triplet; used as `rgba(var(--color-shadow-accent), 0.25)`

**Target CSS classes (both exist in current `EventDetails.css`):**
- `.event-detail-share-btn`
- `.event-detail-duplicate-btn`

Both already have `transition: all 0.2s var(--ease-out)` — no new transition needed.

**Default state:**
```css
border: 1px solid var(--color-accent);
color: var(--color-accent);
background: transparent;
```

**CSS `:hover` state:**
```css
background: var(--color-accent);
color: var(--color-bg-card);
transform: translateY(-1px);
box-shadow: 0 3px 10px rgba(var(--color-shadow-accent), 0.25);
```

**Framer Motion:** Convert both `<button>` to `<motion.button whileTap={scaleSpring.tap}>`. `scaleSpring` is already imported in `EventDetails.tsx`. Do NOT add `whileHover` — CSS `:hover` handles lift/fill and adding Framer Motion `whileHover` would conflict with the CSS transform.

**Duplicate button guard:** `{onDuplicate && (...)}` wrapper is kept. `onDuplicate` stays optional in the type signature (some consumers like `AdminQueue` may not provide it). Verified: `main.tsx` line 333 passes `onDuplicate={handleDuplicateEvent}` with no `isLoggedIn` guard — the button is already visible to all users. No change to `main.tsx` needed.

### 3. Swipe left to go back (mobile)

Direction: the user specified "swipe left" — finger moves rightward-to-leftward. `dx` (positive = leftward) ≥ 60 triggers `onClose()`.

**Attachment:** `onTouchStart` / `onTouchEnd` / `onTouchCancel` on the root `motion.div`. No `overflow-y` scroll on this card, so events reach the root unobstructed.

**State:** `const touchStartX = useRef(0); const touchStartY = useRef(0);` (`useRef` already imported).

**`onTouchStart`:**
```ts
if (e.touches.length > 1) return  // ignore multi-touch
touchStartX.current = e.touches[0].clientX
touchStartY.current = e.touches[0].clientY
```

**`onTouchEnd`:**
```ts
const dx = touchStartX.current - e.changedTouches[0].clientX  // positive = leftward
const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
touchStartX.current = 0
touchStartY.current = 0
if (dx >= 60 && dy <= 40) onClose()
```
`dy <= 40` guards against accidentally triggering during diagonal scrolls on the outer page (the card has no internal scroll, but the page does). Reset refs after reading.

**`onTouchCancel`:** reset both refs to `0`. Does not call `onClose()`.

**No visual drag/slide.** Existing Framer Motion exit animation plays as normal.

**Accessibility:** Swipe is supplementary only. Back button remains primary. No ARIA changes needed.

## Files Affected

- `src/components/events/EventDetails.css` — `.event-detail-close` (border-radius), `.event-detail-share-btn`, `.event-detail-duplicate-btn` (border/color/hover)
- `src/components/events/EventDetails.tsx` — swipe handlers + refs, `<button>` → `<motion.button>` for share and duplicate

## Out of Scope

- SVG icons for share/duplicate
- Visual drag/slide on swipe
- Changes to `main.tsx`
