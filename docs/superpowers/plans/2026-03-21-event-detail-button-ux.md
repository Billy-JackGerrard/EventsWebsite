# Event Detail Button UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Share and Duplicate buttons visually distinct, round the Back button to a pill, and add a swipe-left-to-go-back gesture on mobile.

**Architecture:** All changes are isolated to two files — `EventDetails.css` (styling) and `EventDetails.tsx` (JSX and gesture logic). No new files, no new dependencies, no data layer changes.

**Tech Stack:** React 19 + TypeScript, Framer Motion (`motion.button`, `scaleSpring`), CSS custom properties (no raw hex ever).

---

> **No test suite exists in this project.** TDD steps are replaced with: write the change, run the dev server, verify visually, then commit.

---

## File Map

| File | Change |
|------|--------|
| `src/components/events/EventDetails.css` | Update `.event-detail-close` (border-radius), `.event-detail-share-btn`, `.event-detail-duplicate-btn` (border, color, hover) |
| `src/components/events/EventDetails.tsx` | Convert share/duplicate `<button>` → `<motion.button>`, add `useRef` + touch handlers to root `motion.div` |

---

## Task 1: Back button — pill shape

**Files:**
- Modify: `src/components/events/EventDetails.css`

- [ ] **Step 1: Update border-radius**

In `EventDetails.css`, find `.event-detail-close` and change:
```css
/* before */
border-radius: 2px;

/* after */
border-radius: 999px;
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open an event detail card. The "← Back" button should now be pill-shaped, consistent with the Edit/Delete buttons.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventDetails.css
git commit -m "style: round back button to pill shape on event detail card"
```

---

## Task 2: Share & Duplicate — accent outline style

**Files:**
- Modify: `src/components/events/EventDetails.css`

These two buttons currently use `var(--color-border)` / `var(--color-text-muted)` which blends into the card. Replace with accent outline to match the existing "Add to Calendar" button.

- [ ] **Step 1: Update `.event-detail-share-btn`**

Replace the existing default and hover declarations:

```css
/* Default state — replace existing border and color values */
.event-detail-share-btn {
    width: 100%;
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    font-size: 0.8rem;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
}

.event-detail-share-btn:hover {
    background: var(--color-accent);
    color: var(--color-bg-card);
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(var(--color-shadow-accent), 0.25);
}
```

- [ ] **Step 2: Update `.event-detail-duplicate-btn`**

Replace identically:

```css
.event-detail-duplicate-btn {
    width: 100%;
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    font-size: 0.8rem;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-full);
    cursor: pointer;
    margin-top: 0.4rem;
    transition: all 0.2s var(--ease-out);
}

.event-detail-duplicate-btn:hover {
    background: var(--color-accent);
    color: var(--color-bg-card);
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(var(--color-shadow-accent), 0.25);
}
```

- [ ] **Step 3: Verify visually**

With dev server running, open an event. The Share and Duplicate buttons should now have a coloured border and text matching the theme accent, and fill solid on hover — identical in appearance to the "Add to Calendar" button. Test across at least light and dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/EventDetails.css
git commit -m "style: accent outline treatment for share and duplicate buttons"
```

---

## Task 3: Share & Duplicate — Framer Motion tap feedback

**Files:**
- Modify: `src/components/events/EventDetails.tsx`

`scaleSpring` is already imported at the top of this file. Convert the two plain `<button>` elements to `<motion.button>` with `whileTap` for tap scale feedback. Do NOT add `whileHover` — CSS hover handles the visual lift and adding Framer Motion hover would conflict with the CSS `transform`.

- [ ] **Step 1: Convert share button**

`ShareButton` is a locally-defined function component in `EventDetails.tsx` (around line 24 — not an import). Change its internal button element:
```tsx
// before
<button className="event-detail-share-btn" onClick={() => copy(shareUrl)}>

// after
<motion.button className="event-detail-share-btn" onClick={() => copy(shareUrl)} whileTap={scaleSpring.tap}>
```

Close tag changes from `</button>` to `</motion.button>`.

- [ ] **Step 2: Convert duplicate button**

Find the duplicate button render (around line 247). Change:
```tsx
// before
<button className="event-detail-duplicate-btn" onClick={() => onDuplicate(event)}>

// after
<motion.button className="event-detail-duplicate-btn" onClick={() => onDuplicate(event)} whileTap={scaleSpring.tap}>
```

Close tag from `</button>` → `</motion.button>`.

Note: `motion` is already imported from `framer-motion` at the top of this file.

- [ ] **Step 3: Verify visually**

Tap/click Share and Duplicate on mobile or using browser DevTools touch simulation. Both should briefly scale down (0.97) on press then spring back.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/EventDetails.tsx
git commit -m "feat: add tap spring feedback to share and duplicate buttons"
```

---

## Task 4: Swipe left to go back (mobile gesture)

**Files:**
- Modify: `src/components/events/EventDetails.tsx`

Add touch gesture handling to the root `motion.div` of the card. A leftward swipe (finger moves right-to-left, ≥60px horizontal, ≤40px vertical drift) calls `onClose()`.

`useRef` is already available — confirm it is imported: the file uses `import { ... } from "react"` at the top. Add `useRef` to that import if not present.

- [ ] **Step 1: Add refs inside `EventDetailCard`**

Immediately after the opening of `EventDetailCard` (before the `return`), add:

```tsx
const touchStartX = useRef(0);
const touchStartY = useRef(0);
```

- [ ] **Step 2: Add touch handler functions**

After the refs, add:

```tsx
const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length > 1) return;
  touchStartX.current = e.touches[0].clientX;
  touchStartY.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const dx = touchStartX.current - e.changedTouches[0].clientX;
  const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
  touchStartX.current = 0;
  touchStartY.current = 0;
  if (dx >= 60 && dy <= 40) onClose();
};

const handleTouchCancel = () => {
  touchStartX.current = 0;
  touchStartY.current = 0;
};
```

- [ ] **Step 3: Attach handlers to the root motion.div**

Find the opening `<motion.div className="event-detail-card" ...>` (first line of the return). Add the three handlers to the **existing** opening tag — do not replace any existing props, just add alongside them:

```tsx
onTouchStart={handleTouchStart}
onTouchEnd={handleTouchEnd}
onTouchCancel={handleTouchCancel}
```

- [ ] **Step 4: Verify the gesture**

In browser DevTools, enable touch simulation. Open an event detail card. Swipe leftward (right-to-left) across the card with a clear horizontal motion — the card should close (Back navigation fires). Then verify:
- A short leftward nudge (<60px) does nothing.
- A diagonal swipe with large vertical component (>40px) does nothing.
- The Back button still works normally.

- [ ] **Step 5: Commit**

```bash
git add src/components/events/EventDetails.tsx
git commit -m "feat: swipe left to go back on event detail card (mobile)"
```

---

## Done

All four tasks complete. Run `npm run build` to confirm no TypeScript errors before considering the work finished.
