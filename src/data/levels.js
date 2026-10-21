// Level layouts as text grids, one character per 64 px tile.
//   #  ground          s  sand            R  cliff rock
//   =  one-way platform (jump up through it)
//   ~  water (you float up to the surface; Jump strokes or hops out, Down dives)
//   W  upward current (the Dorsal Cove waterfall that flows uphill)
//   F  dorsal-fin rock (scenery)
//   T  quiz treasure (numbered left to right: 1st T is item 0, and so on)
//   G  goal flag       S  secret exit (only appears in levels with a secret)
//   P  player start    .  empty
//   <  >  ^  [  ]  arrow signposts: left, right, up, up-left, up-right (scenery)
//   1-9  hidden door: the two cells with the same digit are a pair. Stand in
//        one and press Up to come out at the other. Nothing is drawn there.
// Rows shorter than the widest row are padded with empty space.
// `signs` are little wooden hints: { col, row, text }.
// `artset` names the art applied to the drawing (see data/artsets.js).

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

// The level designer (designer/index.html) hands a drawing to the game by
// saving its layout here, then opening index.html?test=1&level=<id>. The
// level id only borrows that level's name and quiz questions.
export const TEST_LAYOUT_KEY = 'zebonky-tms-test-layout';

// index.html?demo=<level> opens straight into that level's saved drawing
// (assets/levels/<level>.json), for showing it off. Like a test run it never
// touches the saved game, and finishing starts it again.
export function testParams() {
  const q = new URLSearchParams(window.location.search);
  if (q.has('demo')) {
    const id = q.get('demo') || 'cumulus';
    return { levelId: id, layoutId: id, test: true, demo: true };
  }
  if (!q.has('test')) return null;
  return { levelId: q.get('level') || 'dorsal', test: true };
}

function testLayout() {
  try {
    const raw = localStorage.getItem(TEST_LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Nothing handed over: fall through to the sample.
  }
  return null;
}

// Levels saved from the designer (assets/levels/<id>.json), filled in by
// Boot. A drawn level wins over the hand-typed one above.
export const DRAWN = {};

export function layoutFor(levelId, test = false) {
  if (test) return testLayout() || SAMPLE_LAYOUT;
  return DRAWN[levelId] || LAYOUTS[levelId] || SAMPLE_LAYOUT;
}
