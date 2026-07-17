# SPEC — Dual-Subtitle YouTube Extension

Epic: E01-dual-subtitles
Date: 2026-07-16
Source: grilled in conversation (`/grill-me`, `/grill-with-docs`), see `docs/product/overview.md` and `CONTEXT.md`.

## Problem Statement

Language learners watching YouTube videos can only see one subtitle/caption
track at a time. To learn a new language (English especially) from video
content, they want to see the video's own subtitles alongside a translation
into their target language simultaneously, so they can follow along in both
languages without switching tracks back and forth.

## Solution

A Chrome extension that renders a second subtitle line, stacked below
YouTube's native caption overlay. The second line is a machine translation
(via YouTube's own auto-translate) of whatever track YouTube's player
currently has active. The user configures only which language the second
line translates into; everything else — which track counts as the first
line, when to re-translate, when to hide — is derived automatically from
YouTube's own player state.

See `CONTEXT.md` for canonical terms: **Primary Track**, **Secondary
Track**, **Secondary Language**, **Dual-Sub Mode**.

## User Stories

1. As a language learner, I want to see YouTube's native captions plus a
   translated line underneath, so I can read both languages while watching.
2. As a language learner, I want to set my target (Secondary) language once
   in the extension popup, so I don't have to configure it per video.
3. As a language learner, I want the translated line to always match
   whatever caption track YouTube is currently showing, so I don't get a
   mismatched pairing.
4. As a language learner, I want to toggle dual-sub display on/off from the
   toolbar icon, so I can turn it off when I don't want the extra line.
5. As a language learner, I want the extension to automatically turn on
   YouTube's native CC when I enable Dual-Sub Mode, so I don't have to
   remember to enable captions myself.
6. As a language learner watching a video with no captions at all, I want
   the extension to do nothing visibly, so my viewing isn't cluttered with
   error states.
7. As a language learner, I want the second line suppressed when it would
   just duplicate the first line (same language), so I don't see redundant
   text.
8. As a language learner, I want the extension to keep working correctly if
   I manually switch YouTube's own CC track mid-video, so the translated
   line updates to match my new selection instead of going stale.
9. As a language learner watching a video with multiple manual caption
   tracks, I want the extension to respect whatever track YouTube itself
   has selected as default, so I don't get an unexpected pairing.
10. As a language learner, I want the second line's timing to stay
    reasonably synced to the video even when the two tracks' cue
    boundaries don't line up exactly, so reading isn't jarring.
11. As a language learner, I want the second line to look visually
    distinct but consistent with YouTube's native caption style, so it
    reads as part of the same UI rather than a foreign overlay.
12. As a language learner, I want dual-sub display to keep working in
    fullscreen mode, so I'm not forced to watch windowed.
13. As a first-time installer, I want a simple popup with just the toolbar
    on/off state and the Secondary Language setting, so setup takes
    seconds.

## Implementation Decisions

- **Runtime**: Chrome extension, Manifest V3. Content script injected on
  YouTube watch pages; popup for settings; no background persistent state
  beyond `chrome.storage` for the Secondary Language setting and Dual-Sub
  Mode on/off flag.

- **Subtitle Engine module** (the one test seam): a pure, DOM-free and
  network-free module. Inputs: parsed Primary Track cues, parsed Secondary
  Track cues (or none, if not yet fetched/suppressed), `video.currentTime`,
  Dual-Sub Mode flag, Secondary Language setting, Primary Track's language
  code. Output: a render decision — which Primary cue text (if any) and
  which Secondary cue text (if any) should be visible at this instant, or a
  "suppressed" state when Primary Track language equals Secondary Language.
  All cue-lookup and suppression logic lives here; nothing else in the
  codebase re-implements it.

- **Track source of truth**: Primary Track is never a stored/configured
  language — it is read live from YouTube's player (whatever caption track
  the player currently has active, manual or ASR). The content script
  watches for changes to YouTube's active caption track and treats any
  change as a new Primary Track.

- **Track-change detection (US-010)**: watching starts as soon as the
  player element exists, not gated on captions being confirmed active —
  closes the startup/ad-break race where a switch during that window was
  previously missed. Detection reacts to YouTube's own track-change
  signal directly (event-driven) instead of polling, best-effort, no
  fixed latency SLA.

- **Secondary line style settings (US-011)**: color (free picker, text
  only), size (scale factor over the base 1.5vw), vertical position
  (offset from bottom), and opacity (0-100%) are user-configurable, global
  settings (same persistence pattern as Secondary Language), applied only
  to the Secondary line — the Primary Track remains YouTube's untouched
  native overlay. Changing these must not trigger a full session restart
  (see `docs/decisions/0009-style-settings-bypass-full-restart.md`) —
  they restyle the live element in place, no CC-menu re-drive, no
  re-fetch.

- **Secondary Track fetch**: on every new Primary Track (initial load or
  mid-video switch), fetch YouTube's timedtext auto-translate endpoint
  using the Primary Track's language code as source and the Secondary
  Language setting as target. Skip the fetch entirely when Primary Track's
  language code equals the Secondary Language setting (suppression case).

- **Sync mechanism**: Primary and Secondary cue lists are looked up
  independently against `video.currentTime` each render tick — no
  cross-track cue alignment or re-bucketing.

- **CC auto-enable**: when Dual-Sub Mode is turned on (toolbar icon
  click), the content script force-enables YouTube's native CC if it's
  off.

- **No-caption fallback**: if YouTube reports no caption tracks available
  (no manual, no ASR) for a video, the content script renders nothing and
  shows no UI, badge, or message.

- **Rendering**: Secondary Track line injected as a DOM element positioned
  directly below YouTube's native caption overlay, inside the player
  container, so it persists through fullscreen transitions. Fixed style
  (font/size matching native CC, dimmer color to visually distinguish from
  Primary). No user-facing style settings in this scope.

- **Toggle surface**: browser toolbar icon (extension action) is the only
  on/off control. State persists globally via `chrome.storage` across
  videos and browser sessions until toggled again.

- **Popup**: single settings surface — Secondary Language selector only.
  No per-video overrides.

- **Data source**: YouTube's undocumented timedtext auto-translate
  endpoint. No backend service, no paid translation API, no OAuth.

## Testing Decisions

- Tests target the **Subtitle Engine module** as the primary and near-only
  unit-test surface: given fixed cue-list fixtures for Primary/Secondary
  tracks, assert the render decision at various `currentTime` values,
  including boundary edges (cue start/end), gaps between cues (no active
  cue in one or both tracks), and the same-language suppression case.
- Good tests here assert on the module's output (render decision shape),
  never on internal cue-search implementation (e.g. don't assert it used
  binary search vs linear scan).
- Track-switch re-derivation (new Primary Track triggers fresh Secondary
  fetch) is tested at the Subtitle Engine level by feeding it a track-change
  event and asserting the engine requests a new Secondary Track fetch with
  the new source language.
- DOM injection, `chrome.storage` reads/writes, and the timedtext HTTP
  fetch itself are thin adapters around the engine and are not covered by
  unit tests in this scope; if covered, that would be integration/E2E
  layer (browser automation against a real or fixture YouTube page) —
  no prior art for this in the repo yet, first story to touch this should
  establish the harness `test:e2e` pattern per `docs/HARNESS.md`.

## Out of Scope

- Per-video language override (global setting only).
- Custom caption renderer replacing YouTube's native overlay.
- Firefox/Edge dedicated builds or testing.
- Self-hosted or paid external translation API.
- Live-stream caption handling (only pre-recorded VOD behavior specified).
- Multiple simultaneous secondary languages (exactly one Secondary
  Language at a time).

## Further Notes

- Risk classification per `docs/FEATURE_INTAKE.md`: touches External
  systems (YouTube's timedtext endpoint) = 1 flag → **normal** lane, not
  high-risk. Story packets should use `docs/templates/story.md`, not the
  high-risk-story folder.
- ToS risk on the undocumented endpoint is accepted (see
  `docs/product/overview.md`); revisit if YouTube blocks or breaks it —
  that would warrant a decision record at that time, not now.
- Full glossary (Primary Track, Secondary Track, Secondary Language,
  Dual-Sub Mode) lives in `CONTEXT.md` at repo root and should be used
  verbatim in all story packets derived from this spec.
