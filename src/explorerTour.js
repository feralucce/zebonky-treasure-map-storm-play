// The explorer tour (index.html?explorers=girl or =boy; explorers.html
// wraps it with buttons to switch explorer. The user, 2026-10-29: "set up a
// tour demo like the zebonkies. Just have it tour, have a vine in it and
// buttons to switch which explorer").
//
// A stretch of the rainforest floor, built by the level code like any
// level: ground, a ledge one tile up, a cliff with a vine up its face, a
// pool, more ground. No HUD, crates or Zebonkies. The explorer goes through
// every one of her moves on a fixed route, running most of it: idle, walk,
// run, a hop up the ledge and down, climb the vine, crouch on the cliff top, jump down into
// the pool, swim, tread water, swim, hop out, run, idle; then it starts
// over. Her frames are the new rig strips (assets/player/explorer_walk_v2/).

import { TILE, DRAWN } from './data/levels.js?v=3f77531';
import { text } from './theme.js?v=3f77531';
import { GRASS_SINK } from './actors.js?v=3f77531';

export const TOUR_WHO = [
  { key: 'girl', who: 'Girl' },
  { key: 'boy', who: 'Boy' },
];
const ARTSET = 'cumulus_floor';
const LEVEL_ID = 'cumulus-1';
const DIR = 'assets/player/explorer_walk_v2/';

// Each move's strip: frames, frame width and frames a second (the frame
// height is 96 for all of them; the swim lies out wider).
const ANIMS = {
  idle: { n: 16, w: 71, fps: 9 },
  walk: { n: 16, w: 71, fps: 16 },
  run: { n: 8, w: 71, fps: 14 },
  jump: { n: 14, w: 71, fps: 12 },
  crouch: { n: 18, w: 71, fps: 10 },
  climb: { n: 8, w: 71, fps: 9 },
  climb_back: { n: 8, w: 71, fps: 9 },
  swim: { n: 8, w: 88, fps: 9 },
  tread: { n: 8, w: 71, fps: 7 },
};
// Where the vine runs in the climb frames (tools/pixel_pass_walk.py), plus a
// shift so she hangs off the rock with the vine between her knees and hands
// (the user).
const VINE_X = { girl: 46, boy: 45 };
const VINE_OFF = 10;

const W = 50;
const LEDGE = [12, 14];      // one tile up
const CLIFF = [21, 28];      // its top is the standing row 9
const VINE = 20;             // up the cliff's face, rows 9 to 15
const POOL = [31, 39];       // two deep
const START = 3;

// The stretch, in the level format (20 rows, the ground's top row 16).
function tourLayout() {
  const rows = [];
  for (let r = 0; r < 20; r++) {
    let row = '';
    for (let c = 0; c < W; c++) {
      let ch = r >= 16 ? '#' : '.';
      if (r === 15 && c >= LEDGE[0] && c <= LEDGE[1]) ch = '#';
      if (r >= 10 && c >= CLIFF[0] && c <= CLIFF[1]) ch = '#';
      if (r >= 9 && r <= 15 && c === VINE) ch = 'V';
      if ((r === 16 || r === 17) && c >= POOL[0] && c <= POOL[1]) ch = '~';
      if (r === 15 && c === START) ch = 'P';
      row += ch;
    }
    rows.push(row);
  }
  return { rows, artset: ARTSET, waits: [], title: 'Explorer tour' };
}

export const tourArtset = (q) => (q && TOUR_WHO.some((t) => t.key === q) ? ARTSET : null);

// Boot queues her strips (only on a tour link).
export function loadTourStrips(scene, who) {
  Object.entries(ANIMS).forEach(([name, a]) => {
    scene.load.spritesheet(`tour-${who}-${name}`, `${DIR}${who}_${name}_game_strip.png`, { frameWidth: a.w, frameHeight: 96 });
  });
}

// Registers the stretch and returns the Level scene's data.
export function explorerTourData(who) {
  const key = TOUR_WHO.some((t) => t.key === who) ? who : 'girl';
  DRAWN['tour-explorers'] = tourLayout();
  return { levelId: LEVEL_ID, layoutId: 'tour-explorers', explorerTour: key };
}

const STRIP = new URLSearchParams(window.location.search).has('strip');
const cx = (c) => c * TILE + TILE / 2;
const GROUND = 16 * TILE;          // feet on the ground
const LEDGE_TOP = 15 * TILE;
const CLIFF_TOP = 10 * TILE;
const SURFACE = 16 * TILE;         // the pool's surface
const STRAND = (VINE + 1) * TILE;  // the vine hangs on the cliff's face
// In the water her frames sit lower: in up to her chin (the user).
const SWIM_SINK = 54;
const TREAD_SINK = 62;

// The route: each step moves her feet from where the last one left them to
// (x, y), over its time, with one move's frames; a hop arcs up h px.
// frames: a list of frame numbers spread over the step, else the move loops.
function route() {
  const steps = [];
  let x = cx(START);
  let y = GROUND;
  const go = (anim, x1, y1, ms, o = {}) => {
    steps.push({ anim, x0: x, y0: y, x1, y1, ms, ...o });
    x = x1;
    y = y1;
  };
  const hop = (x1, y1, h, ms) => {
    go('jump', x, y, 150, { frames: [1, 2] });                   // wind up
    go('jump', x1, y1, ms, { frames: [3, 4, 5, 6, 7, 8, 9], arc: h });
    go('jump', x1, y1, 200, { frames: [10, 11, 12] });           // land
  };
  // Running most of the time (the user), a short walk to start.
  go('idle', x, y, 1200);
  go('walk', cx(5), y, 900);
  go('run', cx(10) + 20, y, 1000);
  hop(cx(13), LEDGE_TOP, 70, 480);
  go('run', cx(14) + 10, LEDGE_TOP, 250);
  hop(cx(16), GROUND, 50, 440);
  go('run', STRAND - 34, GROUND, 700);
  // Up the vine, then up onto the cliff's top.
  go('climb', STRAND, GROUND, 1, { onVine: true });
  go('climb', STRAND, CLIFF_TOP + 40, 3400, { onVine: true });
  hop(cx(CLIFF[0]) + 10, CLIFF_TOP, 40, 380);
  go('run', cx(26), CLIFF_TOP, 1000);
  go('crouch', cx(26), CLIFF_TOP, 2000, { once: [0, 1] });
  go('run', cx(CLIFF[1]) - 4, CLIFF_TOP, 400);
  // Down into the pool.
  hop(cx(32), SURFACE + SWIM_SINK, 60, 700);
  go('swim', cx(35), SURFACE + SWIM_SINK, 2600);
  go('tread', cx(35), SURFACE + TREAD_SINK, 3200);
  go('swim', cx(POOL[1]) - 10, SURFACE + SWIM_SINK, 2200);
  hop(cx(POOL[1] + 2), GROUND, 60, 520);
  go('run', cx(46), GROUND, 1100);
  go('idle', cx(46), GROUND, 1800);
  return steps;
}

class TourExplorer {
  constructor(scene, who) {
    this.scene = scene;
    this.who = who;
    this.steps = route();
    // The background arm and leg on the vine go behind the vine (depth 1);
    // the rest of her in front of it, under the water (depth 5).
    this.back = scene.add.sprite(0, 0, `tour-${who}-climb_back`, 0).setDepth(0.8).setVisible(false);
    this.body = scene.add.sprite(0, 0, `tour-${who}-idle`, 0).setDepth(3);
    this.begin(scene.time.now);
  }

  begin(time) {
    this.i = 0;
    this.t0 = time;
  }

  update(time) {
    let s = this.steps[this.i];
    while (time - this.t0 >= s.ms) {
      this.t0 += s.ms;
      this.i += 1;
      if (this.i >= this.steps.length) {
        this.begin(time);
        this.scene.cameras.main.flash(250, 255, 255, 255);
      }
      s = this.steps[this.i];
    }
    const e = time - this.t0;
    const p = Math.min(1, e / s.ms);
    const x = s.x0 + (s.x1 - s.x0) * p;
    const y = s.y0 + (s.y1 - s.y0) * p - (s.arc ? 4 * s.arc * p * (1 - p) : 0);
    const a = ANIMS[s.anim];
    let f;
    if (s.frames) f = s.frames[Math.min(s.frames.length - 1, Math.floor(p * s.frames.length))];
    else if (s.once) {
      // Plays its first frames once, then loops the rest (the crouch).
      const k = Math.floor((e / 1000) * a.fps);
      f = k < s.once.length ? s.once[k] : s.once.length + ((k - s.once.length) % (a.n - s.once.length));
    } else f = Math.floor((e / 1000) * a.fps) % a.n;
    const b = this.body;
    b.setTexture(`tour-${this.who}-${s.anim}`, f);
    // Feet at (x, y). On the vine her frame is set by where the vine runs in it.
    b.setOrigin(s.onVine ? (VINE_X[this.who] + VINE_OFF) / a.w : 0.5, 1);
    b.setPosition(x, y + (s.onVine || s.anim === 'swim' || s.anim === 'tread' ? 0 : GRASS_SINK));   // feet in the grass
    this.back.setVisible(!!s.onVine);
    if (s.onVine) {
      this.back.setTexture(`tour-${this.who}-climb_back`, f).setOrigin(b.originX, 1).setPosition(x, y);
    }
  }
}

// Called by the Level scene for a tour link, after the stretch is built.
export function startExplorerTour(scene, who) {
  if (STRIP) scene.sound.mute = true;
  const t = new TourExplorer(scene, who);
  scene.explorerTourActor = t;
  scene.cameras.main.startFollow(t.body, true, 0.1, 0.1, 0, 60);
  if (!STRIP) {
    // On its own (not in explorers.html): its own buttons.
    let bx = 14;
    TOUR_WHO.forEach(({ key, who: label }) => {
      const on = key === who;
      const b = scene.add.text(bx, 12, label, text(20, on ? '#ffffff' : '#2b1d12', {
        backgroundColor: on ? '#2f8f5b' : 'rgba(255,248,232,0.92)', padding: { x: 12, y: 6 },
      })).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => { if (key !== who) scene.scene.restart(explorerTourData(key)); });
      bx += b.width + 8;
    });
  }
}
