# Level designer

Draw a level in any vector app, drop it on the designer, and play it with the
art set applied. Nothing to type.

## The loop

1. `node server.js`, then open http://localhost:5214/designer/
2. Click **Wide template** (`level-template.svg`, 64 x 12 tiles, a
   side-scrolling run), **Tall template** (`level-template-tall.svg`,
   30 x 40, a climb) or **Tall and wide template** (`level-template-big.svg`,
   64 x 40, both) and open it in
   Inkscape (or Illustrator, Affinity, Figma: any app that saves SVG).
3. Draw on the **Level** layer with the legend colours.
4. Save the SVG and drop it on the designer. It shows what the game read and
   lists anything that looks wrong.
5. **Play it** to test it right there (R restarts; your real save is untouched).
6. **Save into the game** and pick the level it belongs to. It's written to
   `assets/levels/<level>.json` and replaces that level's layout on the map.
   (Away from the dev server this downloads the file instead; drop it in
   `assets/levels/` and add its name to `assets/levels/index.json`.)

## Drawing rules

- One 64 px square is one tile. The page can be any size in 64 px steps:
  wide for a run, tall for a climb, or both. The camera follows either way.
- Any shape works: rectangles, polygons, curves. A shape fills a tile when it
  covers at least half of it. Platforms only need a strip across the tile.
- Colours (the legend is printed under the page in the template):

  | Colour | Means |
  |---|---|
  | `#000000` black | Ground: auto-tiled with grass on top |
  | `#D9B36C` | Sand |
  | `#808080` | Cliff rock |
  | `#8B4513` | Jump-through platform |
  | `#0050FF` | Water (swim) |
  | `#00E5FF` | Uphill waterfall current |
  | `#00B050` circle | Player start (drops to the ground below it) |
  | `#FFC000` circle | Mystery crate: draw 5, each asks one question |
  | `#FF0000` circle | Exit door (hidden until the guide reveals it) |
  | `#FF00FF` circle | Secret exit (only in levels that have one) |
  | `#9BFF00` circle | Food pickup (stays where drawn) |
  | `#FFFF80` circle | Z-bolt paw: gives back one energy (stays where drawn) |
  | `#FF6600` circle | Wild Zebonky |
  | `#8000FF` circle | Guide Zebonky (where it starts) |
  | `#006060` circle | Guide waiting point, with a number inside: 1, 2, 3... |
  | `#7030A0` 1 x 2 tile box | Hidden door, with a number written inside |

- **Zebonkies.** A wild Zebonky wanders near where it's drawn and charges
  when the player gets close; a bump costs one Z-bolt. Jump over it, or toss
  food (X or F, or the banana button): once it has eaten it stays friendly.
  The guide Zebonky is bigger and sparkles. It waits until the player is
  close, then bounds to the next waiting point. At the last one it reveals
  the exit door. Without a guide the exit is visible from the start.
- **Hidden doors.** The two doors with the same number are a pair: stand in
  one and press Up (or the gold button on touch screens) to come out of the
  other. They're invisible in the game; only a small arrow appears while
  you're standing in one. Doors without a number pair up left to right.
- **Jump guides.** The template's Jump guides layer shows real reach with the
  current physics: about 2.5 tiles up and 3.9 across at most. Safe rules of
  thumb: ledges 2 tiles high, gaps 3 tiles wide, or 2 up and 2 across. Drag
  them onto the page to check a jump; that layer is never read.
- Layers named Grid, Key, Guides, Reference or Notes (and anything marked
  `data-designer="ignore"`) are skipped, so use them for sketches and notes.

## Art sets

The art lives in `assets/artsets/<name>/`, described by `artset.json`:

- `sets.ground`: tiles by role: `top_left`, `top_mid`, `top_right`,
  `top_single`, `side_left`, `side_right`, `fill`. List several files for a
  role and the game picks between them per tile (always the same pick for the
  same spot). `sand` and `rock` sets work the same way; until they exist,
  those tiles use the concept boxes.
- `platform`: `left`, `mid`, `right`, `single` (64 x 28).
- `platform_decor`: pictures set on top of platforms now and then
  (`platform_decor_chance` of the tiles).
- `scatter`: small extras placed on open grass, `scatter_chance` of the time.
- `background`: layers with a `scroll` speed; `mirror_repeat` flips every
  other copy so a backdrop that isn't seamless still joins cleanly. A layer
  can be a `column` of three pictures: `top` (canopy), `mid` (a slice that
  repeats up and down, as many times as the level is tall) and `bottom`
  (ferns, then ground). `ground_line` is how far down the bottom picture the
  ground starts; that line sits on the level's floor.
- `sky`: the colour behind everything.
- `food`: the food picture for the region (bananas in the rainforest).
- `zebonky`: the region's Zebonky as strips of frames (`idle`, `walk`, `run`,
  `jump`), all the same frame size, art facing left. The guide uses the same
  art at a larger size.

`rainforest` is Charlie's region, built from the tileset guide
(`reference/rainforest_tileset_guide.jpg`): the backdrop column (with the
extra ground strips between its repeats taken out), grass-over-dirt tops,
edge caps, dirt under the grass, stone deeper down (`deep`, from
`deep_from` tiles below the surface) and for cliff rock, and fern patches on
platforms (`platform_decor`). Bananas and Charlie come from the reference kit.
`tools/cut_rainforest_tiles.py` cuts the tiles from the guide at any
resolution, so a sharper copy of the same sheet is one command away. Replace its files one
for one (same names) and every drawn level picks up the new art.
