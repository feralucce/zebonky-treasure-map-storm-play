// The drawing convention: what each colour in a level drawing means.
// Shared by the designer page (and documented in designer/README.md).
//
// Draw on a canvas whose size is a multiple of 64 px: one 64 px square is one
// tile. Shapes can be any outline (rectangles, polygons, curves); anything
// that covers most of a tile fills that tile. Markers are small circles.

export const TILE_PX = 64;

// Terrain: fills whole tiles.
export const TERRAIN = [
  { key: 'ground',   char: '#', hex: '#000000', label: 'Ground (solid)' },
  { key: 'sand',     char: 's', hex: '#D9B36C', label: 'Sand (solid)' },
  { key: 'rock',     char: 'R', hex: '#808080', label: 'Cliff rock (solid)' },
  { key: 'platform', char: '=', hex: '#8B4513', label: 'Jump-through platform' },
  { key: 'water',    char: '~', hex: '#0050FF', label: 'Water (swim)' },
  { key: 'current',  char: 'W', hex: '#00E5FF', label: 'Uphill waterfall current' },
];

// Markers: small circles, one tile each. `snap` ones drop down onto the
// ground beneath them; the rest stay where they're drawn.
export const MARKERS = [
  { key: 'start',  char: 'P', hex: '#00B050', label: 'Player start', snap: true },
  { key: 'quiz',   char: 'T', hex: '#FFC000', label: 'Mystery crate (draw 5)', snap: true },
  { key: 'goal',   char: 'G', hex: '#FF0000', label: 'Exit door', snap: true },
  { key: 'secret', char: 'S', hex: '#FF00FF', label: 'Secret exit', snap: true },
  { key: 'food',   char: 'f', hex: '#9BFF00', label: 'Food pickup', snap: false },
  { key: 'paw',    char: 'Z', hex: '#FFFF80', label: 'Z-bolt paw (energy)', snap: false },
  { key: 'wild',   char: 'E', hex: '#FF6600', label: 'Wild Zebonky', snap: true },
  { key: 'guide',  char: 'B', hex: '#8000FF', label: 'Guide Zebonky start', snap: true },
  { key: 'signL',  char: '<', hex: '#80C0FF', label: 'Arrow sign: left', snap: true },
  { key: 'signR',  char: '>', hex: '#00FF00', label: 'Arrow sign: right', snap: true },
  { key: 'signU',  char: '^', hex: '#0000A0', label: 'Arrow sign: up', snap: true },
  { key: 'signUL', char: '[', hex: '#A0A000', label: 'Arrow sign: up and left', snap: true },
  { key: 'signUR', char: ']', hex: '#80FFC0', label: 'Arrow sign: up and right', snap: true },
];

// Waiting points: where the guide Zebonky stops and waits for the player.
// Numbered in order (1, 2, 3...); unnumbered ones go left to right after
// the numbered ones. At the last one the guide reveals the exit door.
export const WAIT = { key: 'wait', hex: '#006060', label: 'Guide waiting point (number them)' };

export const CRATES = 5;

// Hidden doors: a tall box (1 tile wide, 2 high) standing on the ground,
// with a number written inside it. The two doors with the same number are a
// pair; stand in one and press Up to come out of the other. Unnumbered doors
// pair up left to right. Nothing is drawn in the game, so they stay secret.
export const DOOR = { key: 'door', hex: '#7030A0', label: 'Hidden door (pairs by number)' };

// Jump reach with the current physics (Platformer.js), in tiles.
export const JUMP = { up: 2.5, across: 3.9, safeUp: 2, safeGap: 3, safeUpAndAcross: [2, 2] };

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
