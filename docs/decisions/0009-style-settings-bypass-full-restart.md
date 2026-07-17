# 0009 Style Settings Bypass Full Session Restart

## Date

2026-07-17

## Status

Accepted

## Context

`content/index.js`'s `chrome.storage.onChanged` listener currently treats
any relevant key change as "settings changed, restart the session":
`init()` tears down the active session and calls `startSession()` again,
which re-drives YouTube's native CC auto-translate menu and re-fetches
Secondary Track cues (see US-006). That's correct for `dualSubMode` and
`secondaryLanguage` — both genuinely invalidate the current Secondary
Track fetch.

US-011 adds four new persisted settings (Secondary line color, size,
position, opacity) that only affect how the already-fetched Secondary
line is *rendered*, not what was fetched. If these went through the same
`init()` path, every slider drag in the popup would briefly re-drive the
CC menu and re-fetch cues — a visible flicker and wasted native-menu
automation on every micro-adjustment.

## Decision

Split `chrome.storage.onChanged` handling into two paths:

- `dualSubMode` / `secondaryLanguage` changes → full `init()` restart, as
  today.
- Style keys (color/size/position/opacity) → a lightweight handler that
  updates the live `secondaryLineEl`'s CSS in place. No session teardown,
  no CC menu automation, no cue re-fetch.

## Alternatives Considered

1. Route everything through `init()` unchanged. Rejected: needless
   flicker and native-menu re-drive on every style tweak.
2. Debounce `init()` calls for style keys. Rejected: still re-fetches and
   re-drives the menu once settled, just less often — doesn't remove the
   underlying waste, adds latency before a style change visibly applies.

## Consequences

Positive:

- Style changes apply instantly with no fetch/flicker cost.
- Keeps the two concerns (what to fetch vs. how to render it) cleanly
  separated in the storage-change handler.

Tradeoffs:

- Two code paths to maintain in the `storage.onChanged` listener instead
  of one; a future setting must be triaged into "needs restart" vs.
  "style-only" correctly or it'll silently take the wrong path.

## Follow-Up

- None anticipated.
