# Dual Subtitles for YouTube

Chrome extension for language learning that shows YouTube's native captions and a second translated subtitle line at the same time.

The primary track always mirrors whatever YouTube is currently showing. The secondary track is user-configurable and is stacked below the native captions inside the player.

## What It Does

- Displays two subtitle tracks simultaneously on YouTube videos.
- Uses YouTube's own caption flow for the secondary language.
- Keeps the primary track aligned with the active YouTube caption selection.
- Lets the user choose the secondary language in the extension options UI.
- Targets Chrome Manifest V3.

## Project Layout

- `app/domain/` - shared domain logic for settings and subtitle rendering.
- `extension/` - Chrome extension manifest, background script, content scripts, and options page.
- `tests/` - Vitest coverage for the domain logic.
- `docs/product/overview.md` - product decisions and current MVP behavior.
- `docs/stories/backlog.md` - story backlog and epics.
- `docs/TEST_MATRIX.md` - behavior-to-proof guidance.

## Local Development

Install dependencies:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Run type checking:

```bash
npm run typecheck
```

Build the extension artifacts:

```bash
npm run build:extension
```

To load the extension in Chrome, use the `extension/` folder as an unpacked extension after building.

## Current MVP

- Secondary subtitles are based on YouTube's caption data and auto-translate flow.
- The secondary language is selected globally in the extension options page.
- If the primary and secondary languages match, the secondary line is suppressed.
- If captions are unavailable, the extension fails silently.

## Documentation

If you want the product intent first, read `docs/product/overview.md`.
If you want the current work queue, read `docs/stories/backlog.md`.
