# subs-subs

Chrome extension that displays two subtitle tracks at once on YouTube videos, for language learning.

## Language

**Primary Track**:
The subtitle track YouTube's own player currently has active for a video — whatever language that happens to be (manual caption or ASR). Not a user-chosen language; it's a live-tracked slot that always mirrors YouTube's own active caption selection, including when the user manually switches tracks mid-video via YouTube's CC menu.
_Avoid_: primary language, native language, default language

**Secondary Track**:
A subtitle track translated (via YouTube auto-translate) from the Primary Track into the user's chosen learning language. This is the only language the user actually configures.
_Avoid_: secondary language, translated language, target language (when referring to the track itself rather than the setting)

**Secondary Language**:
The user's single global setting: which language the Secondary Track is translated into. Configured once in the extension popup, applies to all videos.
_Avoid_: primary language setting (no such setting exists)

**Dual-Sub Mode**:
The extension's on/off state, toggled via the browser toolbar icon, persisted globally across videos. When on, both Primary and Secondary Tracks render together and native YouTube CC is force-enabled.
_Avoid_: dual mode, extension state
