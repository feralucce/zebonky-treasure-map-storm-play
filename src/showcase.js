// The Zebonky showcase (index.html?showcase=1, the user, 2026-10-27: "Each
// zebonky in game settings ... I want them moving through the level assets
// so the team can see them as they will appear in game").
//
// Each Zebonky gets a short stretch of its own biome, built from that art
// set by the level code like any level: flat ground, a ledge one tile up, a
// pool, more ground. No explorer, crates or HUD. Buttons along the top pick
// the Zebonky and what it does: a tour of the whole stretch, or idle, walk,
// run, jump or swim (flight for Ricky) on their own.

import { TILE, DRAWN } from './data/levels.js?v=f603345';
import { WildZebonky, play, crouchTime, FLY_ABOVE, LEAP_SPEED, SWIM_SPEED, FLOAT_RISE, WANDER_SPEED, CHARGE_SPEED } from './actors.js?v=f603345';
import { COLORS, text } from './theme.js?v=f603345';

// Who, in which art set, borrowing which level's name.
export const SHOWCASE = [
  { key: 'shaan', who: 'Shaan', artset: 'dorsal_cove', levelId: 'dorsal-1' },
  { key: 'axel', who: 'Axel', artset: 'seafoam_shores', levelId: 'seafoam-1' },
  { key: 'sofia', who: 'Sofia', artset: 'squvannahs', levelId: 'squvannahs-1' },
  { key: 'unity', who: 'Unity', artset: 'magenta_mountains', levelId: 'magenta-1' },
  { key: 'charlie', who: 'Charlie', artset: 'cumulus_floor', levelId: 'cumulus-1' },
  { key: 'ricky', who: 'Ricky', artset: 'cumulus_canopy', levelId: 'cumulus-5' },
];

const W = 48;
const WALK = [2, 10];        // flat ground before the ledge
const LEDGE = [12, 15];      // one tile up (two is just past a Zebonky's leap)
const POOL = [24, 33];       // two deep
const RUN = [35, 46];        // flat ground after the pool
const START = 3;

// The stretch, in the level format (assets/levels: 20 rows, ground top 16).
export function showcaseLayout(artset) {
  const rows = [];
  for (let r = 0; r < 20; r++) {
    let row = '';
    for (let c = 0; c < W; c++) {
      let ch = r >= 16 ? '#' : '.';
      if (r >= 15 && c >= LEDGE[0] && c <= LEDGE[1]) ch = '#';
      if ((r === 16 || r === 17) && c >= POOL[0] && c <= POOL[1]) ch = '~';
      if (r === 15 && c === START) ch = 'P';
      row += ch;
    }
    rows.push(row);
  }
  return { rows, artset, waits: [], title: 'Zebonky showcase' };
}

// The art set a showcase link's Zebonky needs (?showcase=<name>), or null.
export function showcaseArtset(q) {
  const z = q && SHOWCASE.find((s) => s.key === q);
  return z ? z.artset : null;
}

// A strip in the gallery (zebonkies.html: ?showcase=<name>&strip=1): no
// buttons; the gallery page sends the mode to all six at once.
const STRIP = new URLSearchParams(window.location.search).has('strip');

// Registers the stretch for one Zebonky and returns the Level scene's data.
export function showcaseData(key) {
  const z = SHOWCASE.find((s) => s.key === key) || SHOWCASE[0];
  const layoutId = `showcase-${z.artset}`;
  DRAWN[layoutId] = showcaseLayout(z.artset);
  return { levelId: z.levelId, layoutId, showcase: z.key };
}

const col = (x) => Math.floor(x / TILE);
const cx = (c) => c * TILE + TILE / 2;

// A Zebonky that goes where the showcase sends it: back and forth between
// two columns at a walk or a run, leaping the ledge and the pool's banks the
// way a wild one does, or swimming (flying) across the pool.
class ShowcaseZebonky extends WildZebonky {
  constructor(scene, art, x, feetY) {
    super(scene, art, x, feetY);
    this.dir = 1;
    this.setMode('tour');
  }

  setMode(mode) {
    this.mode = mode;
    this.dir = 1;
    this.pauseUntil = 0;
    const { scene } = this;
    const s = this.sprite;
    // Each mode starts where it shows best.
    const here = (c) => {
      s.body.reset(cx(c), 15 * TILE + TILE - 1);
      s.setVelocity(0, 0);
    };
    if (mode === 'tour') { here(WALK[0]); this.span = [WALK[0], RUN[1]]; this.gait = 'walk'; }
    if (mode === 'idle') { here(7); this.span = null; }
    if (mode === 'walk') { here(WALK[0]); this.span = WALK; this.gait = 'walk'; }
    if (mode === 'run') { here(RUN[0]); this.span = RUN; this.gait = 'run'; }
    if (mode === 'jump') { here(9); this.span = [9, 19]; this.gait = 'walk'; }
    if (mode === 'swim') {
      s.body.reset(cx(POOL[0] + 1), 16 * TILE + 20);
      s.setVelocity(0, 0);
      this.span = [POOL[0] + 1, POOL[1] - 1];
    }
    play(s, this.art, mode === 'swim' ? 'swim' : 'idle');
    scene.cameras.main.startFollow(s, true, 0.1, 0.1, 0, 40);
  }

  inWater() {
    const s = this.sprite;
    if (this.scene.isWaterAt(s.x, s.y - 30)) return true;
    return this.art.z.flies && !s.body.blocked.down && this.scene.isWaterAt(s.x, s.y + FLY_ABOVE + 20);
  }

  // Floating (or flying over the water) and paddling the way it faces.
  paddle() {
    const s = this.sprite;
    const scene = this.scene;
    s.body.setGravityY(-scene.physics.world.gravity.y);
    const surface = scene.surfaceRow[col(s.x)] !== undefined ? scene.surfaceRow[col(s.x)] * TILE : null;
    const ride = surface === null ? s.y : surface + (this.art.z.flies ? -FLY_ABOVE : 30);
    const vy = s.body.velocity.y;
    s.setVelocityY(s.y > ride + 4 ? Phaser.Math.Linear(vy, -FLOAT_RISE, 0.1) : Phaser.Math.Linear(vy, (ride - s.y) * 4, 0.25));
    s.setFlipX(this.dir > 0);   // the art faces left (faceArt flips the rest)
    play(s, this.art, this.art.z.anims.swim ? 'swim' : 'walk');
    const next = col(s.x) + this.dir;
    // The swim on its own turns at the banks; the tour leaps out.
    if (this.mode === 'swim') {
      if (next < this.span[0] || next > this.span[1]) this.dir = -this.dir;
      s.setVelocityX(this.dir * SWIM_SPEED);
      return;
    }
    const atBank = this.dir < 0 ? s.body.blocked.left : s.body.blocked.right;
    if (atBank || next < POOL[0] || next > POOL[1]) {
      s.body.setGravityY(0);
      s.setVelocity(this.dir * 180, -LEAP_SPEED - 80);
      this.leapingUntil = scene.time.now + 700;
      play(s, this.art, 'jump');
      return;
    }
    s.setVelocityX(this.dir * SWIM_SPEED);
  }

  update(time) {
    const s = this.sprite;
    if (time < (this.crouchUntil || 0)) { s.setVelocityX(0); return; }
    if (time < (this.leapingUntil || 0)) { s.setVelocityX(this.dir * 180); return; }
    if (this.mode === 'swim' || this.inWater()) { this.paddle(); return; }
    s.body.setGravityY(0);
    // Mid-leap: keep going forward (a leap from against the ledge's wall
    // starts with no sideways speed, the wall having stopped it).
    if (!s.body.blocked.down && !s.body.touching.down) {
      if (this.mode !== 'idle') s.setVelocityX(this.dir * (this.speed || WANDER_SPEED));
      return;
    }
    if (this.mode === 'idle' || time < this.pauseUntil) {
      s.setVelocityX(0);
      play(s, this.art, 'idle');
      return;
    }
    // Turn at the ends of the span, with a moment of idle in the tour.
    const c = col(s.x);
    if ((this.dir > 0 && c >= this.span[1]) || (this.dir < 0 && c <= this.span[0])) {
      this.dir = -this.dir;
      if (this.mode === 'tour') this.pauseUntil = time + 1500;
      s.setVelocityX(0);
      play(s, this.art, 'idle');
      return;
    }
    // The tour walks the first ground, runs from the ledge on.
    let gait = this.gait;
    if (this.mode === 'tour') gait = c >= LEDGE[0] - 2 && c <= RUN[1] - 2 ? 'run' : 'walk';
    const speed = gait === 'run' ? CHARGE_SPEED * 1.3 : WANDER_SPEED * 1.6;
    this.speed = Math.max(speed, 150);
    // What's ahead, by the feet's row: level ground, a step up, a step
    // down, or water. (The wild Zebonky's gap finder kept finding a gap
    // just after each landing.)
    const sc = this.scene;
    const feet = Math.round(s.y / TILE);
    const ahead = Math.floor((s.x + this.dir * 30) / TILE);
    s.setFlipX(this.dir > 0);   // the art faces left (faceArt flips the rest)
    const water = sc.isWaterAt(cx(ahead), s.y + 8);
    const stepUp = sc.isFloor(feet - 1, ahead);
    const level = sc.isFloor(feet, ahead);
    if (stepUp || (!level && !water)) {
      s.setVelocityX(this.dir * this.speed);
      this.leap();
      return;
    }
    s.setVelocityX(this.dir * speed);
    play(s, this.art, gait);
  }
}

// Called by the Level scene in showcase mode, after the stretch is built.
export function startShowcase(scene, key, art) {
  const cam = scene.cameras.main;
  const s0 = scene.start;
  const z = new ShowcaseZebonky(scene, art, s0.x, s0.y + TILE / 2);
  scene.physics.add.collider(z.sprite, scene.solids);
  scene.physics.add.collider(z.sprite, scene.platforms);
  scene.showcaseZebonky = z;

  if (STRIP) {
    // The gallery page drives every strip: postMessage({ mode }).
    scene.sound.mute = true;
    const who = SHOWCASE.find((s) => s.key === key);
    scene.add.text(14, 210, who ? who.who : key, text(30, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.75)', padding: { x: 14, y: 6 },
    })).setScrollFactor(0).setDepth(50);
    const onMsg = (e) => { if (e.data && e.data.mode) z.setMode(e.data.mode); };
    window.addEventListener('message', onMsg);
    scene.events.once('shutdown', () => window.removeEventListener('message', onMsg));
    if (window.parent !== window) window.parent.postMessage({ ready: key }, '*');
    cam.startFollow(z.sprite, true, 0.1, 0.1, 0, 40);
    return;
  }

  // The buttons: the Zebonkies on top, what it does below.
  const bar = (y, items, current, onPick) => {
    let x = 14;
    items.forEach(([id, label]) => {
      const on = id === current;
      const t = scene.add.text(x, y, label, text(20, on ? '#ffffff' : '#2b1d12', {
        backgroundColor: on ? '#2f8f5b' : 'rgba(255,248,232,0.92)',
        padding: { x: 12, y: 6 },
      })).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => onPick(id));
      x += t.width + 8;
    });
  };
  bar(12, SHOWCASE.map((s) => [s.key, s.who]), key, (k) => {
    if (k !== key) scene.scene.restart(showcaseData(k));
  });
  const swim = art.z.flies ? 'Flight' : 'Swim';
  const modes = [['tour', 'Tour'], ['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['jump', 'Jump'], ['swim', swim]];
  const drawModes = () => {
    if (scene.modeBar) scene.modeBar.forEach((t) => t.destroy());
    const before = scene.children.list.length;
    bar(58, modes, z.mode, (m) => { z.setMode(m); drawModes(); });
    scene.modeBar = scene.children.list.slice(before);
  };
  drawModes();
  cam.startFollow(z.sprite, true, 0.1, 0.1, 0, 40);
}
