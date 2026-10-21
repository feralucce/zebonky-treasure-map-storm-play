# Treasure Map Storm (Zebonky) - prototype

A side-scrolling platformer for zebonky.com. The Zebonkia map works like the
Super Mario World overworld: walk between level dots, play a level, and new
paths draw themselves in. Treasures inside levels trigger quiz cards; a wrong
answer means the treasure slips away until the level is played again. A level
gets a check mark on the map once all its quiz treasures are collected.

## Run it

```
node server.js
```

Then open http://localhost:5214. No install step: Phaser 4.2.1 is in `vendor/`.

Demo: `index.html?demo=cumulus` opens straight into the Cumulus Rainforest
level drawn in the designer (`assets/levels/cumulus.json`). Online:
https://feralucce.github.io/zebonky-treasure-map-storm-play/?demo=cumulus

Second demo: `index.html?demo=cumulus-jungle` is the same drawing in the
flat-vector Zebonky jungle look (`assets/artsets/rainforest_jungle`: the
Cumulus Rainforest backdrop from zebonky.com, vector ground, ledges and
planks, trunks, vines and Zebonky's plants). Rebuild its art with
`tools/make_jungle_dressing.py`, `tools/make_vector_tiles.py` and
`tools/make_jungle_artset.py`. Online:
https://feralucce.github.io/zebonky-treasure-map-storm-play/?demo=cumulus-jungle

## Controls

- Map: arrow keys or WASD to walk, Enter or Space to play. Or tap a dot to walk
  there, and tap the dot you're on to play.
- Level: arrows / A-D to run, Space / Z to jump (hold for higher). Up / W
  in a hidden door goes through it. Down picks things up and opens crates;
  Down + Jump drops through a platform. X or F (or the banana button) tosses
  food. On-screen buttons for touch. Esc or the Map button goes back to the
  map.
- Quiz: tap an answer, or press 1-4 / A-D. "Read to me" reads the question aloud.

## Where things live

- `src/data/world.js` - level dots (positions on the map art), names,
  treasures, and the paths between them (which exit opens which path).
- `src/data/questions.js` - quiz questions, one per treasure. First answer is
  the right one. Facts need a source check before launch.
- `src/levelApi.js` - the contract a real level uses: `startQuiz`,
  `finishLevel`, `leaveLevel`.
- `src/scenes/Platformer.js` - the side-scroller, using that contract.
- `src/data/levels.js` - level layouts as text grids (one character per tile).
- `designer/` - the level designer: draw a level in vector, drop it in, play
  it with the art set applied, save it into the game. See `designer/README.md`.
- `assets/artsets/` - art sets applied to drawn levels; `assets/levels/` -
  levels saved from the designer.
- `assets/svg/` - concept art: rounded-box player with legs, ground,
  platforms, quiz treasure, goal flag, secret door, touch buttons.
- `src/state.js` - progress, saved in the browser only (no accounts, nothing
  sent anywhere).

## To do

- Explorer picker on the main map screen: the player chooses their explorer
  there (boy and girl sheets are in the reference kit), and the choice is
  saved with their progress.
- More explorer looks: several skin tone and hair options.
- Several levels per biome. Today each map dot is one level and the designer
  saves one drawing per dot. Open question: more dots per region on the map,
  or one dot holding a run of stages.
- Final rainforest tiles (ground, sand, rock) to replace the stand-ins.

## Before launch

- Self-host the Nunito and Poppins fonts (they load from Google Fonts for now).
- Replace the placeholder explorer token with final art.
