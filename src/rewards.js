// Stars and points. Kept in the browser save with the rest of the progress,
// and carried by save codes, save files and save links (see savecode.js).
//
// Every level has three stars:
//   crates   all five quiz crates opened
//   bonus    the bonus level door found
//   tamed    every wild Zebonky in the level tamed
// Points come only from things done once (clearing a level, a treasure, a
// star), never from replaying, so they can't be farmed and a save code can
// rebuild them exactly.

import { LEVELS } from './data/world.js?v=97eab88';
import { state } from './state.js?v=97eab88';

export const POINTS = { clear: 100, treasure: 20, bonus: 150, tamed: 100 };

// Levels that give stars: the playable levels, not the bonus areas.
export const STAR_LEVELS = Object.keys(LEVELS).filter((id) => LEVELS[id].kind === 'level');

export function starsFor(id) {
  return {
    crates: state.isChecked(id),
    bonus: state.foundSecret(id),
    tamed: state.hasTamedAll(id),
  };
}

export function starCount(id) {
  const s = starsFor(id);
  return (s.crates ? 1 : 0) + (s.bonus ? 1 : 0) + (s.tamed ? 1 : 0);
}

export function pointsFor(id) {
  let p = state.isCleared(id) ? POINTS.clear : 0;
  p += state.treasureFor(id).length * POINTS.treasure;
  if (state.foundSecret(id)) p += POINTS.bonus;
  if (state.hasTamedAll(id)) p += POINTS.tamed;
  return p;
}

export function rewardTotals() {
  let stars = 0;
  STAR_LEVELS.forEach((id) => { stars += starCount(id); });
  const points = Object.keys(LEVELS).reduce((sum, id) => sum + pointsFor(id), 0);
  return { stars, maxStars: STAR_LEVELS.length * 3, points };
}
