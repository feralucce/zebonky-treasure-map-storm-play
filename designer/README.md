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
4. Save the SVG and drop it on the designer. It starts playing straight away
   on the page, shows what the game read and lists anything that looks wrong,
   including a mystery crate a player could miss for good (get past it,
   still finish, and have no way back up to it; hidden doors don't count).
5. Click the game to test it (R restarts, **Full screen** for a bigger view;
   your real save is untouched). It starts in **Blocks (no dressing)**: the
   layout as flat legend-coloured blocks with no backdrop, foreground or
   plants, and the real explorer, Zebonkies, crates and pickups. Pick an art
   set to see it dressed; changing it restarts the game. A secret exit only
   appears when "Save as level" is a level that has one (Bamboo Dunes or
   Magenta).
6. **Save into the game** and pick the level it belongs to. It's written to
   `assets/levels/<level>.json` and replaces that level's layout on the map.
   (Away from the dev server this downloads the file instead; drop it in
   `assets/levels/` and add its name to `assets/levels/index.json`.)

## Guides for the artist

Under the preview, **Guides for the artist** saves full-size sheets made from
the dropped level, as an SVG (an empty **Art** layer under a locked **Guide**
layer) or a PNG. Hide the guide before saving the art. Every guide is
**2x game size** (a 64 px tile is a 128 px box), so the art can be scaled
down cleanly; the sizes below are game sizes.

- **Background guide**, three ways:
  - **Whole level, 1:1**: the entire level at full size, with the ground, air
    ground, platforms and water shown see-through and screen-width marks.
    The finished picture is locked to the level (an art set layer with
    `"whole": true`) and never repeats.
  - **Perfect tiling**: the level's full height, two screens wide (2368 px).
    It repeats edge to edge, so the two gold edge strips must match.
  - **Reverse tiling**: the same size, but every other copy is flipped left
    to right (`mirror_repeat`), so the edges join by themselves.
  Both tiling guides mark the level's main floor, one screen's size and the
  tile rows. They scroll at 0.3 of the player's speed. A tiling picture as
  tall as the level scrolls with it up and down instead of being squashed to
  the screen.
- **Foreground guide** (the fourth background choice): one screen tall, two
  wide, for leaves along the bottom and branches along the top, with the
  play area, the HUD and the phone buttons marked. Paint it sharp: the game
  blurs it, slides it past faster than the level and pins it to the screen.
  It goes in an art set's `foreground` list (`file`, `scroll` 1.6, `blur` 6
  screen pixels, `mirror_repeat`, optional `alpha`). The jungle sets carry a
  placeholder from `tools/make_foreground.py` until the real art arrives.
- **Tile and dressing sheet**: a labelled box for every picture an art set
  needs, at game size: ground (and sand or rock if the level uses them),
  air ground (floating ledges, a 2 x 2 block per shape), platforms and
  dressing (ground plants, hangers, scatter, platform toppers). Each box
  says how often this level uses it; dashed boxes aren't used yet. The
  box positions are stored in the SVG's `<metadata>`, ready for cutting a
  painted sheet back into an art set.

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
  | `#0050FF` | Water: you float up to the surface; Jump hops out, Down dives |
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
  | `#80C0FF` circle | Arrow sign pointing left (stands on the ground below it) |
  | `#00FF00` circle | Arrow sign pointing right |
  | `#0000A0` circle | Arrow sign pointing up |
  | `#A0A000` circle | Arrow sign pointing up and left |
  | `#80FFC0` circle | Arrow sign pointing up and right |

- **Zebonkies.** A wild Zebonky wanders near where it's drawn and charges
  when the player gets close; a bump costs one Z-bolt. Jump over it and it
  carries on the way it was going, leaping gaps; land on it and it's dazed
  for a moment while the player bounces on. Or toss food (X or F, or the
  banana button): once it has eaten it stays friendly and follows the
  player. Thrown food can't be picked back up.
- **Pickups and crates.** Stand at one and press Down to take it or open it.
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
- `canopy`: treetop tiles. Ground that isn't joined to the bottom of the
  level (a floating island, a high ledge) is drawn as treetops instead of
  dirt; it's still solid ground. Keyed by which sides are open (top,
  bottom, left, right as 1s and 0s), four files each for a 2 x 2 grid so
  neighbouring leaves join without a seam.
- `sky`: the colour behind everything.
- `food`: the food picture for the region (bananas in the rainforest).
- `zebonky`: the region's Zebonky as strips of frames (`idle`, `walk`, `run`,
  `jump`), all the same frame size, art facing left. The guide uses the same
  art at a larger size.

`rainforest` is Charlie's region, built from the tileset guide
(`reference/rainforest_tileset_guide.jpg`): the backdrop column (with the
extra ground strips between its repeats taken out), grass-over-dirt tops,
edge caps, dirt under the grass, stone deeper down (`deep`, from
`deep_from` tiles below the surface) and for cliff rock, fern patches on
platforms (`platform_decor`), and the sheet's small bushes and ferns dotted
on open grass (`scatter`). Bananas and Charlie come from the reference kit.
`tools/cut_rainforest_tiles.py` cuts the tiles from the guide at any
resolution, so a sharper copy of the same sheet is one command away. Replace its files one
for one (same names) and every drawn level picks up the new art.
