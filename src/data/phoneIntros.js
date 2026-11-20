// Phone wording for the bonus rooms' intro lines (2026-11-20). On a phone
// (TOUCH_ONLY, src/touch.js) there's no keyboard, so "Space" or "the jump
// key" means nothing: these name the on-screen buttons instead. The
// buttons: arrows, the jump button (double chevron), the star (each room's
// power), Chase's green Go button, and the up/down buttons some rooms add.
//
// Kept apart from the room data because most rooms' data files are made by
// tools/make_*.py: a room missing here just shows its own intro. If a room's
// intro changes, change its line here too. Rooms whose intro names no keys
// (Surf and Slope; most of the older rooms) aren't listed.
import { TOUCH_ONLY } from '../touch.js?v=4607924';

export const PHONE_INTROS = {
  'seafoam-bubble': 'Aim with the arrows, throw with the jump button.\nFive or more the same break.',
  'cumulus-circuits': 'Hop with the arrows, spin with the jump button.\nLight up the trees!',
  'bananalope-chase': 'Catch the bananalope!\nSteer with the arrows, hold the green button to run,\njump the logs, hold the star to Hyper Dash.',
  'crystal-heart': 'Fill the Z meter to open the crystal heart!\nHold the star for Night Light.',
  'terrace-garden': 'Plant the terraces!\nArrows steer, jump turns, down drops.\nThe star is Z Quake.',
  'cumulus-1': 'Run, Charlie, run! Hold the right arrow to speed up.\nGrab fruit, then double tap it to Hyper Dash.',
};

// The intro to show for a room: the phone wording on a phone, if it has one.
export function introFor(levelId, room) {
  return (TOUCH_ONLY && PHONE_INTROS[levelId]) || (room && room.intro) || '';
}
