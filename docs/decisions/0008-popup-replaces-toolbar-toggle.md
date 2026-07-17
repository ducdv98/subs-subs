# 0008 Popup Replaces Toolbar Toggle

Date: 2026-07-17

## Status

Accepted

## Context

US-005 deliberately kept the toolbar icon as click-to-toggle (badge shows
on/off), explicitly ruling out a `default_popup` because it would change
click-to-toggle into click-to-open, contradicting US-002's original
acceptance criterion. Production-polish work now needs a UI surface to
change Secondary Language without opening a full-tab options page, and a
single icon click cannot both instant-toggle and open a panel.

## Decision

The toolbar icon click opens a popup (`default_popup`) containing the
Dual-Sub Mode toggle and the Secondary Language picker. The full-tab
`options.html` / `options_ui` page is retired — the popup becomes the
single settings surface. The badge remains as an ambient on/off status
indicator, now driven purely by `chrome.storage.onChanged` rather than a
click handler.

## Alternatives Considered

1. Keep click-to-toggle, add a separate entry point (context menu / options
   page link) for the language picker. Rejected: two places to manage one
   set of settings, worse discoverability for the picker.
2. Keep click-to-toggle, put the picker on the existing full-tab options
   page only. Rejected: doesn't satisfy the "click icon to configure"
   product ask, and a full-tab page is heavier than needed for a single
   dropdown + toggle.

## Consequences

Positive:

- One settings surface (popup) instead of two (options page + toggle
  click).
- Language picker gets a low-friction entry point.

Tradeoffs:

- Reverses US-005/US-002's explicit toggle-on-click behavior; toggling now
  takes one extra step (open popup, then click toggle).
- `options_ui` removal means any future "advanced settings" needing more
  space than a popup allows will need a new full-tab surface again.

## Follow-Up

- None anticipated.
