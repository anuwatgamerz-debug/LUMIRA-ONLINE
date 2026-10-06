# LUMIRA audio files

Put real audio files here (see `docs/AUDIO_ASSET_LIST.md` for every id, its folder and what it should sound like),
then set `file:` on the matching entry in `public/audio-registry.js`. Until then the game plays generated placeholders.

- Music / ambient: MP3 or AAC (.m4a) first, optional OGG as `alt`. Loopable, -16 to -14 LUFS, 128-160 kbps.
- SFX: short MP3/OGG (mono is fine), trim silence, no large WAV files on mobile.
- Only CC0 / public domain / royalty-free assets that allow commercial game use. Never audio from Ragnarok or other games.
  Record source, creator and license in `docs/AUDIO_LICENSES.md`.
