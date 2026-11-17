# Autocomplete viewport verification — issue #36

Recorded November 17, 2026. Baseline: `eefb515c09d6c07a600934d9348b5175ad958161`.
Deterministic API fixtures return 40 normalized movie suggestions. Screenshots show the
last option selected using 40 ArrowDown presses while the input retains focus.

| Viewport              | Before: list bounds / active option          | After: list bounds / active option    |
| --------------------- | -------------------------------------------- | ------------------------------------- |
| Desktop, 1280×800     | y=308–2868 / y=2804–2868; no internal scroll | y=308–678 / y=614–678; scrollTop=2190 |
| Short screen, 375×500 | y=344–2904 / y=2840–2904; no internal scroll | y=15–258 / y=194–258; scrollTop=2317  |

The baseline list was 2560px tall. After the fix its scroll area is 370px on desktop
and 243px on the short screen. The latter opens above the input. The popup sits above
the sticky header so the first option remains unobstructed. All 40 returned options
remain available; there is no new suggestion truncation. Enter with no highlighted
option still opens the full search results.

- [Desktop before](before-desktop.png) / [after](after-desktop.png)
- [Short screen before](before-short-mobile.png) / [after](after-short-mobile.png)

## Verified flow

Typing → autocomplete request → fixture response → bounded list → keyboard/pointer/touch
selection → country-specific title route with returnTo → Back to search with query retained.
API/data behavior is unchanged. These browser checks use mocked responses, not live TMDB.

`e2e/tests/autocomplete-responsive.e2e.spec.ts` verifies last/first active option visibility,
input focus, unobstructed first-option hit testing, Escape preserving the query, Enter,
internal scroll reachability, click/tap selection, six recent titles, live viewport resizing,
and the search/title round trip. It runs in Chromium desktop, iPad and Pixel 5 projects.
Touch selection is emulated; scrolling is driven through the list's scrollTop rather than
a physical touch gesture. Playwright reports attach screenshots and measured list bounds.

Validation:

- All 555 unit tests passed; the eight SearchBox tests were rerun after the final changes,
  including #22/#42's pending-commit cancellation for keyboard and pointer selection.
- All 18 autocomplete browser checks passed. After the final stacking fix and round-trip
  assertions, all 12 viewport-sensitive checks passed again across the three projects.
- Production build, ESLint, TypeScript and changed-file formatting passed.

The initial browser setup lacked Playwright binaries; installation used
`PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers`. Baseline capture used system Chromium;
final checks used Playwright Chromium. A stale server during a rebuild caused an early
harness failure; verification above used a fresh production server.

## Pending real-device check

**Real mobile software-keyboard behavior is not verified.** Browser device/viewport
emulation does not expose a real software keyboard. The implementation observes
visualViewport resize/scroll and window resize/scroll, but this is not evidence of
real-keyboard behavior. On a real phone, focus search with many suggestions and the
keyboard open; verify visible bounds, touch scrolling/selection, orientation changes,
and keyboard dismissal. Keep this limitation recorded until that check is performed.
