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
import { TOUCH_ONLY } from '../touch.js?v=bb8c89c';

// The button lines each Zebonky's rooms share (Break the Bubble's goes
// first, the others under each door's own first line).
const SURF = 'Jump the boulders, or tap the star for Z power!';
const BUBBLE = 'Aim with the arrows, throw with the jump button.';
const CHASE = 'Steer with the arrows, hold the green button to run,\njump the logs, hold the star to Hyper Dash.';
const HEART = 'Fill the Z meter to open the crystal heart!\nTap the star for Night Light.';
const TERRACE = 'Arrows steer, jump turns, down drops.\nThe star is Z Quake.';
// Terrace Garden 2's intro is already three lines: its button line fits on one.
const TERRACE_ONE = 'Arrows steer, jump turns, down drops, the star quakes.';

export const PHONE_INTROS = {
  'seafoam-bubble': 'Aim with the arrows, throw with the jump button.\nFive or more the same break.',
  'cumulus-circuits': 'Hop with the arrows, spin with the jump button.\nLight up the trees!',
  'bananalope-chase': 'Catch the bananalope!\nSteer with the arrows, hold the green button to run,\njump the logs, hold the star to Hyper Dash.',
  'crystal-heart': 'Fill the Z meter to open the crystal heart!\nTap the star for Night Light.',
  'terrace-garden': 'Plant the terraces!\nArrows steer, jump turns, down drops.\nThe star is Z Quake.',
  // Doors 2 to 5 (2026-11-20): the same button lines under each door's own
  // first line. (Surf and Slope's and Cumulus Circuits' doors name no keys.)
  'seafoam-bubble-2': `${BUBBLE}\nBounce off the sides to reach the ends.`,
  'seafoam-bubble-3': `${BUBBLE}\nBreak the top puff and the whole lump falls.`,
  'seafoam-bubble-4': `${BUBBLE}\nThe Z-bolts are packed in the middle.`,
  'seafoam-bubble-5': `${BUBBLE}\nThe biggest bubble yet. Free all the Z-bolts.`,
  'bananalope-chase-2': `The bananalope is off again! Catch it!\n${CHASE}`,
  'bananalope-chase-3': `Deeper into the jungle! Catch the bananalope!\n${CHASE}`,
  'bananalope-chase-4': `Up and down the hills! Catch the bananalope!\n${CHASE}`,
  'bananalope-chase-5': `The longest chase yet! Catch the bananalope!\n${CHASE}`,
  'crystal-heart-2': `Six rings deep!\n${HEART}`,
  'crystal-heart-3': `Seven rings, and more crystals in the way!\n${HEART}`,
  'crystal-heart-4': `Eight rings, deep in the dark!\n${HEART}`,
  'crystal-heart-5': `The biggest cave of all: nine rings!\n${HEART}`,
  'terrace-garden-2': `Stones in the hill! Z Quake breaks them.\nWeeds push up: fill their gap!\nA terrace all one plant is Perfect!\n${TERRACE_ONE}`,
  'terrace-garden-3': `More stones, and faster weeds!\n${TERRACE}`,
  'terrace-garden-4': `Stone ledges, and faster weeds!\n${TERRACE}`,
  'terrace-garden-5': `The biggest hill, and the fastest weeds!\n${TERRACE}`,
  // Surf and Slope (2026-11-20): every door's intro ends with the boulder line.
  'dorsal-surf': `Roll, dive and leap!\n${SURF}`,
  'dorsal-surf-2': `More dives, more boulders!\n${SURF}`,
  'dorsal-surf-3': `Ride the geysers to the cliff tops!\n${SURF}`,
  'dorsal-surf-4': `Deep, dark and fast!\n${SURF}`,
  'dorsal-surf-5': `The longest surf of all!\n${SURF}`,
  'cumulus-1': 'Run, Charlie, run! Hold the right arrow to speed up.\nGrab fruit, then double tap it to Hyper Dash.',
};

// The intro to show for a room: the phone wording on a phone, if it has one.
export function introFor(levelId, room) {
  return (TOUCH_ONLY && PHONE_INTROS[levelId]) || (room && room.intro) || '';
}
