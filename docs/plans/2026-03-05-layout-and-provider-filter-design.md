# Design: Desktop Split-Panel Layout + Provider Filter Chips

**Date:** 2026-03-05
**Status:** Approved

---

## Problem Statement

Two UX issues identified via Playwright inspection:

1. **Desktop details panel** uses a full-screen overlay that blurs and obscures the results list, preventing users from browsing results and viewing details simultaneously. On wide screens (1440px+) this wastes the available space.

2. **Provider filter list** truncates provider names to ~4 characters ("Goo...", "Net...", "Cru..."), has 30+ entries in a dense 6-column grid with duplicate variants, and has no way to search or find a specific provider quickly.

---

## Design Decisions

### 1. Desktop Split-Panel Layout

**Breakpoint:** `lg` (1024px+) switches to side-by-side layout. Below `lg` keeps the current overlay behavior unchanged.

**Structure:**
- Left panel (~55% width): search form (collapsed after search), search history, results grid, pagination
- Right panel (~45% width): title details, always visible, scrolls independently
- No overlay, no backdrop, no blur — both panels coexist
- Results grid stays 3-column (same width as current blurred state, but now usable)

**Empty state (no title selected):**
Right panel shows a subtle placeholder: "Select a title to see where it streams."

**Details panel improvements:**
- Streaming availability for the user's detected/selected country expands by default (not collapsed)
- Panel scrolls independently of the left side

### 2. Provider Filter — Logo-Only Chips

**Replace** the truncated-name 6-column checkbox grid with a chip-based layout:

**Chip design:**
- 40×40px provider logo in a rounded square chip, no inline text
- Selected: primary gold border + subtle glow
- Unselected: muted border
- Hover/focus: tooltip showing full provider name (native `title` attribute + accessible label)

**Layout:**
- Search input at top filters chips in real time
- "Popular" section: top 8–10 well-known providers always shown first (Netflix, Prime Video, Disney+, Hulu, Apple TV+, Max, Peacock, Paramount+, Crunchyroll, YouTube Premium)
- "All providers" section: remaining providers below
- Fixed-height scrollable container retained

**Variant grouping:**
- Multiple variants of the same brand (e.g. Paramount+ Essential, Paramount+ Apple TV Channel) are grouped under one chip that selects all variant IDs
- Reduces visible list from 30+ entries to ~15 meaningful choices

---

## Out of Scope

- Mobile layout changes (overlay behavior kept as-is below `lg`)
- Adding new filter types
- Changes to the search form filters (type, year, genre, language)
- Pagination or results sorting changes

---

## Files Likely Affected

| File | Change |
|------|--------|
| `app/page.tsx` | Add split-panel layout at `lg` breakpoint, conditionally render right panel |
| `app/components/DetailsSidebar.tsx` | Refactor: at `lg` render inline panel, below `lg` keep overlay |
| `app/components/ResultDetails.tsx` | Expand user country availability by default |
| `app/components/SearchForm.tsx` | Replace provider grid with chip component |
| `app/components/ProviderChips.tsx` | New component: chip grid with search + grouping |
| `app/globals.css` | Any needed layout utility classes |
