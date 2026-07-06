# Sigil Tactics — Asset Files

The game's `index.html` references images at specific paths. Drop your PNGs in
the layout below and the game picks them up on reload. Missing files fall back
gracefully — units render the emoji symbol, the title renders text.

## Required filenames

### `heroes/` — one painting per hero class (square, ~1024×1024)
The filename must match the class key in `CLASSES` exactly:

- `heroes/knight.png`
- `heroes/ranger.png`
- `heroes/mage.png`
- `heroes/berserker.png`
- `heroes/paladin.png`
- `heroes/assassin.png`
- `heroes/warlock.png`
- `heroes/druid.png`
- `heroes/scout.png`
- `heroes/sentinel.png`
- `heroes/necromancer.png`
- `heroes/crusader.png`

The board unit crops to the upper portion of the painting (head + shoulders).
CSS uses `object-position: 50% 18%` to focus on the face area, which also
clips the Gemini watermark from the bottom-right corner.

### `ui/` — shared UI assets

- `ui/wordmark.png` — "SIGIL TACTICS" logo for the title screen (~1024×512)
- `ui/logo-mark.png` — the round sigil disc (used as favicon, will become card-back centerpiece)
- `ui/card-frame.png` — TCG-style frame, art window + name banner + text panel (~1024×1536)
- `ui/card-back.png` — reverse side of every card, central sigil (~1024×1536)

The card frame and card back aren't wired into the rendering yet — they'll be
used when the hand cards get rebuilt into vertical TCG-style layouts. Save
them now so the files are in place.
