// The + D-pad (the user, 2026-11-20: "make the arrows for control a +
// configuration"). Four Kenney Style H arms (tools/make_touch_buttons.py)
// around one touch zone. Which arm counts is read from where the thumb is,
// so a thumb can slide from one arm to the next without lifting, and the
// gaps between the arms still count for the nearest one.
//
// It writes scene.touch.left / right / up / down (held), read the same way
// the old left and right buttons were, and calls onPress(dir) each time an
// arm starts being held, for the one-shot actions (a door, a tile hop).
// scene.touch is looked up each time: some scenes replace that object.
import { MAP_H } from './data/world.js?v=12e35af';
import { TOUCH_ONLY } from './touch.js?v=12e35af';
import { text } from './theme.js?v=12e35af';

// Sized so its right arm stops short of Cumulus Circuits' board (x 244).
export const DPAD_X = 124;
export const DPAD_Y = MAP_H - 140;
const SCALE = 0.93;      // the arm pictures are 112 px; shown a touch smaller
const ARM = 112 * SCALE; // each arm, square
const OFF = 64 * SCALE;  // each arm's centre from the middle (Kenney's own spacing)
const DEAD = 14;         // a thumb right on the middle holds nothing
const REACH = OFF + ARM; // a thumb this far out has slid off the pad
const DEPTH = 23;        // over the scenery (Cumulus Circuits' flowers drew over it at 20)
const FADE = 0.75;       // arms rest at this, 1 while held (like the other buttons)

export function buildDpad(scene, onPress) {
  const at = { up: [0, -OFF], down: [0, OFF], left: [-OFF, 0], right: [OFF, 0] };
  const arms = {};
  for (const [d, [dx, dy]] of Object.entries(at)) {
    arms[d] = scene.add.image(DPAD_X + dx, DPAD_Y + dy, `dpad-${d}`)
      .setScale(SCALE).setScrollFactor(0).setDepth(DEPTH).setAlpha(FADE);
  }
  const size = 2 * OFF + ARM;
  const zone = scene.add.zone(DPAD_X, DPAD_Y, size, size).setScrollFactor(0).setDepth(20).setInteractive();
  if (!TOUCH_ONLY) {
    scene.add.text(DPAD_X + OFF + ARM / 2 + 8, DPAD_Y + OFF + 30, 'Arrows or WASD', text(16, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
    })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20);
  }

  const pad = { dir: null, pointerId: null };
  const dirAt = (p) => {
    const dx = p.x - DPAD_X;
    const dy = p.y - DPAD_Y;
    const dist = Math.hypot(dx, dy);
    if (dist < DEAD || dist > REACH) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  };
  const set = (d) => {
    if (d === pad.dir) return;
    const touch = scene.touch;
    if (pad.dir) {
      if (touch) touch[pad.dir] = false;
      arms[pad.dir].setAlpha(FADE);
    }
    pad.dir = d;
    if (d) {
      if (touch) touch[d] = true;
      arms[d].setAlpha(1);
      if (onPress) onPress(d);
    }
  };
  zone.on('pointerdown', (p) => { pad.pointerId = p.id; set(dirAt(p)); });
  scene.input.on('pointermove', (p) => { if (p.id === pad.pointerId && p.isDown) set(dirAt(p)); });
  const lift = (p) => { if (p.id === pad.pointerId) { pad.pointerId = null; set(null); } };
  scene.input.on('pointerup', lift);
  scene.input.on('pointerupoutside', lift);
  // Leaving the scene mid-press (a bonus room, the quiz): let go, so nothing
  // stays held, and so the same arm pressed again on return counts.
  const forget = () => {
    pad.pointerId = null;
    if (pad.dir) arms[pad.dir].setAlpha(FADE);
    pad.dir = null;
  };
  scene.events.on('sleep', forget);
  scene.events.on('pause', forget);
  scene.events.once('shutdown', () => {
    scene.events.off('sleep', forget);
    scene.events.off('pause', forget);
  });
  return pad;
}
