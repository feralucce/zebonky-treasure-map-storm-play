// Art sets: the finished art that gets applied to a level drawing.
// Each lives in assets/artsets/<name>/ with an artset.json manifest that
// says which picture plays which role (top-left grass corner, cliff side,
// platform end and so on). Replace the pictures file for file and every
// level drawn for that set picks up the new art.
//
// A layout chooses its set with `artset: 'name'`. Layouts without one keep
// the concept-box look.

export const ARTSETS = ['rainforest', 'rainforest_jungle', 'rainforest_floor'];

// Not a folder: the "blocks" look plays a drawing as flat blocks in the
// designer's legend colours, with no scenery, for testing a layout.
export const BLOCKS = 'blocks';
export const BLOCK_COLORS = {
  '#': 0x000000, s: 0xd9b36c, R: 0x808080, '=': 0x8b4513, '~': 0x0050ff, W: 0x00e5ff, V: 0x2e9e3a,
};
export const BLOCKS_SKY = '#e8eef0';

// Terrain characters -> the set in the manifest that draws them.
export const TERRAIN_SETS = { '#': 'ground', s: 'sand', R: 'rock' };

export const texKey = (artset, file) => `art:${artset}:${file}`;

// Same answer for the same tile every time, so variants don't flicker
// between visits.
export function tileHash(c, r) {
  let h = (c * 73856093) ^ (r * 19349663);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function pick(list, c, r) {
  return list[Math.floor(tileHash(c, r) * list.length) % list.length];
}

// Which picture a solid tile needs, from what's around it.
export function solidRole(isSolid, r, c) {
  const top = !isSolid(r - 1, c);
  const left = !isSolid(r, c - 1);
  const right = !isSolid(r, c + 1);
  if (top) {
    if (left && right) return 'top_single';
    if (left) return 'top_left';
    if (right) return 'top_right';
    return 'top_mid';
  }
  if (left && !right) return 'side_left';
  if (right && !left) return 'side_right';
  return 'fill';
}

// Fallbacks so a half-finished set still draws something sensible.
const ROLE_FALLBACK = {
  top_single: ['top_single', 'top_mid'],
  top_left: ['top_left', 'top_mid'],
  top_right: ['top_right', 'top_mid'],
  top_mid: ['top_mid'],
  side_left: ['side_left', 'fill'],
  side_right: ['side_right', 'fill'],
  fill: ['fill'],
};

export function roleFiles(set, role) {
  for (const k of ROLE_FALLBACK[role] || [role]) if (set[k] && set[k].length) return set[k];
  return null;
}

export function platformRole(isPlatform, r, c) {
  const l = isPlatform(r, c - 1);
  const rt = isPlatform(r, c + 1);
  if (!l && !rt) return 'single';
  if (!l) return 'left';
  if (!rt) return 'right';
  return 'mid';
}
