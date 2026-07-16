# Research: PoToken enforcement on `/api/timedtext`, and alternatives

**Date:** 2026-07-16
**Status:** confirmed cause, recommendation below

## TL;DR

- **(a) Is PoToken confirmed as the cause? Yes.** yt-dlp's own maintainer-curated wiki explicitly lists `web` client requests to the subtitles endpoint as requiring a PO Token (token type "Subs"), and a yt-dlp issue reproduces our exact symptom (HTTP 200, empty body) when the `pot=`/`potc=` params are stripped from a `timedtext` request. This is not IP/region/account/header noise — it's a documented, intentional enforcement rollout. See [Sources](#sources) #1, #2.
- **(b) Is client-side generation feasible for us? Not really, not cheaply.** PO tokens are produced by running Google's real, obfuscated "BotGuard" VM (the same one youtube.com's own page already loads) and are per-video/per-session bound. Reverse-engineering that VM's invocation ourselves is exactly the multi-hundred-line reverse-engineering effort that projects like `bgutils-js`/`bgutil-ytdlp-pot-provider` had to build and continually maintain against YouTube breaking it. It is *theoretically* runnable inside a real browser tab (bgutils-js works in both Node+jsdom and a real browser DOM), but there is no supported/public API for a third-party content script to just ask the page's already-running BotGuard instance for a token — we'd have to re-implement the same challenge-fetch-and-execute dance ourselves, essentially becoming an unofficial PO-token provider. High effort, high maintenance burden, and arguably adversarial (against the spirit of the enforcement) even though we're not scraping at scale.
- **(c) Recommended next step: skip PoToken entirely — scrape the live DOM instead.** Since the content script runs inside the user's real tab with the video already playing, the *simplest* fix is to stop calling `/api/timedtext` for the primary track and instead read YouTube's own already-rendered caption cues from the DOM (`.ytp-caption-segment` spans inside `.caption-window`, updated via mutation) — this is exactly what several existing "dual captions" browser extensions already do in production. This sidesteps PoToken completely for the primary track. This still leaves the **translated/secondary track** unresolved via network fetch, since PoToken enforcement applies there too — see the "translated track" section below for the two remaining options.

---

## 1. Confirmation: is `/api/timedtext` PoToken-gated?

yt-dlp's PO Token Guide wiki maintains an explicit enforcement table of which clients need PO tokens for which request types (GVS = video/audio streaming, Player = format URL fetch, Subs = subtitles/timedtext). It states:

> - `web`: requires PO tokens for **Subs, GVS** (web client provides only SABR formats)
> - `mweb`: GVS only
> - `android` / `ios`: GVS or Player
> - `web_embedded`, `android_vr`: none required

Source: [yt-dlp PO Token Guide wiki](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)

This is corroborated by a concrete bug report, [yt-dlp/yt-dlp#13075 — "Some subtitles require POT now?"](https://github.com/yt-dlp/yt-dlp/issues/13075), where a user diffed a working browser-captured `timedtext` request against yt-dlp's own (failing) request and found the working one carried `pot=<token>`, `potc=1`, and `c=WEB` parameters that yt-dlp's request lacked; without them the response is empty. Multiple linked/related issues describe the exact same 200-OK-empty-body symptom for subtitles specifically: [#13443 "Empty subtitles result in 'Did not get any data blocks'"](https://github.com/yt-dlp/yt-dlp/issues/13443), [#14289 (YouTube Shorts subtitles)](https://github.com/yt-dlp/yt-dlp/issues/14289).

This matches our empirical findings exactly: HTTP 200, zero-byte body, reproducible for both primary and `tlang=` translated tracks, independent of automation (Playwright vs. real Chrome) — because the missing ingredient is a per-request `pot` param, not anything about the browser/automation fingerprint.

We also captured that YouTube's **own** native CC-button-triggered request returned empty in our test environment. That's consistent with PoToken theory too: the `web` client relies on **BotGuard-generated** tokens computed asynchronously in the page, and if that computation fails/lags/is blocked (e.g. by a Playwright-flavored environment, extension interference, a stale/expired token, or simply a race before BotGuard finishes attesting), even YouTube's own request goes out without a valid token and gets the same empty response. This doesn't contradict the PoToken explanation — a real logged-in user in a completely vanilla Chrome profile, with no devtools/automation and no interfering extensions, most likely gets a valid `pot` param on the native request. This is worth a targeted re-test (see "Open items" below) but isn't required to accept the general conclusion.

**Conclusion: PoToken enforcement on `/api/timedtext` (Subs token, `web` client) is the confirmed root cause**, not a header/order/IP/region quirk.

## 2. How is a PO token generated, and can we do it client-side?

A PO token is produced by **BotGuard** (web), an obfuscated JS attestation VM Google serves as part of the page. The process, as reverse-engineered by [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils):

1. Fetch challenge data (VM script + bytecode program) — from the embedded page source, the InnerTube API, or Google's Web Anti-Abuse private API.
2. Load/execute the actual BotGuard interpreter script (via `new Function()` or injecting a `<script>` tag) and run it to get an "integrity token" (`asyncSnapshotFunction` is the interesting exported function).
3. Mint a "WebPO" token from that integrity token plus a **content binding** (visitor ID, data-sync ID, or video ID — tokens for web GVS/Player/Subs are typically video-ID-bound).

Source: [LuanRT/BgUtils README](https://github.com/LuanRT/BgUtils), [yt-dlp PO Token Guide wiki](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide).

Key point for us: BgUtils confirms this **can** run inside a real browser DOM (not just Node+jsdom) — it's genuinely just JS execution of Google's real script. But:

- There is **no documented, stable, public API** on `ytcfg`/`window.ytInitialData`/etc. that hands a content script a ready-made token on request. The token has to be actively minted by re-running the same challenge-fetch-and-execute flow BgUtils implements.
- The whole reason dedicated projects (`bgutil-ytdlp-pot-provider`, using `bgutils-js` + `youtubei.js`, packaged as a Node/Docker HTTP server: [Brainicism/bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)) exist is that this reverse-engineered flow is nontrivial and breaks periodically when Google changes the BotGuard bytecode/challenge format — it's an ongoing arms race, not a one-time integration.
- A second, notably relevant alternative approach — [coletdjnz/yt-dlp-getpot-wpc](https://github.com/coletdjnz/yt-dlp-getpot-wpc) — sidesteps reimplementing BotGuard entirely by **launching an actual browser and letting the real youtube.com page mint the token itself**, then extracting it. This is architecturally close to "let the real page do the work," but it's built for a standalone yt-dlp process spawning a browser, not for a content script that's already living inside that page.

**Conclusion (b):** technically running BotGuard client-side is possible (it's just page JS), but there's no shortcut — we'd be re-implementing and maintaining the same reverse-engineered attestation flow as `bgutils-js`, with the same fragility. Not a good fit for a small extension team to own long-term.

## 3. How current tools handle it (as of mid-2026)

- **yt-dlp**: ships a plugin framework, [coletdjnz/yt-dlp-get-pot](https://github.com/coletdjnz/yt-dlp-get-pot), and recommends installing a PO Token Provider plugin (`bgutil-ytdlp-pot-provider` is the flagship one, requiring a companion Node/Deno process or Docker container). There's no in-tree, dependency-free solution — it's explicitly offloaded to external infra. Source: [PO Token Guide wiki](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide).
- **youtube-transcript-api** (`jdepoix/youtube-transcript-api`): added a dedicated `PoTokenRequired` exception specifically so callers get fast, explicit feedback when a `timedtext` URL needs a token it can't supply — i.e., the maintainers have **not** solved this in-library, they've just made the failure legible. Source: [jdepoix/youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api).
- No evidence found of a lightweight, dependency-free client-side fix for either tool; both roads lead back to "run a real/BotGuard-capable browser and extract a token from it" as the only two known reliable mechanisms.

## 4. Alternative: avoid the raw fetch entirely (this is the one we should take)

We're not a headless scraper — we're a content script inside a tab where the video is already playing and the user's own browser is already trusted by YouTube. Two concrete options were evaluated:

### Option A — DOM-scrape the native caption renderer (recommended, primary track)

YouTube's native CC renders live cue text into `<span class="ytp-caption-segment">` elements inside `.caption-window` containers in the player DOM. Multiple existing, apparently-functioning open-source "dual subtitle" extensions already build on exactly this instead of calling `timedtext` directly, e.g. [mikesteele/dual-captions](https://github.com/mikesteele/dual-captions) ("does not use any internal APIs on the host site... works by intercepting caption file requests, parsing them, and rendering them onto the page" combined with DOM adapters), [Raikenn/dual-subtitles-chrome-extension](https://github.com/Raikenn/dual-subtitles-chrome-extension) ("Extracts YouTube's native captions in real-time... displays both the original and translated subtitles"), and [garywill/multi-subs-yt](https://github.com/garywill/multi-subs-yt) (explicitly "NO dependence on third-party server").

This gets us the **primary track** for free, with no PoToken dependency at all: turn on native CC (can be done programmatically via the player API/CC button), observe `.ytp-caption-segment` mutations with a `MutationObserver`, done. This is a much smaller, more robust surface than reverse-engineering BotGuard, and it's what the video is already rendering for the user regardless of any network-layer lockdown.

*Caveat:* selector/class names (`ytp-caption-segment`, `caption-window`) are undocumented YouTube internals and could change without notice — same fragility class as any DOM scraping, but far shallower than BotGuard reverse-engineering, and it's the approach multiple maintained community extensions already bet on.

### Option B — drive the real CC "Auto-translate" menu, then read back via DOM

For the **secondary/translated track**, the equivalent move is: don't fetch `timedtext?tlang=xx` ourselves — instead programmatically operate YouTube's own CC menu (click CC → Auto-translate → pick language), the same UI path a human uses, and let YouTube's own player pipeline (which does have a working, page-native BotGuard/token flow when things are healthy) perform the fetch and render the translated cues into the DOM. Then apply the same DOM-scraping technique from Option A to read them back out.

This has not been separately verified working in our test environment (our note above about YouTube's own native request itself coming back empty in the test setup applies here too), but it is architecturally the more promising "we're not a scraper, we're a real tab" move, and is worth prototyping directly since it requires no new library dependency — just player/menu automation we likely already need for other extension features.

## Recommendation

1. Switch the primary-track path to DOM-scraping (`.ytp-caption-segment` + `MutationObserver`) immediately — it fully removes our dependency on `/api/timedtext` for the common case and has precedent in shipped extensions.
2. For the translated/secondary track, prototype Option B (drive the CC "Auto-translate" submenu programmatically, scrape the result from the DOM) before considering any BotGuard/PoToken reimplementation. Re-test specifically in a clean, non-automated, non-devtools-open real Chrome profile to rule out our test harness being the reason even YouTube's own native request came back empty.
3. Do **not** invest in a client-side BotGuard/PoToken implementation — treat it as a last resort, since it means owning an ongoing reverse-engineering arms race that dedicated OSS projects with much larger scope (`bgutils-js`, `bgutil-ytdlp-pot-provider`) already struggle to keep current.

## Update 2026-07-16: Option B implemented, re-tested — still empty in Playwright

Implemented Option B in full (US-006: `content/player-bridge.js` MAIN-world
`fetch`/`XMLHttpRequest` monkey-patch keyed on `/api/timedtext` + `tlang`,
`content/player.js` CC-gear-menu automation, `content/index.js`
trigger-then-restore orchestration). Ran it against a real video
(`UF8uR6Z6KLc`, known manual English captions) via
`scripts/test-real-browser.mjs` (Playwright, persistent Chrome profile,
extension loaded unpacked, real network).

Findings:

- The menu automation works end-to-end: clicking CC gear → Subtitles/CC →
  Auto-translate → Vietnamese genuinely drives YouTube's own player, which
  issues its own `timedtext` **XHR** (not `fetch` — confirms Milestone 0's
  "check Initiator" question empirically: it's XHR) with `tlang=vi`, a
  `pot=`/`potc=1` pair, and `fmt=json3` (YouTube's internal caption format —
  not `vtt`; the earlier code's `&fmt=vtt` assumption was specific to the
  *hand-constructed* URL approach we're now abandoning).
- That request still comes back **HTTP 200 with a zero-length body**, even
  though it's a genuine first-party request carrying a `pot` param, exactly
  reproducing the one ambiguous data point Milestone 0 flagged as needing
  resolution.
- Critically, this test ran **inside Playwright automation** (a persistent
  but automated Chrome context), not the "real, non-automated Chrome
  profile" Milestone 0's spike calls for. Per the "Open items" note added
  earlier in this doc, BotGuard's attestation can plausibly fail/degrade
  specifically in automated/headless-flavored environments even when a `pot`
  param is present on the wire — so this result does **not** cleanly
  resolve the Milestone 0 decision gate one way or the other. It's
  consistent with either "PoToken enforcement genuinely blocks even native
  requests in this class of environment" or "our test harness is still the
  confound," and we don't have the manual, non-automated test needed to
  distinguish them.
- Separately (and independent of the above): fixed a real latent bug found
  during this test — the response format is `json3`, and the old code path
  only knew how to parse `vtt`. Added `content/vtt.js`'s `parseJson3`, tried
  before falling back to `parseVtt`, so a non-empty capture will parse
  correctly whenever this does start returning data.

**This reproduces Milestone 0's decision gate** ("if the response is empty
even for this genuine native request in a clean profile, stop... escalate
to the user for a scope decision"), except our only available test
environment is the automated one the gate explicitly distrusts. Escalating
to the user rather than declaring Option B dead on inconclusive evidence.

## Open items / follow-ups

- Re-run the native-CC-button network capture in a genuinely clean, non-automated, non-devtools Chrome profile (no Playwright, no extensions besides ours) to confirm whether YouTube's own request succeeds there — this affects how much we should trust Option B.
- Prototype Option B's feasibility (can we reliably drive the CC/auto-translate menu via simulated clicks or the underlying player API, and does it reliably populate `.ytp-caption-segment` with translated text) before committing engineering time.

## Sources

1. [yt-dlp PO Token Guide (wiki)](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide) — client/PO-token-type enforcement table (`web`: Subs + GVS), BotGuard generation description, PO Token Provider plugin ecosystem.
2. [yt-dlp/yt-dlp#13075 — "Some subtitles require POT now?"](https://github.com/yt-dlp/yt-dlp/issues/13075) — reproduces empty-body-on-timedtext when `pot`/`potc`/`c=WEB` are missing.
3. [yt-dlp/yt-dlp#13443 — empty subtitles / "Did not get any data blocks"](https://github.com/yt-dlp/yt-dlp/issues/13443)
4. [yt-dlp/yt-dlp#14289 — YouTube Shorts subtitle download failure](https://github.com/yt-dlp/yt-dlp/issues/14289)
5. [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils) — BotGuard attestation / PO token minting mechanics, browser-vs-Node execution.
6. [Brainicism/bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) — production PO token provider architecture (Node/Deno HTTP server, `bgutils-js` + `youtubei.js`).
7. [coletdjnz/yt-dlp-get-pot](https://github.com/coletdjnz/yt-dlp-get-pot) — plugin framework for external PO token providers.
8. [coletdjnz/yt-dlp-getpot-wpc](https://github.com/coletdjnz/yt-dlp-getpot-wpc) — mints tokens by launching a real browser against youtube.com rather than reimplementing BotGuard.
9. [jdepoix/youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) — `PoTokenRequired` exception, no in-library fix, points users to external providers.
10. [mikesteele/dual-captions](https://github.com/mikesteele/dual-captions), [Raikenn/dual-subtitles-chrome-extension](https://github.com/Raikenn/dual-subtitles-chrome-extension), [garywill/multi-subs-yt](https://github.com/garywill/multi-subs-yt) — existing extensions using DOM-based caption capture instead of raw `timedtext` fetches.
