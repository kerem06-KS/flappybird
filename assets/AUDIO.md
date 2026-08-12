# Audio assets

## Where each sound is used

| File | Plays when | Volume |
|---|---|---|
| `sounds/flap_sound.mp3` | Every flap (tap, click, spacebar) | 0.60 |
| `sounds/score_sound.mp3` | Passing a pipe | 0.60 |
| `sounds/collision.mp3` | Bird hits a pipe or the ground | 0.70 |
| `sounds/game_over.mp3` | 260ms after the collision, as the run ends | 0.55 |
| `sounds/score_card.mp3` | Game-over score card appears | 0.50 |
| `sounds/ui_click.mp3` | Any button or settings control | 0.45 |
| `music/music_home.mp3` | Loops on the home screen | 0.35 |
| `music/music_day.mp3` | Loops during play, day theme | 0.35 |
| `music/music_night.mp3` | Loops during play, night theme | 0.35 |

All Howl definitions live in one block in `script.js` under the `AUDIO` header.

## Provenance of the current files

`flap_sound.mp3` and `score_sound.mp3` predate this work.

The other seven were **generated locally with ffmpeg**, not downloaded. The
agent that added them could reach audio files over the network but its fetch
tool returns only a `[binary data]` marker rather than the bytes, so no file
could actually be saved to disk.

They are real, tuned audio rather than placeholders, and because they were
synthesised from scratch they carry no licence obligations at all — no
attribution, no restrictions, commercial use fine.

Regenerate or tweak them with:

```bash
python3 tools/generate_sfx.py     # writes the four effects
python3 tools/generate_music.py   # writes the three music loops
```

Both scripts need `numpy` and `ffmpeg` with `libmp3lame`.

## Swapping in downloaded audio

Nothing in the code needs changing. Download a file, rename it to the filename
in the table above, and drop it in the matching folder. Adjust the `volume`
value in the `SFX` / `MUSIC` maps in `script.js` if the new file sits louder or
quieter than the current one.

Both sources below are royalty-free with **no attribution required**, for
commercial and personal use.

### Pixabay — https://pixabay.com/sound-effects/

Requires a free account to download. Licence:
https://pixabay.com/service/license-summary/

- Collision — search [`impact`](https://pixabay.com/sound-effects/search/impact/)
  or [`thud`](https://pixabay.com/sound-effects/search/thud/). Want a short, dry
  hit under about 0.5s.
- Game over — [`game over`](https://pixabay.com/sound-effects/search/game%20over/).
  [Game Over Arcade](https://pixabay.com/sound-effects/film-special-effects-game-over-arcade-6435/)
  is a good short arcade-style option;
  [Game Over](https://pixabay.com/sound-effects/musical-game-over-417465/) is a
  longer musical sting.
- Score card — [`whoosh`](https://pixabay.com/sound-effects/search/whoosh/) or
  [`pop`](https://pixabay.com/sound-effects/search/pop/). Should finish inside
  about 0.6s or it will still be playing over the card.
- UI click — [`click`](https://pixabay.com/sound-effects/search/click/) or
  [`ui`](https://pixabay.com/sound-effects/search/ui/). Keep it under ~80ms so
  it can fire rapidly without overlapping.
- Music — [`game music loop`](https://pixabay.com/sound-effects/search/game%20music%20loop/),
  e.g. [Game Music Loop 6](https://pixabay.com/sound-effects/musical-game-music-loop-6-144641/)
  and [Game Music Loop 7](https://pixabay.com/sound-effects/musical-game-music-loop-7-145285/).
  Pick tracks that are already built to loop, or the seam will be audible.

### Mixkit — https://mixkit.co/free-sound-effects/

No account needed. Licence: https://mixkit.co/license/#sfxFree

- [Game sound effects](https://mixkit.co/free-sound-effects/game/)
- [Video game sound effects](https://mixkit.co/free-sound-effects/video-game/)
- [Game over sound effects](https://mixkit.co/free-sound-effects/game-over/)

### One thing to check on music

The three music files are looped by Howler, which loops the decoded buffer
including any encoder padding. If a downloaded track has silence at the start
or end, you will hear a gap each time it wraps. Trim it to a whole number of
bars before dropping it in. `tools/generate_music.py` shows the approach used
here: trim to the exact loop length and add the overhanging note tails back
onto the start.
