# US-006 Secondary Track capture via native auto-translate (PoToken workaround)

## Status

implemented

## Lane

normal

## Product Contract

Secondary Track continues to render correctly (per `CONTEXT.md` and
`docs/stories/epics/E01-dual-subtitles/SPEC.md`) despite YouTube's PoToken
enforcement blocking direct `timedtext` fetches. `content/index.js`'s
`fetchSecondaryCues()` previously called `fetch()` directly against
`/api/timedtext?...&tlang=<lang>&fmt=vtt` using a signed `baseUrl` from
`getPlayerResponse()`; this now always returns HTTP 200 with an empty body
(confirmed root cause: YouTube's PoToken enforcement on the `web` client's
subtitles endpoint — see `docs/research/pototoken-timedtext.md`). This is an
external provider behavior change, not a regression in our code; US-003
(Live dual-caption rendering) and US-004 (re-derive on manual track switch)
both depended on the now-broken fetch path.

Fix: don't fetch anything ourselves. Drive YouTube's own native CC
"Auto-translate" menu (the same UI path a human uses) so YouTube's own
player issues the `timedtext?tlang=` request — a genuine first-party
request that carries a valid PoToken — then intercept that response in the
page's own JS context and hand the VTT text back to the extension. Primary
Track rendering is unaffected (`content/index.js` already hardcodes
`primaryCues: []` and relies entirely on YouTube's native rendering for the
primary line).

## Relevant Product Docs

- `docs/product/overview.md`
- `docs/stories/epics/E01-dual-subtitles/SPEC.md`
- `CONTEXT.md`
- `docs/research/pototoken-timedtext.md`

## Acceptance Criteria

- Secondary line shows real translated cue text (not the "no secondary
  captions available" fallback) on a video with genuine manual captions and
  a valid Secondary Language setting.
- Existing US-004 behavior (re-derive on manual track switch) continues to
  work against the new capture mechanism.
- Existing US-001 suppression logic (Primary Track language === Secondary
  Language) is unaffected — reuses `computeRenderDecision` unchanged.
- On capture failure/timeout, falls back to the existing "no secondary
  captions available" UX (`secondaryCues = []`) rather than a new/different
  failure state.

## Design Notes

- Commands: `dual-subs-set-active-track` (ISOLATED→MAIN, restores Primary
  Track after capture).
- Queries: `dual-subs-secondary-vtt` (MAIN→ISOLATED, captured VTT payload).
- API: none of our own; rides YouTube's own first-party `timedtext` request
  triggered via native CC menu automation.
- Tables: none.
- Domain rules: reuses US-001's `computeRenderDecision` /
  `derivePrimaryTrackChange` unchanged; reuses `parseVtt` unchanged.
- UI surfaces: same injected `#dual-subs-secondary-line` element from
  US-003; brief `.caption-window` opacity toggle during track-switch
  capture window (flicker mitigation).

### Milestone 0 — Spike / empirical validation (blocking, do first)

Depends on an unconfirmed assumption: that YouTube's own native
auto-translate request returns non-empty in practice (one ambiguous data
point earlier showed even a native request appearing empty in a specific
test setup — needs to be resolved as environment hygiene, not proof the
approach is dead).

By hand, real non-automated Chrome profile, video with known manual
(non-ASR) captions:

1. DevTools Network tab, filter `timedtext`, check Initiator — confirm
   **fetch vs XHR** (determines what to monkey-patch in Milestone 1; don't
   build both speculatively).
2. Click CC → gear/settings → Subtitles/CC → Auto-translate → pick a
   language. Confirm: request fires, has `tlang=`, and — critically —
   **response body is non-empty**. Record exact query-param shape
   (`tlang`, `lang`, `v`, `fmt`, any `pot`/`potc`).
3. Note real DOM structure for the CC gear menu for Milestone 2.
4. Time how long after selecting the language the response arrives (sets
   timeout/flicker window in Milestone 3).

**Decision gate:** if the response is empty even for this genuine native
request in a clean profile, stop — record the finding in this story
(`status: changed` with evidence) and in
`docs/research/pototoken-timedtext.md`, and escalate to the user for a
scope decision before continuing.

### Milestone 1 — MAIN-world interception (`extension/content/player-bridge.js`)

- Install a `window.fetch` (and/or `XMLHttpRequest`, per Milestone 0)
  monkey-patch at the very top of the IIFE, before `publish()`/
  `setInterval` — file already runs at `document_start` in `world: "MAIN"`.
- Match requests: `/api/timedtext` pathname **and** a `tlang` query param
  present.
- `response.clone().text()` before publishing — must not consume the body
  YouTube's own player needs.
- Hand captured VTT text to ISOLATED world via
  `document.dispatchEvent(new CustomEvent("dual-subs-secondary-vtt",
  { detail: { tlang, sourceLanguageCode, vttText, capturedAt } }))` —
  additive to the existing DOM-attribute polling bridge, which doesn't
  scale to large VTT text.
- Add a companion ISOLATED→MAIN command channel: listen for
  `dual-subs-set-active-track` custom events and call
  `player.setOption("captions", "track", { languageCode })` on
  `#movie_player`.

### Milestone 2 — CC menu automation (`extension/content/player.js`)

- `selectAutoTranslateLanguage(languageCode)` — open the gear menu, find
  "Subtitles/CC" by text match, descend to "Auto-translate", find the
  target language by display name (reuse `extension/lib/languages.js`'s
  `SECONDARY_LANGUAGES`), click it, close the menu.
- `requestActiveTrackSwitch(languageCode)` — dispatches
  `dual-subs-set-active-track` to restore the primary track.
- Every selector/text-match assumption gets an inline comment ("verified
  against live youtube.com on <date>, may break").

### Milestone 3 — Trigger-then-restore orchestration (`extension/content/index.js`)

Replace `fetchSecondaryCues()`'s body (same signature,
`settleSecondaryCues()` untouched):

1. Capture current active track.
2. Hide `.caption-window` (`opacity: 0`) for the duration of the swap.
3. Start a one-shot listener for `dual-subs-secondary-vtt` matching this
   `tlang`, with a timeout from the Milestone 0 timing spike + margin.
4. Call `selectAutoTranslateLanguage(secondaryLanguage)`.
5. Await the capture (or timeout → `[]`).
6. Call `requestActiveTrackSwitch(primaryLanguageCode)`, unhide.
7. `parseVtt(vttText)` (unchanged) → return `Cue[]`.

### Milestone 4 — Cleanup

- Remove the old raw-`fetch`-to-`activeTrackBaseUrl` code.
- Grep for other consumers of `getActiveTrackBaseUrl()` /
  `findActiveTrackBaseUrl()` before deleting them.
- Update `docs/research/pototoken-timedtext.md` with the outcome.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-006 --unit 0 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable — no domain-layer changes (`subtitle-engine.ts`/`parseVtt` unchanged) |
| Integration | Not applicable |
| E2E | Manual/automated via `scripts/test-real-browser.mjs` against a video with real manual captions: secondary line shows actual translated text; manual track switch still re-triggers; graceful fallback on no-captions video |
| Platform | Not applicable |
| Release | |

## Harness Delta

None anticipated; reuses US-003's E2E validation pattern
(`scripts/test-real-browser.mjs`, built during diagnosis of this issue).

## Evidence

Add commands, reports, screenshots, or links after validation exists.
