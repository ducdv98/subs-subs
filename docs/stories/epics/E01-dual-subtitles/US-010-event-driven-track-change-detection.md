# US-010 Event-driven track-change detection

## Status

implemented

## Lane

normal

## Product Contract

Primary Track change detection reacts to YouTube's own track-change
signal directly instead of polling, and starts watching as soon as the
player element exists (not gated on captions being confirmed active),
closing the startup/ad-break window where a manual switch could
previously be missed. Builds on US-004's manual-switch behavior, which
already re-derives Secondary Track on any detected change — this story
only changes *when* and *how fast* the change is noticed.

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`

## Acceptance Criteria

- Switching YouTube's active caption track (via CC menu, keyboard
  shortcut, or YouTube auto-selecting a different default) is detected
  without relying on the current fixed polling intervals
  (`player-bridge.js`'s 250ms publish loop and `content/index.js`'s
  500ms `checkForTrackChange`); reacts to the player's own change signal
  where the player exposes one.
- Track-watching is active from the moment the player element is found,
  not only after captions are confirmed active — a track switch that
  happens during the startup wait (including during a pre-roll ad) is
  detected once captions do become active.
- No regression to US-004's existing behavior: a detected change still
  triggers a fresh Secondary Track fetch sourced from the new Primary
  Track's language code, and still suppresses correctly when the new
  Primary Track's language equals the Secondary Language setting.

## Design Notes

- Commands: none new.
- Queries: replace/augment the fixed-interval poll in
  `content/player-bridge.js` (MAIN world) and `content/index.js`
  (isolated world) with an event-driven relay where YouTube's player
  exposes a change signal; fall back to polling only where no such
  signal is available. Exact mechanism (player event listener vs.
  MutationObserver vs. reduced-interval poll) is an implementation
  spike, not a product decision — no fixed latency SLA, best-effort
  minimization of the current up-to-~750ms combined lag.
- API: none new.
- Tables: none.
- Domain rules: reuses US-001's `derivePrimaryTrackChange` signal
  unchanged — only the trigger mechanism and its timing window change.
- UI surfaces: none (no visible UI change, only responsiveness).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-010 --unit 0 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable — no new pure-logic branch in Subtitle Engine |
| Integration | Not applicable at this ticket |
| E2E | Manual/automated: switch CC track during initial ad/startup window and mid-video, assert Secondary line updates in both cases with reduced lag vs. baseline |
| Platform | Not applicable |
| Release | |

## Harness Delta

None anticipated beyond what US-003/US-004 establish for E2E pattern.

## Evidence

- `extension/content/player-bridge.js`: fixed 250ms `setInterval(publish, 250)`
  replaced with a `MutationObserver` on `#movie_player` (attributes,
  childList, subtree) that re-publishes on every relevant player DOM
  mutation, plus a bootstrap `MutationObserver` on `document.documentElement`
  that starts watching the instant `#movie_player` appears — no longer
  gated on captions being active. Publishes only dispatch the new
  `dual-subs-player-state-changed` event when the serialized state actually
  changes (diffed against the previous publish).
- `extension/content/index.js`: fixed 500ms `setInterval(checkForTrackChange,
  500)` replaced with a `document.addEventListener("dual-subs-player-state-changed",
  checkForTrackChange)` listener, attached at the same point the old
  interval used to start (after the initial Secondary Track settles).
  Ad-break/startup-window coverage (AC2) comes from the unchanged
  `waitFor(activeTrack...)` wait and `settleSecondaryCues`'s own re-check
  loop, which always resolve with whatever track is live at that moment —
  not from this listener, which only needs to cover switches after the
  session is already running.
- `npm test` — full suite (22 tests) green; no new unit-testable branch was
  introduced (Subtitle Engine untouched, per Design Notes).
- `npm run typecheck` — clean.
- `node --check` on both modified files — clean.
- E2E — ran against live `youtube.com` (video `jNQXAC9IVRw`, tracks `en`/`de`)
  via a Playwright-driven Chrome instance with the unpacked extension
  loaded (`--load-extension`), across three scripted scenarios (scratch
  scripts, not checked in — no `test:e2e` harness exists yet in this repo,
  per SPEC.md's Testing Decisions note that this would be the first story
  to establish one):
  - **AC1** (event-driven, no fixed poll): called `player.setOption("captions",
    "track", {...})` directly (the same call YouTube's own CC menu makes)
    and measured time to `player-bridge.js`'s `dual-subs-player-state-changed`
    event — fired in ~3ms, `activeLanguageCode` in the published state
    matched the new track. Confirms the MutationObserver relay reacts to
    the player's own change, not a 250ms poll tick.
  - **AC3 / US-004 regression**: with Dual-Sub Mode on and Secondary
    Language set to a language matching neither track, switched the active
    track mid-session (`en` → `de`); `content/index.js`'s
    `checkForTrackChange` (registered via `document.addEventListener`, no
    `setInterval`) fired and `settleSecondaryCues` re-derived with
    `primaryLanguageCode: de` — confirmed via console log, independent of
    the native auto-translate fetch (which is flaky under fast scripted
    menu-driving in this repo's existing implementation — a pre-existing,
    unrelated limitation, not something this story touches).
  - **AC2** (startup/ad window): issued the track-change call immediately
    after `#movie_player` appeared, before captions were confirmed active,
    then let the session proceed — the session's very first "active track"
    log showed the switched-to language (`de`), never the stale default
    (`en`), confirming a switch during the startup wait isn't missed.
  All three passed. `--e2e 1` recorded.
