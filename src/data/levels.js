// Level layouts as text grids, one character per 64 px tile.
//   #  ground          s  sand            R  cliff rock
//   =  one-way platform (jump up through it)
//   ~  water (swim: Up/Jump to stroke, near the surface it hops you out)
//   W  upward current (the Dorsal Cove waterfall that flows uphill)
//   F  dorsal-fin rock (scenery)
//   T  quiz treasure (numbered left to right: 1st T is item 0, and so on)
//   G  goal flag       S  secret exit (only appears in levels with a secret)
//   P  player start    .  empty
// Rows shorter than the widest row are padded with empty space.
// `signs` are little wooden hints: { col, row, text }.

export const TILE = 64;

// The concept layout every level uses until it gets its own entry below.
export const SAMPLE_LAYOUT = {
  rows: [
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
  ],
};

export const LAYOUTS = {
  // Dorsal Cove: a hidden beach ringed by cliffs. Its waterfall flows UP,
  // so jump into the current to ride it to the clifftop (Shaan's hydro-rise),
  // then cannonball off the far side into the second pool.
  dorsal: {
    rows: [
      '',
      '',
      '',
      '.........................WW.F......T',
      '.........................WWRRRRRRRRRRRRRR',
      '.........................WWRRRRRRRRRRRRRR',
      '.........................WWRRRRRRRRRRRRRR',
      '.......T.................WWRRRRRRRRRRRRRR',
      '......===................WWRRRRRRRRRRRRRR',
      '..P......................WWRRRRRRRRRRRRRR.........................G',
      'sssssssssssss~~~~~~~~~~~~WWRRRRRRRRRRRRRR~~~~~~~~~~sssssssssssssssssss',
      'sssssssssssss~~~~~~~~~~~~WWRRRRRRRRRRRRRR~~~~~~~~~~sssssssssssssssssss',
      'sssssssssssss~~~~~~T~~~~~WWRRRRRRRRRRRRRR~~~~~~~~~~sssssssssssssssssss',
      'sssssssssssssssssssssssssssRRRRRRRRRRRRRRsssssssssssssssssssssssssssss',
    ],
    signs: [
      { col: 21, row: 9, text: 'Swim into the\nwaterfall!' },
      { col: 39, row: 3, text: 'Cannonball!' },
    ],
  },
};

export function layoutFor(levelId) {
  return LAYOUTS[levelId] || SAMPLE_LAYOUT;
}
