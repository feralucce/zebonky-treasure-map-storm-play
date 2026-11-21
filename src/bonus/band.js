// Which difficulty band a bonus room plays at (Chris, 2026-11-20: rooms that
// change "depending on the 'game difficulty' selected"). The map's
// Difficulty setting: 'junior' (Junior Explorer), 'explorer' or 'pioneer'.
// A room's data is built for Pioneer; easier bands ease it off in the room's
// own module (chase.js, circuits.js).
//
// Testing: `&band=junior` (or explorer, pioneer) on a ?bonustest= link
// plays that band without changing the saved setting.
import { state } from '../state.js?v=12e35af';

const BANDS = ['junior', 'explorer', 'pioneer'];

export function bandId() {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('band') : null;
  if (BANDS.includes(q)) return q;
  try {
    const id = state.difficulty().id;
    return BANDS.includes(id) ? id : 'pioneer';
  } catch (e) {
    return 'pioneer';
  }
}
