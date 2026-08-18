# Manual accessibility and device QA

Automated checks catch regressions, not conformance. Complete this matrix on the release candidate and again on the deployed production origin.

## Keyboard and screen reader

- Traverse every header, menu, media control, disclosure, credit link, related-project link, and recovery action using Tab/Shift+Tab only.
- Confirm the skip link moves focus to main content; the mobile menu traps/restores focus and closes with Escape.
- Confirm one descriptive page heading, logical heading order, meaningful link names, visible focus, and no keyboard trap.
- With VoiceOver + Safari and NVDA + Firefox/Chrome, verify navigation/landmarks, project lists, captions, disclosures, media state announcements, errors, and 404 recovery.
- Confirm decorative images are ignored and informative images receive approved, contextual alternatives.

## Motion, media, and failure states

- With reduced motion, verify the intro, previews, Reel, and loops remain static until an explicit action.
- With Save-Data/coarse pointer simulation, verify deferred sources attach only after Play and controls remain usable.
- Pause every moving loop. Enter/exit fullscreen using keyboard and platform controls. Confirm failure messages retain the poster, project identity, and a recovery action.
- Verify captions in each supported browser and inspect transcript/download fallback. Confirm language/label accuracy and dialogue completeness.
- Block the image CDN and player hosts separately; verify stable layout and useful fallback, including Return to poster.

## Responsive and visual

- Inspect at 320, 375, 768, 1024, 1440, and 1920 px; landscape phone; a notched iOS device; 200% browser zoom; and text-only zoom.
- Check no horizontal clipping, contact/social wrapping, safe-area padding, readable credits, retained image ratios, poster focal points, and no orphan spacing when optional fields are empty.
- Check forced-colors/high-contrast mode, dark system UI chrome, and focus visibility on every surface.

## Browser/device release matrix

| Platform | Required |
|---|---|
| Chromium desktop + Android-sized viewport | Automated and manual smoke |
| Firefox desktop | Automated and manual media/caption smoke |
| Safari desktop | Automated WebKit plus real Safari smoke |
| iPhone Safari | Real device or trusted device lab; portrait, landscape, safe area |
| Screen reader | VoiceOver/Safari and NVDA/Firefox or Chrome |

Record browser/OS versions, tester, date, route/scenario, result, and issue link in `VERIFICATION.md`. Do not mark an unperformed platform check as passing.
