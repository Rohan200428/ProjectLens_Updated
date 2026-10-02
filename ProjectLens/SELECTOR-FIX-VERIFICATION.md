# Submission form fixes

Verified 02 October 2026, 20:40 local time.

- The proposal heading reads "Give your idea a clear direction." Normal whitespace replaces the hidden line break that previously joined "idea" and "a" at smaller widths.
- The technology options region is focusable. Native scrollbar clicks now transfer focus within the selector, preserving the dropdown while its scrollbar track or thumb is used. Existing outside-click/focus dismissal and selection behavior remain unchanged.
- Production build passed: 682.96 kB initial raw / 136.41 kB estimated transfer.
- Twelve native-scrollbar regression checks passed at 1440px light, 714px dark, and 390px light. Playwright's default hidden scrollbar was explicitly disabled so these checks exercise actual mouse track clicks and thumb dragging, alongside wheel/keyboard scrolling, selection, Escape, Done, outside focus and outside clicks.
- No browser exceptions; all 177 existing frontend class members still match the functional baseline. No submissions were saved by these checks.

Run `node scripts/e2e-selector.mjs` with the local demo running and the supported Node runtime. Results are written to `work/selector/results.json`.
