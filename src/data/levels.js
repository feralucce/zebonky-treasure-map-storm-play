// Level layouts as text grids, one character per 64 px tile.
//   #  ground        =  one-way platform (jump up through it)
//   T  quiz treasure (numbered left to right: 1st T is item 0, and so on)
//   G  goal flag     S  secret exit (only appears in levels with a secret)
//   P  player start  .  empty
// Rows shorter than the widest row are padded with empty space.

export const TILE = 64;

// One concept layout shared by every level for now. Give a level its own
// entry in LAYOUTS to override it.
export const SAMPLE_LAYOUT = [
    '',
    '.................................S',
    '................................===',
    '',
    '............................===',
    '.........................T',
    '........................===',
    '.......T....................................T',
    '......===............==....................===',
    '..P..............................................##.....G',
    '###############...#############..###########################',
    '###############...#############..###########################',
];

export const LAYOUTS = {};

export function layoutFor(levelId) {
  return LAYOUTS[levelId] || SAMPLE_LAYOUT;
}
