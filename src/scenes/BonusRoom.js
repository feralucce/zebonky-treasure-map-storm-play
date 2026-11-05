// A bonus level, played as the area's Zebonky (data/bonusRooms.js). The
// level sleeps while it plays and wakes when it ends (Platformer.js
// backFromBonus): falling off the bottom or going through the door both go
// back to the level at the bonus door's spot, with the door gone. The door
// opens with Up or the door button, as in the levels (the user, 2026-11-02).
// Every room is timed (the user, 2026-11-05): through the door, its own
// score card awards bronze, silver or gold, 1, 2 or 3 Z paw prints, by the
// room's `medalTimes` (paws.js). The tokens to gather are a stand-in until
// the team picks the collectible; they award nothing.
//
// The levels' box physics only knows flat ground and square blocks, so a
// room runs on Phaser's Matter physics: the Zebonky is a ball that rolls on
// hills and curves (the user, 2026-11-02). Shaan rolls with his own curl-up
// strip (the artset's `run`: curl, roll, uncurl when he stops).
//
// Inspection mode (index.html?bonusinspect=<level id>, the user,
// 2026-11-03): the room still, a marker to fly about it, zoom, and every
// island, geyser, waterfall, pool, rock, bumper and ring labelled with its
// number, for notes.
//
// Test mode (index.html?bonustest=<level id>, the user, 2026-11-02): the
// room on its own, no level behind it. Falling off starts the room over,
// coins and all, and so does going through the door.

import { MAP_W, MAP_H } from '../data/world.js?v=f7f47c2';
import { texKey } from '../data/artsets.js?v=f7f47c2';
import { bonusRoomFor } from '../data/bonusRooms.js?v=f7f47c2';
import { zebonkyArt, ensureAnims, faceArt, play, FEET_ROW, GRASS_SINK } from '../actors.js?v=f7f47c2';
import { tokenIcon, timeTier, tierInfo, earn, held, clock, pawCard } from '../paws.js?v=f7f47c2';
import { audio } from '../audio.js?v=f7f47c2';
import { COLORS, heading, text } from '../theme.js?v=f7f47c2';

const Matter = () => Phaser.Physics.Matter.Matter;

// Runner rooms (`runner: true`; Chimpanzeetah Speedway, the user,
// 2026-11-03, "a bit like the Donkey Kong Country mine cart levels"): the
// player drives him ("we drive him - he doesn't run on his own"): holding
// right he speeds up, quickly to a run and then on, the longer he holds it,
// to a cheetah's sprint; let go and he slows to a stop; left brakes and
// runs him back. Fruit gives a boost, used with a double tap forward;
// launch pads throw him high, always the same; rocks trip him and slow
// him; he runs through hollow logs. The medal is for his time to the door.
// Speeds are px a step.
const RUN = {
  run: 12,        // where holding right gets him quickly
  sprint: 16,     // where it carries on to, the longer he holds it
  back: 8,        // running back, holding left
  accel: 0.35,    // speeding up to `run`, a step
  creep: 0.04,    // from `run` on to `sprint`, a step (about 1.7 s)
  coast: 0.4,     // slowing, with nothing held
  brake: 0.8,     // slowing, holding the other way
  rockBack: 3,    // a rock stops him dead and knocks him back this much
  // A launch pad's throw, always the same, boosted or not (the user,
  // 2026-11-03: "no boost for a bigger launch. Always launch high"): about
  // 790 px, a path and more up (34, about 1080, was "way too high").
  pad: 29,
  boosts: 3,      // fruit held at most
  jump: 18,       // his jump (the user, 2026-11-03: "let Charlie jump higher"; 14 elsewhere)
};

const SCALE = 0.9;          // Shaan's frames (163 x 128) on screen
const RADIUS = 38;          // the ball: his curled-up shell at this scale
const CENTRE_Y = 77 / 128;  // the ball's middle in his frame
const GRAVITY = 1.9;        // about the levels' fall
const PUSH = 0.0006;        // rolling force on the ground (x mass)
const AIR_PUSH = 0.0006;    // steering in the air
const SPIN = 0.32;          // the spin the arrows give the ball on the ground
const MAX_SPEED = 16;       // px a step
const JUMP = 14;            // px a step, about three tiles up
const FALLS_UP = 12;        // an upward waterfall's pull, px a step
const COYOTE = 120;         // ms after rolling off an edge that a jump still works
const UNCURL_AFTER = 300;   // ms stopped before he uncurls
// How thick the ground's boxes are: the top ones thick, so a fast fall
// can't pass through them (it did, at 60); the underside's thin, so they
// don't poke up through the top near an island's ends.
const GROUND_DEPTH = 150;
const UNDER_DEPTH = 40;
// The islands' drawing: the levels' outline colour (Platformer.js
// skinEdgeTile), and grass only on a top gentler than this (radians, about
// 45 degrees: the grass is drawn in upright columns, and steeper than that
// they pull apart).
const OUTLINE = 'rgb(44,38,56)';
const GRASS_STEEPEST = 0.8;
const ART_PX = 4;           // one pixel of Chris's art, in game px
const CORNER = 16;          // how far down an island's side its rounded top corner reaches
const MAX_FALL = 24;        // px a step: about as fast as he falls
const FULL_SPEED_SLOPE = 0.7; // radians (40 degrees): full speed holds up slopes gentler than this
// Cracked rocks: rolling into one at this speed per px of its radius or
// faster smashes it (a 60 px rock needs 7.8, a 90 px one 11.7; full speed is
// 16), so it takes a run at it.
const BREAK_PER_RADIUS = 0.13;
// Bumpers (Roll Run, 2026-11-02): touch one and it bounces him away at this,
// and up. The user, 2026-11-03: "make the bumpers knock them back a lot".
const BUMP = 18;
const BUMP_UP = 8;
// The dash (the user, 2026-11-02): double-tap forward and he rolls faster
// for a second. Cracked rocks only break during one.
const DASH_SPEED = 21;      // px a step, over full speed's 16
const DASH_MS = 1000;
const DASH_AGAIN_MS = 1400; // from one dash's start to the next
const DOUBLE_TAP_MS = 300;  // the second tap within this
// Swimming (Shark Dash Rings, the user, 2026-11-02): in a pool he's a shark,
// steering every way, floating, and dashing through rings.
const SWIM_PUSH = 0.45;     // px a step per step, any way the arrows say
const SWIM_SPEED = 9;       // px a step
const SWIM_DRAG = 0.95;     // what's left of his speed each step
const WATER_DASH = 17;      // a dash underwater, px a step
// Rings count one each; in a room with no coins (Shark Dash Rings, the user,
// 2026-11-02: "the only thing that counts is the ring") they're the score.

// A smooth curve through the points (Catmull-Rom), about every `step` px.
function smooth(pts, step = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

// The island's whole outline, clockwise: its top, then the rock under it
// tapering to a point `under` px below its lowest point. `solid`: an island
// with a pool in it is one mass of rock, a rounded belly under the whole
// pool (hung from the top close by, the pool was a thin U of rock: pillar
// walls, hooked banks, a V underneath; the user, 2026-11-03: "these shapes
// are bad").
function outline(top, under = 300, solid = false) {
  const curve = smooth(top);
  const [xl, yl] = top[0];
  const [xr, yr] = top[top.length - 1];
  const span = xr - xl;
  const side = Math.min(110, under * 0.37);
  // How far the rock hangs below the top, across the island (0 at its left
  // end, 1 at its right): the same tapering shape as before.
  const prof = [[0, side], [0.22, under * 0.57], [0.5, under], [0.7, under * 0.63], [1, side]];
  const hang = (t) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [t0, d0] = prof[i];
      const [t1, d1] = prof[i + 1];
      if (t <= t1) return d0 + ((d1 - d0) * (t - t0)) / (t1 - t0);
    }
    return side;
  };
  // Hung from the deepest top nearby, not from one line across the whole
  // island: across a deep pool's basin that line cut through the pool, a
  // wedge of rock in the water and an invisible wall in it.
  const deepest = (x) => Math.max(...curve.filter(([px]) => Math.abs(px - x) < 160).map(([, py]) => py), surfaceY(curve, x));
  // A pool island's underside: one rounded belly under the deep part
  // (the pool and its walls), eased up to each end of the island.
  const lowest = Math.max(...curve.map(([, py]) => py));
  const deep = curve.filter(([, py]) => py >= lowest - 0.5 * (lowest - Math.min(yl, yr)));
  const xa = Math.max(xl + 1, Math.min(...deep.map(([px]) => px)) - 120);
  const xb = Math.min(xr - 1, Math.max(...deep.map(([px]) => px)) + 120);
  const ease = (f) => (1 - Math.cos(Math.PI * f)) / 2;
  // Each end eased up to the lowest ground within 450 px of it, not to the
  // end point itself: where an island ends in a wall (behind a door), that
  // left the wall a thin curled tusk (the user, 2026-11-03: "this looks
  // silly").
  const endL = Math.max(...curve.filter(([px]) => px - xl < 450).map(([, py]) => py));
  const endR = Math.max(...curve.filter(([px]) => xr - px < 450).map(([, py]) => py));
  // The ends stay half as deep as the belly: eased all the way up, the
  // underside climbed under the end and kinked flat (an elbow).
  const tipL = endL + side + 0.5 * Math.max(0, lowest + 90 - endL - side);
  const tipR = endR + side + 0.5 * Math.max(0, lowest + 90 - endR - side);
  const belly = (x) => {
    if (x < xa) return tipL + (lowest + 90 - tipL) * ease((x - xl) / (xa - xl));
    if (x > xb) return tipR + (lowest + 90 - tipR) * ease((xr - x) / (xr - xb));
    return lowest + 90 + 60 * Math.sin((Math.PI * (x - xa)) / (xb - xa));
  };
  const pts = [[xr, yr]];
  const n = Math.max(4, Math.ceil(span / 120));
  if (solid) {
    // Each bottom corner rounded on purpose: the side straight down, a
    // 40 px turn, then the underside (left to the smoothing, the square
    // corner came out with a dip and a lip, an elbow).
    const under = (x) => Math.max(belly(x), surfaceY(curve, x) + 60);
    const yR = under(xr);
    const yL = under(xl);
    const down = (y0, y1) => [0.5, 0.8].map((f) => y0 + (y1 - y0) * f).filter((y) => y1 - y > 30);
    down(yr, yR - 40).forEach((y) => pts.push([xr, y]));
    pts.push([xr, yR - 40], [xr - 12, yR - 12], [xr - 40, yR], [xr - 80, under(xr - 80)]);
    for (let i = 1; i < n; i++) {
      const x = xr - (span * i) / n;
      if (x < xr - 80 && x > xl + 80) pts.push([x, under(x)]);
    }
    pts.push([xl + 80, under(xl + 80)], [xl + 40, yL], [xl + 12, yL - 12], [xl, yL - 40]);
    down(yl, yL - 40).reverse().forEach((y) => pts.push([xl, y]));
  } else {
    for (let i = 0; i <= n; i++) {
      const x = xr - (span * i) / n;
      pts.push([x, deepest(x) + hang((x - xl) / span)]);
    }
  }
  pts.push([xl, yl]);
  const rock = smooth(pts, 24);
  // The curve overshoots past the island's ends where it turns under
  // (about 14 px): kept inside them, or each lip had a little ramp sticking
  // out that kicked him across the gap.
  const below = rock.slice(1, -1).map(([x, y]) => [Phaser.Math.Clamp(x, xl, xr), y]);
  return { curve, shape: curve.concat(below) };
}

// Height of the top curve at x.
function surfaceY(curve, x) {
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i];
    const [x1, y1] = curve[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return curve[curve.length - 1][1];
}

export class BonusRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BonusRoom', physics: { default: 'matter', matter: { gravity: { y: GRAVITY }, debug: false } } });
  }

  init(data) {
    this.levelId = data.levelId;
    this.parentKey = data.parentKey;
    this.test = !!data.test;
    this.inspect = !!data.inspect;
    // Islands with no dressing (index.html?bonusinspect=<id>&bare), to
    // export as the input for a MOSS repaint.
    this.bare = this.inspect && new URLSearchParams(location.search).has('bare');
    this.retry = !!data.retry;     // test mode, starting over: no opening line
    this.room = bonusRoomFor(this.levelId);
    this.leaving = false;
    this.finished = false;
    this.touch = { left: false, right: false, jump: false, down: false };
    this.wet = false;
    this.groundAt = 0;
    this.movedAt = 0;
    this.coinsGot = 0;
    // The scene object is reused for every room: anything a room adds to
    // starts empty here (a room's falls once carried into the next one).
    this.falls = [];
    this.medal = null;
    this.dashUntil = 0;
    this.dashAt = -1e9;
    this.dashDir = 0;
    this.dashAsked = 0;
    this.tapAt = { 1: -1e9, '-1': -1e9 };
    this.tapped = 0;
    this.geyserRide = false;
    this.jumping = false;
    this.touchDoor = false;
    this.touchJump = false;
    this.fullSpeed = 0;            // the way he's rolling at full speed, or 0
    this.dir = 0;                  // the arrows held, for the next physics step
    this.jumpAsked = false;        // a jump pressed since the last step
    this.jumpHeld = false;
    this.grounded = false;
    this.runSpeed = 0;               // runner rooms
    this.boosts = 0;
    this.runSteps = -1;              // physics steps since GO (-1: not yet)
    // A runner room counts down first (the user, 2026-11-03: "start with
    // 'Go Fast!' and then a count down"); `quick` skips it (the test bot).
    this.waiting = !!this.room && !!this.room.runner && !data.quick;
  }

  create() {
    const room = this.room;
    const set = this.cache.json.get(`artset:${room.artset}`) || {};
    this.cameras.main.setBackgroundColor(set.sky || '#02a9fd');
    this.buildBackdrop(set);
    this.ground = [];
    this.islands = room.islands.map((isl, i) => this.buildIsland(isl, i, set));
    // A runner room's higher paths are one way (the user, 2026-11-03: "jump
    // up through the platforms but not down through them"): every path but
    // the lowest lets him pass up through from below and land on top.
    if (room.runner) {
      // (By each one's lowest ground: the last stretch ends in the wall
      // behind the door, high up.)
      const ends = this.islands.map((isl) => Math.max(...isl.curve.map(([, y]) => y)));
      const low = Math.max(...ends);
      this.islands.forEach((isl, i) => {
        if (ends[i] > low - 120) return;
        isl.oneWay = true;
        isl.bodies.forEach((bd) => { bd.oneWay = isl; });
      });
    }
    (room.falls || []).forEach((f) => this.buildFalls(f, set));
    this.geysers = (room.geysers || []).map((g) => this.buildGeyser(g, set));
    this.buildCoins();
    this.rocks = (room.rocks || []).map((r, i) => this.buildRock(r, i, set));
    (room.walls || []).forEach((w, i) => this.buildWall(w, i, set));
    this.bumpers = (room.bumpers || []).map((bd) => this.buildBumper(bd));
    this.pools = (room.pools || []).map((w) => this.buildPool(w, set));
    this.rings = (room.rings || []).map((r) => this.buildRing(r));
    this.unit = this.coins.length ? 'tokens' : 'rings';
    this.buildDoor(set);
    if (room.runner) this.buildRunner(set);
    // Painted islands carry their own plants.
    if (!this.bare && !room.painted) this.dressIslands(set);
    this.buildShaan();
    this.buildHud();
    this.buildControls();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.width, room.height);
    cam.startFollow(this.shaan, true, 0.12, 0.12);
    // The physics, once per Matter step (step()).
    // (Shutting the scene down destroys its world, listener and all.)
    this.matter.world.on('beforeupdate', () => this.step());
    // Rolling into a cracked rock at a run smashes it, no dash needed, and he
    // rolls on through (the contact is cancelled): his Wrecking Ball (the
    // user, 2026-11-04: "Have Shaan plow through the rocks without a dash",
    // "That is wrecking ball", "make it so it works at a run"). Too slow, he
    // bounces off.
    this.matter.world.on('collisionstart', (ev) => ev.pairs.forEach((pair) => {
      const bump = pair.bodyA.bumper || pair.bodyB.bumper;
      if (bump && (pair.bodyA === this.ball || pair.bodyB === this.ball)) { this.bounce(bump); return; }
      const rock = pair.bodyA.rock || pair.bodyB.rock;
      const ball = pair.bodyA === this.ball || pair.bodyB === this.ball;
      if (!rock || !ball || rock.broken) return;
      if (this.lastSpeed >= rock.need) {
        pair.isActive = false;
        this.breakRock(rock);
        this.floatText(rock.x, rock.y - rock.r - 30, `${this.powerName()}!`);
      } else if (this.time.now > (rock.toldAt || 0) + 800) {
        rock.toldAt = this.time.now;
        this.floatText(rock.x, rock.y - rock.r - 30, 'Roll faster!');
      }
    }));
    cam.fadeIn(300, 43, 29, 18);
    if (this.inspect) this.startInspect();
  }

  // Inspection: no Shaan rolling, a marker instead; the panel says where it
  // is and what's under it.
  startInspect() {
    const M = Matter();
    M.Body.setStatic(this.ball, true);
    if (this.intro && this.intro.active) this.intro.destroy();
    const [sx, sy] = this.room.start;
    const m = this.add.container(sx, sy).setDepth(30);
    m.add(this.add.circle(0, 0, 20, 0xff3b6b, 0.85).setStrokeStyle(4, 0xffffff));
    m.add(this.add.circle(0, 0, 3, 0xffffff));
    this.marker = m;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.startFollow(m, true, 0.18, 0.18);
    this.inspectKeys = this.input.keyboard.addKeys('SHIFT,UP,DOWN,LEFT,RIGHT,W,A,S,D');
    // Everything numbered, as the data file has it.
    const tag = (x, y, label, color) => this.add.text(x, y, label, heading(22, '#ffffff', {
      backgroundColor: color, padding: { x: 8, y: 2 },
    })).setOrigin(0.5, 1).setDepth(29);
    this.islands.forEach((isl, i) => tag(isl.left + 50, surfaceY(isl.curve, isl.left + 50) - 50, `island ${i}`, 'rgba(43,29,18,0.85)'));
    (this.room.geysers || []).forEach((g, i) => tag(g.x, g.y - 70, `geyser ${i}`, 'rgba(30,90,140,0.85)'));
    (this.falls || []).forEach((f, i) => tag(f.x + f.w / 2, f.top - 20, `falls ${i}`, 'rgba(30,90,140,0.85)'));
    (this.pools || []).forEach((w, i) => tag(w.x + 80, w.y - 10, `pool ${i}`, 'rgba(30,90,140,0.85)'));
    (this.rocks || []).forEach((r, i) => tag(r.x, r.y - r.r - 10, `rock ${i}`, 'rgba(110,70,40,0.9)'));
    (this.bumpers || []).forEach((b, i) => tag(b.x, b.y - b.r - 10, `bumper ${i}`, 'rgba(170,50,40,0.9)'));
    (this.rings || []).forEach((r, i) => tag(r.x, r.y - r.r - 10, `ring ${i}`, 'rgba(150,110,20,0.9)'));
    (this.pads || []).forEach((pd, i) => tag(pd.x, pd.y - 60, `pad ${i}`, 'rgba(40,130,60,0.9)'));
    (this.stumbles || []).forEach((r, i) => tag(r.x, r.y - 110, `trip rock ${i}`, 'rgba(110,70,40,0.9)'));
    (this.logs || []).forEach((lg, i) => tag(lg.x, lg.y - 165, `log ${i}`, 'rgba(110,70,40,0.9)'));
    (this.fruit || []).forEach((f, i) => tag(f.x, f.y - 30, `fruit ${i}`, 'rgba(170,120,20,0.9)'));
    const panel = this.add.text(14, 112, '', text(16, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.8)', padding: { x: 10, y: 6 }, lineSpacing: 2,
    })).setScrollFactor(0).setDepth(40);
    this.inspectPanel = () => {
      const isl = this.islandAt(m.x, m.y);
      const i = isl ? this.islands.indexOf(isl) : -1;
      panel.setText(`Inspection: x ${Math.round(m.x)}, y ${Math.round(m.y)}${i >= 0 ? `   (over island ${i})` : ''}
Drag, or arrows / WASD (Shift is faster)
Zoom ${Math.round(cam.zoom * 100)}%: mouse wheel, + and -, or the buttons`);
    };
    this.inspectPanel();
    this.inspectZoom(panel);
    this.input.on('pointermove', (pt) => {
      if (!pt.isDown) return;
      m.x = Phaser.Math.Clamp(m.x - (pt.x - pt.prevPosition.x) / cam.zoom, 0, this.room.width);
      m.y = Phaser.Math.Clamp(m.y - (pt.y - pt.prevPosition.y) / cam.zoom, 0, this.room.height);
      this.inspectPanel();
    });
  }

  // Zoom as in the levels' inspection (Platformer.js inspectZoomSetup): the
  // main camera zooms round the marker, anything fixed to the screen goes to
  // a second camera that never zooms.
  inspectZoom(panel) {
    const main = this.cameras.main;
    main.setBounds(-2000, -2000, this.room.width + 4000, this.room.height + 4000);
    const ui = this.cameras.add(0, 0, main.width, main.height);
    const sorted = new WeakSet();
    let seen = -1;
    const sort = () => {
      const list = this.children.list;
      if (list.length === seen) return;
      seen = list.length;
      list.forEach((o) => {
        if (sorted.has(o)) return;
        sorted.add(o);
        if (o.scrollFactorX === 0 && o.scrollFactorY === 0) main.ignore(o);
        else ui.ignore(o);
      });
    };
    this.events.on('prerender', sort);
    this.events.once('shutdown', () => this.events.off('prerender', sort));
    const zoomBy = (f) => {
      let z = Phaser.Math.Clamp(main.zoom * f, 0.1, 2);
      if (Math.abs(z - 1) < 0.1) z = 1;
      main.setZoom(z);
      this.inspectPanel();
    };
    this.input.on('wheel', (pt, over, dx, dy) => zoomBy(dy > 0 ? 1 / 1.15 : 1.15));
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard.on('keydown', (e) => {
      if ([K.PLUS, K.NUMPAD_ADD].includes(e.keyCode) || e.key === '=' || e.key === '+') zoomBy(1.25);
      else if ([K.MINUS, K.NUMPAD_SUBTRACT].includes(e.keyCode) || e.key === '-') zoomBy(1 / 1.25);
    });
    const button = (x, label, f) => {
      const b = this.add.text(x, panel.y + panel.height + 10, label, heading(30, '#ffffff', {
        backgroundColor: 'rgba(43,29,18,0.8)', padding: { x: 16, y: 2 },
      })).setScrollFactor(0).setDepth(40).setInteractive({ useHandCursor: true });
      b.on('pointerdown', (pt, lx, ly, ev) => { ev.stopPropagation(); zoomBy(f); });
      return b;
    };
    const minus = button(14, '\u2212', 1 / 1.25);
    button(minus.x + minus.width + 10, '+', 1.25);
    sort();
  }

  inspectUpdate(delta) {
    const k = this.inspectKeys;
    const speed = (k.SHIFT.isDown ? 1800 : 600) * (delta / 1000) / Math.max(0.5, this.cameras.main.zoom);
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const m = this.marker;
    m.x = Phaser.Math.Clamp(m.x + dx * speed, 0, this.room.width);
    m.y = Phaser.Math.Clamp(m.y + dy * speed, 0, this.room.height);
    if (dx || dy) this.inspectPanel();
  }

  // The cove's own backdrop pieces, far off, and a mist where the bottom
  // would be.
  buildBackdrop(set) {
    const bg = set.background && set.background[0];
    if (bg) {
      const sf = bg.scroll || 0.3;
      const s = (MAP_H + (this.room.height - MAP_H) * sf) / bg.h;
      const need = MAP_W + (this.room.width - MAP_W) * sf;
      for (let i = 0, x = 0; x < need && i < bg.pieces.length; i++, x += bg.piece_w * s) {
        const key = texKey(this.room.artset, bg.pieces[i]);
        if (this.textures.exists(key)) this.add.image(x, 0, key).setOrigin(0).setScale(s).setScrollFactor(sf).setDepth(-10);
      }
    }
    if (this.room.mist === false) return;
    const g = this.add.graphics().setDepth(6);
    const top = this.room.height - 420;
    g.fillGradientStyle(0xdff4ff, 0xdff4ff, 0xdff4ff, 0xdff4ff, 0, 0, 0.85, 0.85);
    g.fillRect(0, top, this.room.width, 420);
  }

  // One island: its rock drawn on a canvas (the cove's rock, the moss along
  // its top) and its outline as a chain of thin static boxes.
  buildIsland(isl, i, set) {
    const pooled = (this.room.pools || []).some((w) => w.x < isl.top[isl.top.length - 1][0] && w.x + w.w > isl.top[0][0]);
    const { curve, shape } = outline(isl.top, isl.under, pooled);
    const pad = 70;
    const xs = shape.map((p) => p[0]);
    const ys = shape.map((p) => p[1]);
    // On the art's pixel grid, or every column of grass lands blurred
    // between two pixels.
    const x0 = Math.floor((Math.min(...xs) - pad) / ART_PX) * ART_PX;
    const y0 = Math.floor((Math.min(...ys) - pad) / ART_PX) * ART_PX;
    const w = Math.ceil(Math.max(...xs) + pad - x0);
    const h = Math.ceil(Math.max(...ys) + pad - y0);
    const key = `bonus-island-${this.levelId}-${i}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.translate(-x0, -y0);
    const path = () => {
      ctx.beginPath();
      shape.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    const img = (file) => {
      const k = file && texKey(this.room.artset, file);
      return k && this.textures.exists(k) ? this.textures.get(k).getSourceImage() : null;
    };
    // The set's ground skin (its rock, moss and the moss's end pieces), as
    // the levels draw their ground (Platformer.js drawSkin).
    const skin = set.skin || (Object.values(set.sets || {}).find((g) => g.skin) || {}).skin || {};
    const rock = img(skin.rock || 'sk_rock.png');
    path();
    if (rock) {
      const pat = ctx.createPattern(rock, 'repeat');
      // 1:1 like the levels' tiles, and not smoothed: pixel art.
      ctx.imageSmoothingEnabled = false;
      pat.setTransform(new DOMMatrix().translate(x0, y0));
      ctx.fillStyle = pat;
    } else ctx.fillStyle = '#8a7a63';
    ctx.fill();
    // Darker toward the tapering underside.
    const low = Math.max(...isl.top.map((p) => p[1]));
    const shade = ctx.createLinearGradient(0, low - 40, 0, low + 300);
    shade.addColorStop(0, 'rgba(30,18,10,0)');
    shade.addColorStop(1, 'rgba(30,18,10,0.6)');
    path();
    ctx.fillStyle = shade;
    ctx.fill();

    // The top, a bit of curve at a time; grass only where it's gentle (the
    // user's notes, 2026-11-03: it ran up the walls as a green band, and
    // fanned out into spikes round the tight bends).
    const segs = [];
    for (let k = 0; k < curve.length - 1; k++) {
      const [ax, ay] = curve[k];
      const [bx, by] = curve[k + 1];
      const a = Math.atan2(by - ay, bx - ax);
      segs.push({ ax, ay, bx, by, a, len: Math.hypot(bx - ax, by - ay), grass: Math.abs(a) <= GRASS_STEEPEST });
    }
    // The rounded corner and the grass's end pieces fit a flat, grassy end
    // only: on a slope rock showed above the piece's rounded corner, and on a
    // bare steep tip the step left stray outline pixels in the air.
    const flat = (g) => g.grass && Math.abs(g.a) < 0.3;
    const roundL = flat(segs[0]);
    const roundR = flat(segs[segs.length - 1]);
    // The steep bare faces, each whole (the top comes in short pieces).
    const faces = [];
    segs.forEach((g) => {
      if (g.grass) return;
      const f = faces[faces.length - 1];
      if (f && Math.abs(f.bx - g.ax) < 1 && Math.abs(f.by - g.ay) < 1) { f.bx = g.bx; f.by = g.by; f.len += g.len; f.pts.push([g.bx, g.by]); }
      else faces.push({ ...g, pts: [[g.ax, g.ay], [g.bx, g.by]] });
    });
    // Dressed as the levels' rock walls are (the user's note, 2026-11-03:
    // "this needs better dressing"): shaded in from the edge (the skin's
    // edge pieces, dark at the edge fading in), and leaves clinging to the
    // face inside the rock, as on the levels' side tiles, cut off by the
    // outline and fading out toward the inside. Never vines: in the levels
    // the vine strand is the climbing vine.
    ctx.save();
    path();
    ctx.clip();
    ctx.lineCap = 'round';
    [[44, 0.1], [28, 0.12], [14, 0.16]].forEach(([wid, al]) => {
      ctx.lineWidth = wid;
      ctx.strokeStyle = `rgba(30,18,24,${al})`;
      faces.forEach((f) => {
        ctx.beginPath();
        f.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
    });
    const leaves = ((set.dressing || {}).ground_plants || []).filter((f) => /leaf|grass/.test(f)).map((f) => img(f)).filter(Boolean)
      .map((im) => {
        // Faded out over its lower half, so no flat bottom shows on the rock.
        const c = document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const cc = c.getContext('2d');
        cc.drawImage(im, 0, 0);
        cc.globalCompositeOperation = 'destination-in';
        const fade = cc.createLinearGradient(0, 0, 0, im.height);
        fade.addColorStop(0.45, 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        cc.fillStyle = fade;
        cc.fillRect(0, 0, im.width, im.height);
        return c;
      });
    if (leaves.length && !this.bare) {
      let n = 0;
      faces.forEach((f, fi) => {
        if (f.len < 40) return;
        // A face falling to the right has its rock on the left.
        const out = (f.by > f.ay) === (f.bx > f.ax) ? 1 : -1;
        let d = 0;
        let at = 24 + ((fi * 37 + i * 11) % 30);
        for (let k = 1; k < f.pts.length; k++) {
          const [ax, ay] = f.pts[k - 1];
          const [bx, by] = f.pts[k];
          const l = Math.hypot(bx - ax, by - ay);
          while (at <= d + l) {
            const t = (at - d) / Math.max(1e-6, l);
            const x = ax + (bx - ax) * t;
            const y = ay + (by - ay) * t;
            const lf = leaves[(n++ * 7 + fi) % leaves.length];
            ctx.save();
            ctx.translate(Math.round((x - out * lf.width * 0.18) / ART_PX) * ART_PX, Math.round((y - lf.height * 0.35) / ART_PX) * ART_PX);
            if (out < 0) ctx.scale(-1, 1);
            ctx.drawImage(lf, -lf.width / 2, 0);
            ctx.restore();
            at += 70 + ((n * 23) % 40);
          }
          d += l;
        }
      });
    }
    ctx.restore();

    // The outline: round the sides and the underside, and along the top
    // only where there's no grass (along the grass it ran as a dark line
    // over it). The levels' outline colour.
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // (The sides stop short of the top: there the corner is stepped, as
    // below; run all the way up, the outline poked up past the grass.)
    for (let k = curve.length - 1; k < shape.length; k++) {
      const [x, y] = shape[k];
      if (k === curve.length - 1) ctx.moveTo(x, y + (roundR ? CORNER : 0)); else ctx.lineTo(x, y);
    }
    ctx.lineTo(shape[0][0], shape[0][1] + (roundL ? CORNER : 0));
    ctx.stroke();
    // The top corners rounded as the levels' tiles are (Platformer.js
    // skinEdgeTile): 3, then 2, then 1 art pixels cleared on the top rows,
    // an outline pixel at the end of each, the grass's end piece over it
    // (the user's note, 2026-11-03: "look at the corners").
    const corner = (cx, cy, left) => {
      const y0 = Math.round(cy / ART_PX) * ART_PX;
      const x0 = Math.round(cx / ART_PX) * ART_PX;
      [3, 2, 1].forEach((n, row) => {
        const y = y0 + row * ART_PX;
        if (left) {
          ctx.clearRect(x0 - ART_PX, y, (n + 1) * ART_PX, ART_PX);
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x0 + n * ART_PX - ART_PX, y, ART_PX, ART_PX);
        } else {
          ctx.clearRect(x0 - n * ART_PX, y, (n + 1) * ART_PX, ART_PX);
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x0 - n * ART_PX, y, ART_PX, ART_PX);
        }
      });
      // the side's outline picks up under the step
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(left ? x0 - ART_PX : x0 - ART_PX, y0 + 3 * ART_PX, ART_PX, CORNER - 3 * ART_PX + 4);
    };
    if (roundL) corner(curve[0][0], curve[0][1], true);
    if (roundR) corner(curve[curve.length - 1][0], curve[curve.length - 1][1], false);
    segs.filter((g) => !g.grass).forEach((g) => {
      ctx.beginPath();
      ctx.moveTo(g.ax, g.ay);
      ctx.lineTo(g.bx, g.by);
      ctx.stroke();
    });

    // The grass, never rotated (rotated, the pixel art went blurry and
    // jagged, fanned into spikes on bends and smeared in hollows: the
    // user, 2026-11-03, "it looks worse now"). Instead, as 2D games draw
    // slopes: the strip in columns one art pixel wide, each moved up or down
    // onto the curve and snapped to the art's pixel grid, so it stays as
    // crisp as the levels' tiles. Only on a top gentle enough for that
    // (GRASS_STEEPEST); steeper is bare rock with the outline. Each run
    // starts and ends with the set's end pieces, in columns too, and the
    // whole run is kept inside the rock.
    const moss = img(skin.moss || 'sk_moss.png');
    const capL = img(skin.moss_left || 'sk_moss_left.png');
    const capR = img(skin.moss_right || 'sk_moss_right.png');
    const top = skin.moss_top ?? 16;
    const runs = [];
    segs.forEach((g, k) => {
      if (!g.grass) return;
      const last = runs[runs.length - 1];
      if (last && last.end === k - 1) { last.xb = g.bx; last.end = k; } else runs.push({ xa: g.ax, xb: g.bx, start: k, end: k });
    });
    if (moss) {
      // First, nothing of the rock above the grass: its smoothed edge
      // peeked out as a thin grey line along the top of some ends.
      runs.forEach((run) => {
        const xa = Math.round(run.xa / ART_PX) * ART_PX;
        const xb = Math.round(run.xb / ART_PX) * ART_PX;
        for (let x = xa; x < xb; x += ART_PX) {
          const ground = Math.min(surfaceY(curve, x), surfaceY(curve, x + ART_PX));
          const y = Math.floor((ground - top - 1) / ART_PX) * ART_PX;
          // Not at the foot of a wall: there the band cut a notch out of
          // the wall itself (Shark Dash Rings' pool floors).
          const nearWall = [-24, -12, 12, 24].some((d) => surfaceY(curve, x + d) < ground - 12);
          if (!nearWall) ctx.clearRect(x, y + top - 24, ART_PX, 24);
        }
      });
      ctx.save();
      path();
      ctx.clip();
      runs.forEach((run) => {
        const xa = Math.round(run.xa / ART_PX) * ART_PX;
        const xb = Math.round(run.xb / ART_PX) * ART_PX;
        // End pieces only on flat ends where the ground drops away (the
        // island's ends, a ledge's edge), not against a wall rising beside
        // the grass: rounded off there, they left a notch at the foot of
        // each pool wall.
        const fits = capL && capR && xb - xa >= capL.width + capR.width;
        const before = segs[run.start - 1];
        const after = segs[run.end + 1];
        const capsL = fits && flat(segs[run.start]) && !(before && before.by > before.ay);
        const capsR = fits && flat(segs[run.end]) && !(after && after.by < after.ay);
        for (let x = xa; x < xb; x += ART_PX) {
          // At the column's highest ground, rounded up: rounded to the
          // nearest, a sliver of the rock's sloping edge showed above it.
          const ground = Math.min(surfaceY(curve, x), surfaceY(curve, x + ART_PX));
          // (and a pixel up: level with the rock's edge, its smoothing
          // showed as a thin grey line along the top)
          const y = Math.floor((ground - top - 1) / ART_PX) * ART_PX;
          let src = moss;
          let sx = (x - xa) % moss.width;
          if (capsL && x - xa < capL.width) { src = capL; sx = x - xa; }
          else if (capsR && xb - x <= capR.width) { src = capR; sx = capR.width - (xb - x); }
          ctx.drawImage(src, sx, 0, ART_PX, src.height, x, y, ART_PX, src.height);
        }
      });
      ctx.restore();
    }
    tex.refresh();
    // A room with painted islands shows those instead (the same size and
    // place as this canvas, so the ground under him is unchanged).
    const p = this.room.painted;
    const painted = (p === true || (Array.isArray(p) && p.includes(i))) && !this.bare && texKey(this.room.artset, `bonus/${this.levelId}-island-${i}.png`);
    // (Only while it still fits, as a check: an island reshaped since its
    // painting comes off the room's `painted` list until it is repainted.)
    const fits = painted && this.textures.exists(painted)
      && this.textures.get(painted).getSourceImage().width === w && this.textures.get(painted).getSourceImage().height === h;
    this.add.image(x0, y0, fits ? painted : key).setOrigin(0).setDepth(2);

    // The body: each edge of the outline a box on the inside of it.
    const firstBody = this.ground.length;
    const topEdges = curve.length - 1;
    for (let k = 0; k < shape.length; k++) {
      const [ax, ay] = shape[k];
      const [bx, by] = shape[(k + 1) % shape.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 0.5) continue;
      // Not the underside right under the top's two ends: those boxes' top
      // corners poked a few px above the ground at the very end, a step that
      // stopped him dead rolling back over it (knocked back by a bumper).
      // The top's own thick boxes cover those sides.
      if (k >= topEdges) {
        const [lx, ly] = curve[0];
        const [rx, ry] = curve[curve.length - 1];
        const nearL = Math.abs(ax - lx) < 60 && ay < ly + 90;
        const nearR = Math.abs(ax - rx) < 60 && ay < ry + 90;
        if (nearL || nearR) continue;
      }
      const a = Math.atan2(by - ay, bx - ax);
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      // No thicker than the island's own rock at its thinnest (its ends): on
      // Roll Run's thin stacked ramps 150 hung below one ramp into the gap
      // over the next, and he wedged between them.
      const depth = k < topEdges ? Math.min(GROUND_DEPTH, Math.max(40, Math.min(110, (isl.under || 300) * 0.37))) : UNDER_DEPTH;
      const b = this.matter.add.rectangle((ax + bx) / 2 + nx * depth / 2, (ay + by) / 2 + ny * depth / 2,
        len + 4, depth, { isStatic: true, angle: a, friction: 0.9, label: 'ground' });
      this.ground.push(b);
    }
    return { curve, left: isl.top[0][0], right: isl.top[isl.top.length - 1][0], faces, shape, bodies: this.ground.slice(firstBody) };
  }

  // The set's ground plants (artset dressing.ground_plants), the same every
  // time: some on the gentle grass, as the levels scatter them
  // (ground_chance), and leafy ones growing out of the steep faces, leaning
  // out over the drop. Clear of the geysers, falls, rocks, bumpers, pools
  // and the door, and behind Shaan.
  dressIslands(set) {
    const dr = set.dressing || {};
    // (In a runner room no rocks among them: only the ones that trip him.)
    const all = (dr.ground_plants || []).filter((f) => this.textures.exists(texKey(this.room.artset, f)) && !(this.room.runner && /rock/.test(f)));
    if (!all.length) return;
    const leafy = all.filter((f) => /leaf|bush_(small|medium)|grass/.test(f));
    const chance = dr.ground_chance ?? 0.22;
    const busy = [
      ...(this.room.geysers || []).map((g) => g.x),
      ...(this.falls || []).flatMap((f) => [f.x, f.x + f.w]),
      ...(this.rocks || []).map((r) => r.x),
      ...(this.bumpers || []).map((b) => b.x),
      this.doorAt.x,
    ];
    const clear = (x, y, d) => !busy.some((b) => Math.abs(b - x) < d)
      && !(this.pools || []).some((w) => x > w.x - 40 && x < w.x + w.w + 40 && y > w.y - 80);
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const put = (files, x, y, flip) => this.add.image(Math.round(x / ART_PX) * ART_PX, Math.round(y / ART_PX) * ART_PX,
      texKey(this.room.artset, files[Math.floor(rand() * files.length)])).setOrigin(0.5, 1).setDepth(2.5).setFlipX(flip);
    this.islands.forEach((isl) => {
      for (let x = isl.left + 90; x < isl.right - 90; x += 70) {
        if (rand() > chance * 1.6) continue;
        const y = surfaceY(isl.curve, x);
        if (!clear(x, y, 140)) continue;
        if (Math.abs(Math.atan2(surfaceY(isl.curve, x + 20) - surfaceY(isl.curve, x - 20), 40)) > 0.35) continue;
        put(all, x, y + 8, rand() > 0.5);
        x += 60;
      }
      // The fan-shaped ones: their narrow base hides in the rock.
      const fans = leafy.filter((f) => /leaf|grass/.test(f));
      if (!fans.length) return;
      // Plants also grow out of the steep faces: the whole base on the
      // rock, just inside the edge (stood on the edge they sat on shelves in
      // the air; tucked behind it only their tips showed). Where a face is
      // too sheer or too thin for one, it has only its clinging leaves.
      const { faces } = isl;
      // Where a plant's bottom rows have leaves, left to right.
      const feet = {};
      const foot = (key) => {
        if (feet[key]) return feet[key];
        const im = this.textures.get(key).getSourceImage();
        const c = document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const cx2 = c.getContext('2d');
        cx2.drawImage(im, 0, 0);
        const d = cx2.getImageData(0, im.height - 4, im.width, 4).data;
        let l = im.width;
        let r = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 40) { const x = (i >> 2) % im.width; l = Math.min(l, x); r = Math.max(r, x); }
        return (feet[key] = [l, r]);
      };
      const inside = (poly, px, py) => {
        let hit = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i];
          const [xj, yj] = poly[j];
          if ((yi > py) !== (yj > py) && px < xi + ((py - yi) * (xj - xi)) / (yj - yi)) hit = !hit;
        }
        return hit;
      };
      // Where the face is at height y (the end nearest, past either end).
      const faceX = (f, y) => {
        const pts = f.pts[0][1] < f.pts[f.pts.length - 1][1] ? f.pts : [...f.pts].reverse();
        if (y <= pts[0][1]) return pts[0][0];
        for (let k = 1; k < pts.length; k++) {
          const [ax, ay] = pts[k - 1];
          const [bx, by] = pts[k];
          if (y <= by) return ax + (bx - ax) * ((y - ay) / Math.max(1e-6, by - ay));
        }
        return pts[pts.length - 1][0];
      };
      faces.forEach((f) => {
        if (f.len < 60) return;
        if (Math.abs(Math.atan2(Math.abs(f.by - f.ay), Math.abs(f.bx - f.ax))) > 1.2) return;
        // A face falling to the right has its rock on the left.
        const out = (f.by > f.ay) === (f.bx > f.ax) ? 1 : -1;
        const n = Math.max(1, Math.round(f.len / 110));
        for (let k = 0; k < n; k++) {
          if (rand() > 0.8) continue;
          const x = f.ax + (f.bx - f.ax) * ((k + 0.3 + rand() * 0.4) / n);
          const y = surfaceY(isl.curve, x);
          if (!clear(x, y, 40)) continue;
          const key = texKey(this.room.artset, fans[Math.floor(rand() * fans.length)]);
          const { width: w, height: h } = this.textures.get(key).getSourceImage();
          // As shallow as it can sit with its base row in the rock, or it
          // shows as a flat edge in the air (at a face's top end, by the
          // waterfall).
          const [l, r] = foot(key);
          const spot = [0.15, 0.25, 0.35, 0.5].map((sink) => {
            const yb = y + h * sink;
            // Its base's outer end just inside the face (flipped, the
            // picture's right end is still the outer one).
            return [faceX(f, yb) - out * (r - w / 2 + 4), yb];
          }).find(([cx, yb]) => [l, (l + r) / 2, r].every((u) => inside(isl.shape, cx - w / 2 + (out < 0 ? w - u : u), yb - 4)));
          if (!spot) continue;
          const [cx, yb] = spot;
          this.add.image(Math.round(cx / ART_PX) * ART_PX, Math.round(yb / ART_PX) * ART_PX, key)
            .setOrigin(0.5, 1).setDepth(2.5).setFlipX(out < 0);
        }
      });
    });
  }

  // How steep the ground is under x, as an angle (down to the right is
  // positive), or null where there's no island.
  slopeAt(x, y) {
    const isl = this.islandAt(x, y);
    if (!isl) return null;
    return Math.atan2(surfaceY(isl.curve, x + 10) - surfaceY(isl.curve, x - 10), 20);
  }

  // The island under x, for coins and the door. With ramps stacked over
  // each other (Roll Run) give y too: the one whose top is at or just below
  // it, else the nearest.
  islandAt(x, y = null) {
    const here = this.islands.filter((isl) => x >= isl.left && x <= isl.right);
    if (y === null || here.length < 2) return here[0] || null;
    const below = here.map((isl) => ({ isl, d: surfaceY(isl.curve, x) - y })).filter((h) => h.d >= -80);
    const pick = (below.length ? below : here.map((isl) => ({ isl, d: Math.abs(surfaceY(isl.curve, x) - y) })))
      .sort((a, b) => a.d - b.d)[0];
    return pick.isl;
  }

  // An upward waterfall: the cove's falls, flowing up.
  buildFalls(f, set) {
    const k = set.water && set.water.falls && texKey(this.room.artset, set.water.falls);
    const h = f.bottom - f.top;
    const body = k && this.textures.exists(k)
      ? this.add.tileSprite(f.x + f.w / 2, f.top + h / 2, f.w, h, k)
      : this.add.rectangle(f.x + f.w / 2, f.top + h / 2, f.w, h, 0x5fc8f0);
    body.setAlpha(0.88).setDepth(1);
    const cap = this.add.ellipse(f.x + f.w / 2, f.top, f.w * 1.3, 40, 0xffffff, 0.75).setDepth(1.5);
    this.tweens.add({ targets: cap, scaleX: 1.15, scaleY: 0.8, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    f.sprite = body;
    this.falls = (this.falls || []).concat(f);
  }

  // A geyser: a dark hole, a little bubbling, and a spout when he's in it.
  buildGeyser(gy, set) {
    const k = set.water && set.water.falls && texKey(this.room.artset, set.water.falls);
    this.add.ellipse(gy.x, gy.y + 4, 84, 22, 0x1b120b).setDepth(2.5);
    const spout = k && this.textures.exists(k)
      ? this.add.tileSprite(gy.x, gy.y - 24, 56, 30, k)
      : this.add.rectangle(gy.x, gy.y - 24, 56, 30, 0x9be2ff);
    spout.setOrigin(0.5, 0).setDepth(2.6).setAlpha(0.9);
    const foam = this.add.ellipse(gy.x, gy.y - 24, 70, 26, 0xffffff, 0.8).setDepth(2.7);
    this.tweens.add({ targets: [foam], scaleX: 1.2, scaleY: 0.7, duration: 260, yoyo: true, repeat: -1 });
    // Launch speed to rise `height`: v^2 = 2 g h, g per step (Matter's 0.001 scale).
    const g = GRAVITY * 0.001 * (1000 / 60) ** 2;
    return { ...gy, spout, foam, speed: Math.sqrt(2 * g * gy.height), readyAt: 0 };
  }

  coinSpots() {
    const spots = [];
    this.room.coins.forEach((c) => {
      if (c.points) { c.points.forEach((p) => spots.push(p.slice())); return; }
      const n = c.n;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        if (c.arc) {
          const [ax, ay, bx, by] = c.arc;
          spots.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(Math.PI * t) * c.peak]);
        } else if (c.line) {
          const [ax, ay, bx, by] = c.line;
          spots.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
        } else {
          const isl = this.islands[c.along];
          const x = c.from + (c.to - c.from) * t;
          spots.push([x, surfaceY(isl.curve, x) - 70]);
        }
      }
    });
    return spots;
  }

  buildCoins() {
    const key = tokenIcon(this);
    this.coins = this.coinSpots().map(([x, y], i) => {
      const s = this.add.image(x, y, key).setDepth(4).setScale(1.1);
      this.tweens.add({ targets: s, scaleX: 0.25, duration: 520, yoyo: true, repeat: -1, delay: (i % 6) * 90, ease: 'Sine.InOut' });
      return s;
    });
  }

  // A wall of rock (Roll Run's cliffs): x, y, w, h, drawn from the set's
  // rock like the islands.
  buildWall(w, i, set) {
    const key = `bonus-wall-${this.levelId}-${i}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, w.w, w.h);
    const ctx = tex.getContext();
    const skin = set.skin || {};
    const rk = texKey(this.room.artset, skin.rock || 'sk_rock.png');
    if (this.textures.exists(rk)) {
      const pat = ctx.createPattern(this.textures.get(rk).getSourceImage(), 'repeat');
      pat.setTransform(new DOMMatrix().translate(-w.x, -w.y).scale(0.75));
      ctx.fillStyle = pat;
    } else ctx.fillStyle = '#8a7a63';
    ctx.fillRect(0, 0, w.w, w.h);
    ctx.fillStyle = 'rgba(30,18,10,0.25)';
    ctx.fillRect(0, 0, w.w, w.h);
    ctx.strokeStyle = '#2b1d12';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w.w - 6, w.h - 6);
    tex.refresh();
    this.add.image(w.x, w.y, key).setOrigin(0).setDepth(2.2);
    const body = this.matter.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, { isStatic: true, friction: 0.2, label: 'wall' });
    return body;
  }

  // A bumper on the ground (x on island `on`, or at x, y): a round pad that
  // bounces him away when he touches it.
  buildBumper(bd) {
    const r = bd.r || 45;
    const isl = bd.on !== undefined ? this.islands[bd.on] : null;
    const y = bd.y !== undefined ? bd.y : (isl ? surfaceY(isl.curve, bd.x) : 900) - r + 4;
    const g = this.add.graphics().setDepth(3.5).setPosition(bd.x, y);
    g.fillStyle(COLORS.ink, 1).fillCircle(3, 4, r + 2);
    g.fillStyle(0xe8553d, 1).fillCircle(0, 0, r);
    g.fillStyle(0xffc93c, 1).fillCircle(0, 0, r * 0.62);
    g.fillStyle(0xffffff, 0.8).fillCircle(-r * 0.25, -r * 0.3, r * 0.18);
    g.lineStyle(5, COLORS.ink, 1).strokeCircle(0, 0, r);
    const body = this.matter.add.circle(bd.x, y, r, { isStatic: true, restitution: 1, label: 'bumper' });
    const bump = { x: bd.x, y, r, g, body };
    body.bumper = bump;
    return bump;
  }

  // Off a bumper: away from its middle, at BUMP, and a little up.
  bounce(bump) {
    const b = this.ball;
    const dx = b.position.x - bump.x;
    const dy = b.position.y - bump.y;
    const d = Math.hypot(dx, dy) || 1;
    this.dashUntil = 0;
    this.fullSpeed = 0;
    // Straight back the way he came, full strength, and a hop up; and the
    // arrows can't fight it for a moment (holding forward cut the knock to
    // a nudge).
    const back = Math.sign(dx) || -Math.sign(b.velocity.x) || -1;
    this.bumpedUntil = this.time.now + 500;
    // His spin turned round with him: still spinning the old way, the
    // ground's grip stopped him dead the moment he touched down.
    this.time.delayedCall(0, () => {
      Matter().Body.setVelocity(b, { x: back * BUMP, y: -BUMP_UP });
      Matter().Body.setAngularVelocity(b, (back * BUMP) / RADIUS);
    });
    audio.sfx(this, 'jump');
    this.tweens.killTweensOf(bump.g);
    bump.g.setScale(1);
    this.tweens.add({ targets: bump.g, scale: 1.25, duration: 90, yoyo: true });
  }

  // A cracked rock sitting on the ground at x: the set's rock, cracked,
  // drawn once on a canvas (a stand-in until Chris draws one). Its coins
  // wait inside, hidden, and pop out along the way ahead when it breaks.
  buildRock(rd, i, set) {
    const r = rd.r || 70;
    const isl = rd.on !== undefined ? this.islands[rd.on] : this.islandAt(rd.x);
    const y = (isl ? surfaceY(isl.curve, rd.x) : 900) - r + 6;
    const key = `bonus-rock-${this.levelId}-${i}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const D = r * 2 + 12;
    const tex = this.textures.createCanvas(key, D, D);
    const ctx = tex.getContext();
    const c = D / 2;
    const skin = set.skin || {};
    const rk = texKey(this.room.artset, skin.rock || 'sk_rock.png');
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    if (this.textures.exists(rk)) {
      const pat = ctx.createPattern(this.textures.get(rk).getSourceImage(), 'repeat');
      pat.setTransform(new DOMMatrix().translate(i * 97, i * 53).scale(0.6));
      ctx.fillStyle = pat;
    } else ctx.fillStyle = '#8a7a63';
    ctx.fill();
    const shade = ctx.createRadialGradient(c - r * 0.35, c - r * 0.35, r * 0.2, c, c, r);
    shade.addColorStop(0, 'rgba(255,240,210,0.25)');
    shade.addColorStop(1, 'rgba(30,18,10,0.55)');
    ctx.fillStyle = shade;
    ctx.fill();
    // The cracks: a few jagged lines out from near the middle.
    ctx.strokeStyle = '#1b120b';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + i;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r * 0.1, c + Math.sin(a) * r * 0.1);
      for (let s = 1; s <= 4; s++) {
        const w = (s % 2 ? 0.25 : -0.25);
        ctx.lineTo(c + Math.cos(a + w) * r * s * 0.22, c + Math.sin(a + w) * r * s * 0.22);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.stroke();
    tex.refresh();
    const sprite = this.add.image(rd.x, y, key).setDepth(3);
    const body = this.matter.add.circle(rd.x, y, r, { isStatic: true, friction: 0.5, label: 'rock' });
    const rock = { x: rd.x, y, r, need: r * BREAK_PER_RADIUS, sprite, body, broken: false, coins: [] };
    body.rock = rock;
    // Its coins: hidden inside until it breaks, then out along the ground
    // ahead of it, where he's rolling.
    const ckey = tokenIcon(this);
    const n = rd.coins || 4;
    for (let k = 0; k < n; k++) {
      // Well ahead, and live from the moment they fly: at full speed he
      // passed spots close by before the coins got there.
      const tx = rd.x + r + 220 + k * 80;
      const ti = isl && tx <= isl.right && tx >= isl.left ? isl : this.islandAt(tx, y);
      const ty = (ti ? surfaceY(ti.curve, tx) : y) - 70;
      const coin = this.add.image(rd.x, y, ckey).setDepth(4).setScale(1.1).setVisible(false);
      coin.hidden = true;
      coin.to = [tx, ty];
      rock.coins.push(coin);
      this.coins.push(coin);
    }
    return rock;
  }

  breakRock(rock) {
    rock.broken = true;
    rock.body.isSensor = true;
    this.time.delayedCall(0, () => this.matter.world.remove(rock.body));
    rock.sprite.setVisible(false);
    audio.sfx(this, 'crate');
    this.cameras.main.shake(140, 0.006);
    // Chunks flying off.
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI * (0.1 + 0.8 * Math.random());
      const chunk = this.add.circle(rock.x, rock.y, 8 + Math.random() * 10, 0x8a7a63).setStrokeStyle(3, COLORS.ink).setDepth(4);
      const d = rock.r * (1.2 + Math.random());
      this.tweens.add({
        targets: chunk, x: rock.x + Math.cos(a) * d * 2, y: rock.y + Math.sin(a) * d + 260, alpha: 0, angle: 360,
        duration: 700 + Math.random() * 300, ease: 'Quad.In', onComplete: () => chunk.destroy(),
      });
    }
    // Its coins pop out along the way ahead.
    rock.coins.forEach((coin, k) => {
      coin.setVisible(true);
      coin.hidden = false;
      this.tweens.add({
        targets: coin, x: coin.to[0], y: coin.to[1], duration: 260, delay: k * 40, ease: 'Back.Out',
        onComplete: () => {
          if (coin.got) return;
          this.tweens.add({ targets: coin, scaleX: 0.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        },
      });
    });
  }

  // The Z-Power's name as it fires (zebonky.com's Z-Stats; the user,
  // 2026-11-04: "Shaan gets wrecking ball in their bonus level and
  // charlie's speed boost is hyper dash"). Shaan's Wrecking Ball is
  // plowing through the cracked rocks (shown over each rock he smashes);
  // Charlie's Hyper Dash is his fruit boost (shown over him, callPower).
  // A room can name its own (`power`).
  powerName() {
    return this.room.power || (this.room.runner ? 'Hyper Dash' : 'Wrecking Ball');
  }

  callPower() {
    const b = this.ball;
    this.floatText(b.position.x, b.position.y - RADIUS - 50, `${this.powerName()}!`);
  }

  floatText(x, y, msg) {
    const t = this.add.text(x, y, msg, heading(28, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 7 }))
      .setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => t.destroy() });
  }

  buildDoor(set) {
    const d = this.room.door;
    const isl = d.on !== undefined ? this.islands[d.on] : this.islandAt(d.x);
    const y = isl ? surfaceY(isl.curve, d.x) : 880;
    const db = set.door_bonus;
    const k = db && texKey(this.room.artset, db.file);
    this.door = k && this.textures.exists(k)
      ? this.add.sprite(d.x, y + 6, k, 0).setOrigin(0.5, 1)
      : this.add.rectangle(d.x, y, 90, 130, 0x6b3a1a).setOrigin(0.5, 1);
    this.door.setDepth(3);
    this.door.frames = db ? db.frames : 1;
    this.doorAt = { x: d.x, y };
  }

  buildShaan() {
    const [x, y] = this.room.start;
    this.art = zebonkyArt(this, this.room.artset);
    ensureAnims(this, this.art);
    const s = this.add.sprite(x, y, texKey(this.art.name, this.art.z.anims.idle.file), 0)
      .setScale(SCALE).setOrigin(0.5, this.room.runner ? FEET_ROW / this.art.z.frameHeight : CENTRE_Y).setDepth(5);
    faceArt(s, this.art);
    s.setFlipX(true);
    play(s, this.art, 'idle');
    this.shaan = s;
    // (A runner's speed is set every step, so no friction to fight it.)
    const run = this.room.runner;
    this.ball = this.matter.add.circle(x, y, RADIUS, {
      friction: run ? 0 : 0.8, frictionStatic: run ? 0 : 0.9, frictionAir: run ? 0 : 0.004, restitution: 0.05, label: 'shaan',
    });
    if (run) Matter().Body.setInertia(this.ball, Infinity);
  }

  buildHud() {
    const box = this.add.graphics().setScrollFactor(0).setDepth(20);
    box.fillStyle(COLORS.parchment, 0.95);
    box.fillRoundedRect(MAP_W / 2 - 170, 14, 340, 50, 16);
    box.lineStyle(3, COLORS.ink, 1);
    box.strokeRoundedRect(MAP_W / 2 - 170, 14, 340, 50, 16);
    this.add.text(MAP_W / 2, 39, this.room.name, heading(24, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    // Every room's timer (the user, 2026-11-05), right of its name.
    this.clockText = this.add.text(MAP_W / 2 + 190, 40, clock(0), heading(26, '#ffffff', {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    if (this.room.runner) {
      // No tokens in a runner room: its time is the thing.
    } else if (this.unit === 'rings') {
      const ic = this.add.graphics().setScrollFactor(0).setDepth(21).setPosition(MAP_W - 150, 40);
      ic.lineStyle(7, COLORS.ink, 1).strokeEllipse(0, 0, 22, 36);
      ic.lineStyle(4, 0xffc93c, 1).strokeEllipse(0, 0, 22, 36);
    } else this.add.image(MAP_W - 150, 40, tokenIcon(this)).setScrollFactor(0).setDepth(21);
    if (!this.room.runner) {
      this.coinText = this.add.text(MAP_W - 126, 40, `0 / ${this.totalCoins()}`, heading(24, '#ffffff', {
        stroke: COLORS.inkCss, strokeThickness: 6,
      })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    }

    if (this.test) {
      this.add.text(20, 20, this.inspect ? 'INSPECTION' : 'TEST MODE', heading(20, '#ffffff', {
        backgroundColor: '#b3261e', padding: { x: 10, y: 4 },
      })).setScrollFactor(0).setDepth(21);
    }
    if (this.room.runner && !this.inspect) { this.countdown(); return; }
    if (this.retry) return;
    // What to do, for a moment.
    const say = this.add.text(MAP_W / 2, MAP_H / 2 - 120, this.room.intro || 'Roll Shaan to the door!\nMind the gaps.', heading(40, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 10, align: 'center',
    })).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    this.tweens.add({ targets: say, alpha: 0, delay: 2600, duration: 500, onComplete: () => say.destroy() });
    this.intro = say;
  }

  // A runner room's start: "Go Fast!", then 3, 2, 1, GO! He can't move
  // until GO, and the clock starts there. What to do shows underneath.
  countdown() {
    if (!this.waiting) { this.runSteps = 0; return; }
    const big = (msg, color = COLORS.yellowCss) => this.add.text(MAP_W / 2, MAP_H / 2 - 90, msg, heading(96, color, {
      stroke: COLORS.inkCss, strokeThickness: 14,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(22);
    const how = this.add.text(MAP_W / 2, MAP_H / 2 + 30, this.room.intro || '', heading(30, '#ffffff', {
      stroke: COLORS.inkCss, strokeThickness: 8, align: 'center',
    })).setOrigin(0.5).setScrollFactor(0).setDepth(22);
    this.intro = how;
    const show = (msg, at, hold, color) => this.time.delayedCall(at, () => {
      const t = big(msg, color).setScale(0.4);
      this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
      this.tweens.add({ targets: t, alpha: 0, delay: hold, duration: 200, onComplete: () => t.destroy() });
      if (msg !== 'Go Fast!') audio.sfx(this, msg === 'GO!' ? 'correct' : 'hint');
    });
    show('Go Fast!', 0, 1100);
    ['3', '2', '1'].forEach((n, i) => show(n, 1400 + i * 800, 550, '#ffffff'));
    show('GO!', 1400 + 3 * 800, 600, '#7dff7a');
    this.time.delayedCall(1400 + 3 * 800, () => {
      this.waiting = false;
      this.runSteps = 0;
      this.tweens.add({ targets: how, alpha: 0, delay: 1200, duration: 400, onComplete: () => how.destroy() });
    });
  }

  // The level's buttons, with their keys under them.
  buildControls() {
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,Z,J');
    const y = MAP_H - 80;
    const hold = (img, key) => {
      img.setScrollFactor(0).setAlpha(0.75).setDepth(20).setInteractive();
      img.on('pointerdown', () => {
        this.touch[key] = true;
        img.setAlpha(1);
        if (key === 'jump') this.touchJump = true;
        if (key === 'left' || key === 'right') this.tapped = key === 'right' ? 1 : -1;
      });
      const up = () => { this.touch[key] = false; img.setAlpha(0.75); };
      img.on('pointerup', up);
      img.on('pointerout', up);
    };
    hold(this.add.image(80, y, 'btn-left'), 'left');
    hold(this.add.image(190, y, 'btn-right'), 'right');
    hold(this.add.image(MAP_W - 90, y - 8, 'btn-jump'), 'jump');
    // In water only: swim down (the jump button swims up).
    this.btnDown = this.add.image(MAP_W - 210, y, 'btn-jump').setFlipY(true).setVisible(false);
    hold(this.btnDown, 'down');
    const keyLabel = (x, label) => this.add.text(x, y + 50, label, text(16, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
    })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
    keyLabel(80, '← or A');
    keyLabel(190, '→ or D');
    keyLabel(MAP_W - 90, 'Z · J · Space');
    // Shown only at the door, as in the levels: Up (or this) goes in.
    this.btnDoor = this.add.image(MAP_W - 90, y - 120, 'btn-jump').setScale(0.8).setTint(0xffc93c)
      .setScrollFactor(0).setDepth(20).setAlpha(0.85).setVisible(false).setInteractive();
    this.btnDoor.on('pointerdown', () => { this.touchDoor = true; });
    this.doorHint = this.add.text(0, 0, '\u2191', heading(34, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 8,
    })).setOrigin(0.5).setDepth(8).setVisible(false);
    this.tweens.add({ targets: this.doorHint, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
    this.input.addPointer(2);
  }

  onGround() {
    const { x, y } = this.ball.position;
    const pts = [[0, 1], [-0.5, 0.87], [0.5, 0.87]].map(([dx, dy]) => ({ x: x + dx * (RADIUS + 6), y: y + dy * (RADIUS + 6) }));
    return pts.some((p) => Matter().Query.point(this.ground, p).some((bd) => !bd.oneWay || !this.belowOneWay(bd.oneWay)));
  }

  // Going up through a one-way path, or still below its top.
  belowOneWay(isl) {
    const b = this.ball;
    if (b.velocity.y < -0.5) return true;
    const x = Phaser.Math.Clamp(b.position.x, isl.left, isl.right);
    return b.position.y + RADIUS > surfaceY(isl.curve, x) + 14;
  }

  // Every frame: his picture, the input (kept for the next physics step),
  // the door, the coins and the fall. The physics itself is in step(), once
  // per Matter step, so it plays the same on any screen: pushing here, once
  // a frame, gave a 120 Hz screen twice the push, and holding right alone
  // got through the whole room there (the user, 2026-11-02).
  update(time, delta) {
    if (this.leaving) return;
    const b = this.ball;
    const k = this.keys;
    const s = this.shaan;
    s.setPosition(b.position.x, b.position.y + (this.room.runner ? RADIUS + GRASS_SINK : 0));
    this.animateWater(delta);
    if (this.inspect) { this.inspectUpdate(delta); return; }
    if (this.finished) return;

    const left = k.LEFT.isDown || k.A.isDown || this.touch.left;
    const right = k.RIGHT.isDown || k.D.isDown || this.touch.right;
    this.dir = (right ? 1 : 0) - (left ? 1 : 0);
    // A double tap that way is Charlie's Hyper Dash (asked here, done in the
    // next step). Only in a runner room: Shaan doesn't get a dash (the user,
    // 2026-11-04), his Wrecking Ball is rolling through rocks at a run.
    let tap = this.tapped;
    this.tapped = 0;
    if (Phaser.Input.Keyboard.JustDown(k.RIGHT) || Phaser.Input.Keyboard.JustDown(k.D)) tap = 1;
    if (Phaser.Input.Keyboard.JustDown(k.LEFT) || Phaser.Input.Keyboard.JustDown(k.A)) tap = -1;
    if (tap) {
      if (this.room.runner && time - this.tapAt[tap] < DOUBLE_TAP_MS) this.dashAsked = tap;
      this.tapAt[tap] = time;
    }
    this.dashTrail(time);
    this.jumpHeld = [k.SPACE, k.Z, k.J, k.UP, k.W].some((key) => key.isDown) || this.touch.jump;
    // Up and down, for swimming: up is the jump keys too.
    this.vert = (k.DOWN.isDown || k.S.isDown || this.touch.down ? 1 : 0) - (this.jumpHeld ? 1 : 0);
    const grounded = this.grounded;

    // At the door: Up (or the door button) goes in, instead of jumping.
    const atDoor = grounded && Math.abs(b.position.x - this.doorAt.x) < 70 && Math.abs(b.position.y - (this.doorAt.y - RADIUS)) < 90;
    this.doorHint.setVisible(atDoor).setPosition(b.position.x, b.position.y - 70);
    this.btnDoor.setVisible(atDoor);
    if (atDoor && (Phaser.Input.Keyboard.JustDown(k.UP) || Phaser.Input.Keyboard.JustDown(k.W) || this.touchDoor)) {
      this.touchDoor = false;
      this.reachDoor();
      return;
    }
    this.touchDoor = false;

    // A jump press waits for the next physics step.
    if ([k.SPACE, k.Z, k.J, k.UP, k.W].some((key) => Phaser.Input.Keyboard.JustDown(key)) || this.touchJump) this.jumpAsked = true;
    this.touchJump = false;

    // His picture: rolling while he moves or flies, uncurled once stopped.
    const speed = Math.hypot(b.velocity.x, b.velocity.y);
    if (speed > 0.8 || !grounded) this.movedAt = time;
    if (Math.abs(b.velocity.x) > 0.4) s.setFlipX(b.velocity.x > 0);
    this.btnDown.setVisible(this.wet);
    if (this.wet && this.art.z.anims.dive) {
      // In water he's a shark: his dive strip, tilted the way he swims.
      play(s, this.art, 'dive');
      s.anims.timeScale = 1;
      const tilt = Phaser.Math.Clamp(Math.atan2(b.velocity.y, Math.abs(b.velocity.x) + 0.5), -1, 1);
      // (his art faces right: unflipped, a positive turn points his nose
      // down; the other way round had it pointing up as he dived)
      s.setRotation(s.flipX ? -tilt : tilt);
    } else if (this.room.runner) {
      // Running, his run strip faster the faster he goes; in the air, his jump.
      s.setRotation(0);
      if (!grounded && this.art.z.anims.jump) play(s, this.art, 'jump');
      else play(s, this.art, Math.abs(b.velocity.x) > 0.8 && this.time.now - (this.blockedAt || -1e9) > 120 ? 'run' : 'idle');
      s.anims.timeScale = grounded ? Phaser.Math.Clamp(Math.abs(b.velocity.x) / 9, 0.6, 2.2) : 1;
    } else {
      s.setRotation(0);
      const rolling = time - this.movedAt < UNCURL_AFTER;
      play(s, this.art, rolling ? 'run' : 'idle');
      s.anims.timeScale = rolling ? Phaser.Math.Clamp(speed / 7, 0.6, 2.4) : 1;
    }

    // Rings: swim through for their coins. Touching any of it counts (the
    // user, 2026-11-02), the hoop included; with no dash any more (the user,
    // 2026-11-04), a touch is all it takes.
    this.rings.forEach((r) => {
      const ex = (b.position.x - r.x) / (r.r * 0.55 + RADIUS);
      const ey = (b.position.y - r.y) / (r.r + RADIUS);
      if (r.done || ex * ex + ey * ey > 1) return;
      this.takeRing(r);
    });

    // Coins.
    this.coins.forEach((c) => {
      if (c.got || c.hidden || Math.hypot(c.x - b.position.x, c.y - b.position.y) > RADIUS + 20) return;
      c.got = true;
      this.coinsGot += 1;
      this.coinText.setText(`${this.coinsGot} / ${this.totalCoins()}`);
      audio.sfx(this, 'food');
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, y: c.y - 50, alpha: 0, scale: 1.6, duration: 300, onComplete: () => c.destroy() });
    });

    if (this.room.runner) this.runnerPickups(time);
    const shown = Math.floor(this.runTime() * 10);
    if (this.clockText && shown !== this.clockShown) { this.clockShown = shown; this.clockText.setText(clock(this.runTime())); }

    if (b.position.y > this.room.height + 80) this.fellOff();
  }
  // A pool: the set's water over a basin in an island (data: x, y = its
  // surface, w, h). Behind the rock (so the basin's walls show) and behind
  // him and the rings and coins (in front, it washed them all out).
  buildPool(w, set) {
    const k = (f) => f && texKey(this.room.artset, f);
    const water = set.water || {};
    const body = k(water.body_strip);
    const top = k(water.top_strip);
    if (body && this.textures.exists(body)) {
      this.add.tileSprite(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, body).setAlpha(water.alpha || 0.62).setDepth(1.5);
    } else this.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x2aa7d8, 0.55).setDepth(1.5);
    if (top && this.textures.exists(top)) {
      w.top = this.add.tileSprite(w.x + w.w / 2, w.y + 8, w.w, 64, top).setAlpha(0.9).setDepth(1.6);
    }
    return w;
  }

  isWater(x, y) {
    return (this.pools || []).some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h);
  }

  // A ring: a glowing hoop; its coins are counted in the total.
  buildRing(rd) {
    const r = rd.r || 70;
    const g = this.add.graphics().setDepth(5.2).setPosition(rd.x, rd.y);
    g.lineStyle(14, COLORS.ink, 1).strokeEllipse(0, 0, r * 1.1, r * 2);
    g.lineStyle(9, 0xffc93c, 1).strokeEllipse(0, 0, r * 1.1, r * 2);
    g.lineStyle(3, 0xffffff, 0.8).strokeEllipse(0, 0, r * 0.9, r * 1.8);
    this.tweens.add({ targets: g, scaleX: 1.12, scaleY: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const icon = this.add.image(rd.x, rd.y, tokenIcon(this)).setDepth(5.3).setAlpha(0.85)
      .setVisible(!!(this.room.coins || []).length);
    return { x: rd.x, y: rd.y, r, coins: rd.coins || 1, g, icon, done: false };
  }

  takeRing(r) {
    r.done = true;
    this.coinsGot += r.coins;
    this.coinText.setText(`${this.coinsGot} / ${this.totalCoins()}`);
    audio.sfx(this, 'correct');
    this.floatText(r.x, r.y - r.r - 20, this.unit === 'rings' ? 'Ring!' : `+${r.coins}`);
    this.tweens.killTweensOf(r.g);
    this.tweens.add({ targets: [r.g, r.icon], scaleX: 2, scaleY: 2, alpha: 0, duration: 380, onComplete: () => { r.g.destroy(); r.icon.destroy(); } });
  }

  totalCoins() {
    return this.coins.length + (this.rings || []).reduce((n, r) => n + r.coins, 0);
  }

  // One physics step in water: steer any way, float, drag, and the dash
  // aimed with the arrows too. Swimming up out of the top leaps him out.
  swim(time, dir) {
    const M = Matter();
    const b = this.ball;
    const vert = this.vert || 0;
    this.fullSpeed = 0;
    this.geyserRide = false;
    this.jumping = false;
    this.jumpAsked = false;
    let vx = b.velocity.x + dir * SWIM_PUSH;
    let vy = b.velocity.y + vert * SWIM_PUSH;
    if (this.dashAsked && time - this.dashAt >= DASH_AGAIN_MS) {
      const len = Math.hypot(this.dashAsked, vert) || 1;
      this.dashVec = { x: this.dashAsked / len, y: vert / len };
      this.dashDir = this.dashAsked;
      this.dashAt = time;
      this.dashUntil = time + DASH_MS * 0.6;
      audio.sfx(this, 'toss');
    }
    this.dashAsked = 0;
    if (this.dashing && this.dashVec) {
      vx = this.dashVec.x * WATER_DASH;
      vy = this.dashVec.y * WATER_DASH;
    } else {
      vx *= SWIM_DRAG;
      vy *= SWIM_DRAG;
      const sp = Math.hypot(vx, vy);
      if (sp > SWIM_SPEED) { vx *= SWIM_SPEED / sp; vy *= SWIM_SPEED / sp; }
    }
    // Near the surface swimming up: out he leaps.
    const pool = this.pools.find((w) => b.position.x > w.x && b.position.x < w.x + w.w);
    if (pool && vert < 0 && b.position.y < pool.y + RADIUS + 10) vy = Math.min(vy, -11);
    M.Body.setVelocity(b, { x: vx, y: vy });
  }

  get dashing() {
    return this.time.now < this.dashUntil;
  }

  // While dashing, fading copies of him trail behind.
  dashTrail(time) {
    if (!this.dashing || time - (this.trailAt || 0) < 50) return;
    this.trailAt = time;
    const s = this.shaan;
    const ghost = this.add.sprite(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setDepth(s.depth - 0.1).setAlpha(0.5).setTint(0x9be2ff);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
  }

  // The geysers' spouts and the falls flowing, by time, not by frame.
  animateWater(delta) {
    const f60 = delta / (1000 / 60);
    this.geysers.forEach((gy) => {
      this.spout(gy, Math.max(30, gy.spout.height - 18 * f60));
      if (gy.spout.tilePositionY !== undefined) gy.spout.tilePositionY += 10 * f60;
    });
    (this.falls || []).forEach((f) => {
      if (f.sprite.tilePositionY !== undefined) f.sprite.tilePositionY += 7 * f60;
    });
  }

  // A spout's height: its top moves, its foot stays in the hole.
  spout(gy, h) {
    gy.spout.setSize(56, h);
    gy.spout.y = gy.y + 6 - h;
  }

  // Once per Matter step (60 a second): rolling, jumping, geysers, falls,
  // full speed and the speed limits.
  step() {
    if (this.leaving || this.finished || this.inspect) return;
    const M = Matter();
    const b = this.ball;
    const time = this.time.now;
    const dir = this.dir || 0;
    this.lastSpeed = Math.hypot(b.velocity.x, b.velocity.y);   // for the rocks, before this step
    // Shaan doesn't get a dash (the user, 2026-11-04): only a runner room's
    // Hyper Dash uses it. Dropped here too, whoever asked (the test bot asks
    // directly).
    if (!this.room.runner) { this.dashAsked = 0; this.dashUntil = 0; }
    // A runner room's clock starts at its countdown's GO; the others' at
    // the first step.
    if (!this.room.runner) this.runSteps = Math.max(0, this.runSteps) + 1;
    const grounded = this.onGround();
    this.grounded = grounded;
    if (grounded) this.groundAt = time;
    const wasWet = this.wet;
    this.wet = this.isWater(b.position.x, b.position.y);
    // Out of the water a dash ends: carried on in the air, a dash up out of
    // a pool flew him over the rock, the gap and into the next island.
    if (wasWet && !this.wet) this.dashUntil = 0;
    // In water gravity doesn't pull him: he's half shark, so he holds still
    // when he isn't swimming (the user, 2026-11-02: he doesn't sink).
    b.ignoreGravity = this.wet;
    if (this.wet) { this.swim(time, dir); return; }
    if (this.room.runner) { this.runStep(time, dir, grounded); return; }

    // A geyser carries him straight up until he slows near the top; a
    // bumper's knock carries him back for a moment.
    if (this.geyserRide && b.velocity.y > -10) this.geyserRide = false;
    const knocked = time < (this.bumpedUntil || 0);
    if (dir && !this.geyserRide && !knocked) {
      if (grounded) M.Body.setAngularVelocity(b, Phaser.Math.Linear(b.angularVelocity, dir * SPIN, 0.15));
      M.Body.applyForce(b, b.position, { x: dir * (grounded ? PUSH : AIR_PUSH) * b.mass, y: 0 });
    }

    // Jump (a little after rolling off an edge too); let go early for a hop.
    if (this.jumpAsked && time - this.groundAt < COYOTE && !this.jumping) {
      M.Body.setVelocity(b, { x: b.velocity.x, y: Math.min(b.velocity.y, 0) - JUMP });
      this.jumping = true;
      this.groundAt = 0;
      audio.sfx(this, 'jump');
    }
    this.jumpAsked = false;
    const held = this.jumpHeld;
    if (this.jumping && !held && b.velocity.y < -5) M.Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y * 0.55 });
    if (this.jumping && (b.velocity.y >= 0 || !held)) this.jumping = false;

    // Geysers launch him straight up (the user, 2026-11-02): anywhere over
    // the hole, up to a couple of tiles above it, so rolling over it fast
    // still catches.
    this.geysers.forEach((gy) => {
      const near = Math.abs(b.position.x - gy.x) < 50 && b.position.y > gy.y - 200 && b.position.y < gy.y + 20;
      if (near && time >= gy.readyAt) {
        gy.readyAt = time + 500;
        M.Body.setPosition(b, { x: gy.x, y: b.position.y });
        M.Body.setVelocity(b, { x: 0, y: -gy.speed });
        this.geyserRide = true;
        this.spout(gy, gy.height * 0.85);
        audio.sfx(this, 'splash');
      }
    });

    // Upward waterfalls carry him up.
    (this.falls || []).forEach((f) => {
      const inside = b.position.x > f.x - RADIUS * 0.4 && b.position.x < f.x + f.w + RADIUS * 0.4
        && b.position.y > f.top - 10 && b.position.y < f.bottom;
      // It holds him too: his sideways speed drops to a drift the arrows
      // steer, or at full speed he shot straight through it.
      if (inside) {
        M.Body.setVelocity(b, {
          // slow, and drawn to its middle: holding right (or coming in at a
          // dash) he still rides it to the top
          x: Phaser.Math.Linear(b.velocity.x, dir * 1 + (f.x + f.w / 2 - b.position.x) * 0.06, 0.35),
          y: Phaser.Math.Linear(b.velocity.y, -FALLS_UP, 0.2),
        });
        this.fullSpeed = 0;
        this.dashUntil = 0;          // a dash ends in it, or it carried him through
        f.riding = true;
      } else if (f.riding) {
        // Out of the top: tossed onto the ledge the way they're pressing,
        // `toss` px a step (6 if not given): with none he left crawling,
        // too slow for the hops after Cannonball Cove's second falls (9
        // there); 9 at its first, and he bounced down the slope beyond.
        f.riding = false;
        if (b.position.y < f.top + 40) M.Body.setVelocity(b, { x: (dir || 1) * (f.toss || 6), y: b.velocity.y });
      }
    });

    // Full speed holds (the user, 2026-11-02): once he's reached full speed
    // and they keep pressing that way, an uphill doesn't slow him. Letting
    // go, turning round or a slope steeper than FULL_SPEED_SLOPE (a wall)
    // ends it.
    if (dir && Math.sign(b.velocity.x) === dir && Math.abs(b.velocity.x) >= MAX_SPEED * 0.95) this.fullSpeed = dir;
    if (dir !== this.fullSpeed || this.geyserRide) this.fullSpeed = 0;
    if (this.fullSpeed && grounded && !this.jumping) {
      const a = this.slopeAt(b.position.x, b.position.y + RADIUS);
      if (a === null || Math.abs(a) > FULL_SPEED_SLOPE) this.fullSpeed = 0;
      else if (Math.hypot(b.velocity.x, b.velocity.y) < MAX_SPEED) {
        M.Body.setVelocity(b, { x: dir * MAX_SPEED * Math.cos(a), y: dir * MAX_SPEED * Math.sin(a) });
      }
    }

    // The dash: a second at dash speed the way they tapped, along the
    // ground like full speed; it ends early if they turn round.
    if (this.dashAsked && time - this.dashAt >= DASH_AGAIN_MS && !this.geyserRide) {
      this.dashDir = this.dashAsked;
      this.dashVec = null;
      this.dashAt = time;
      this.dashUntil = time + DASH_MS;
      audio.sfx(this, 'toss');
    }
    this.dashAsked = 0;
    if (this.dashing && dir === -this.dashDir) this.dashUntil = 0;
    if (this.dashing) {
      // (Not in the step he jumps: pinning him to the ground cancelled a
      // jump made mid-dash.)
      const a = grounded && !this.jumping ? this.slopeAt(b.position.x, b.position.y + RADIUS) : null;
      // Only along the ground: in the air it keeps what speed he has (a dash
      // started mid-leap out of a pool hit the steep bank at dash speed and
      // ramped him over the rock, the gap and into the next island).
      if (a !== null && Math.abs(a) <= FULL_SPEED_SLOPE) {
        M.Body.setVelocity(b, { x: this.dashDir * DASH_SPEED * Math.cos(a), y: this.dashDir * DASH_SPEED * Math.sin(a) });
      }
    }

    // Not too fast.
    const top = this.dashing ? DASH_SPEED : MAX_SPEED;
    if (Math.abs(b.velocity.x) > top) M.Body.setVelocity(b, { x: Math.sign(b.velocity.x) * top, y: b.velocity.y });
    if (b.velocity.y > MAX_FALL) M.Body.setVelocity(b, { x: b.velocity.x, y: MAX_FALL });
  }

  // A runner room's pieces: fruit (the area's food), launch pads,
  // stumbling rocks and hollow logs, and the boost count on screen.
  buildRunner(set) {
    const room = this.room;
    const placeY = (x, on, lift = 0) => {
      const isl = on !== undefined ? this.islands[on] : this.islandAt(x);
      return (isl ? surfaceY(isl.curve, x) : 900) - lift;
    };
    const food = set.food && texKey(room.artset, set.food);
    // The bananalopes: big, on a glowing ring that pulses (the user,
    // 2026-11-03: "bigger and more obvious"; at half size they were 25 px).
    this.fruit = (room.fruit || []).map((f) => {
      const y = f.y !== undefined ? f.y : placeY(f.x, f.on, 100);
      const img = this.add.container(f.x, y).setDepth(4.5);
      const glow = this.add.circle(0, 0, 56, 0xfff3a0, 0.45).setStrokeStyle(6, 0xffd23c, 0.95);
      img.add(glow);
      img.add(food && this.textures.exists(food)
        ? this.add.image(0, 0, food).setScale(1.9)
        : this.add.circle(0, 0, 40, 0xffd23c).setStrokeStyle(5, COLORS.ink));
      this.tweens.add({ targets: img, y: y - 14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return { x: f.x, y, img, got: false };
    });
    // Launch pads: a springy leaf (drawn here for now), its arrow up.
    this.pads = (room.pads || []).map((pd) => {
      const y = placeY(pd.x, pd.on);
      const g = this.add.graphics().setDepth(4).setPosition(pd.x, y);
      const [base, lite] = [0x4cc35a, 0xb8f06a];
      // Wide (the user, 2026-11-03: "pads need to be wider"; were 100).
      g.fillStyle(COLORS.ink, 1).fillEllipse(0, -6, 216, 32);
      g.fillStyle(base, 1).fillEllipse(0, -8, 208, 26);
      g.fillStyle(lite, 1).fillEllipse(0, -12, 150, 10);
      [-50, 0, 50].forEach((ax) => {
        g.fillStyle(0xffd23c, 1).fillTriangle(ax - 14, -30, ax + 14, -30, ax, -54);
        g.lineStyle(3, COLORS.ink, 1).strokeTriangle(ax - 14, -30, ax + 14, -30, ax, -54);
      });
      return { x: pd.x, y, g, readyAt: 0 };
    });
    // Rocks he trips on: the set's small rocks, sat on the ground.
    // (They blended into the bushes, the user, 2026-11-03: so a thick dark
    // outline and a bright orange rim round each, against the green.)
    const rk = texKey(room.artset, 'pt_rock_medium.png');
    this.stumbles = (room.stumbles || []).map((r) => {
      const y = placeY(r.x, r.on) + 6;
      const img = this.add.container(r.x, y).setDepth(5.5);
      if (this.textures.exists(rk)) {
        // A dark edge, a bright orange rim inside it (filled copies, Phaser
        // 4's FILL tint mode), then the rock itself as drawn (the user: "an
        // outline, not a complete cover").
        const fill = (dx, dy, color) => img.add(this.add.image(dx, dy, rk).setOrigin(0.5, 1)
          .setTintMode(Phaser.TintModes.FILL).setTint(color));
        [[-10, 0], [10, 0], [0, -10], [0, 6], [-7, -7], [7, -7]].forEach(([dx, dy]) => fill(dx, dy, 0x1a1210));
        [[-5, 0], [5, 0], [0, -5], [0, 3], [-4, -4], [4, -4]].forEach(([dx, dy]) => fill(dx, dy, 0xff8a1f));
        img.add(this.add.image(0, 0, rk).setOrigin(0.5, 1));
      } else img.add(this.add.circle(0, -30, 30, 0xb08a60).setStrokeStyle(5, COLORS.ink));
      const src = this.textures.exists(rk) ? this.textures.get(rk).getSourceImage() : { width: 60, height: 60 };
      return { x: r.x, y, img, half: src.width * 0.4, h: src.height * 0.85, hit: false };
    });
    // Hollow logs: the back half behind him, the rim in front (drawn here
    // for now, until there's art).
    this.logs = (room.logs || []).map((lg) => {
      const y = placeY(lg.x, lg.on);
      const w = lg.w || 360;
      const h = 150;
      const back = this.add.graphics().setDepth(4.2).setPosition(lg.x, y);
      back.fillStyle(COLORS.ink, 1).fillRoundedRect(-w / 2 - 4, -h - 4, w + 8, h + 8, 40);
      back.fillStyle(0x6b4423, 1).fillRoundedRect(-w / 2, -h, w, h, 36);
      back.fillStyle(0x3d2412, 1).fillRoundedRect(-w / 2 + 20, -h + 22, w - 40, h - 30, 24);
      const front = this.add.graphics().setDepth(6).setPosition(lg.x, y);
      front.fillStyle(0x8a5a30, 1).fillRect(-w / 2 + 30, -h, w - 60, 22);
      front.lineStyle(4, COLORS.ink, 1).strokeRect(-w / 2 + 30, -h, w - 60, 22);
      [-1, 1].forEach((side) => {
        front.fillStyle(COLORS.ink, 1).fillEllipse(side * w / 2, -h / 2, 58, h + 8);
        front.fillStyle(0xc89058, 1).fillEllipse(side * w / 2, -h / 2, 50, h);
        front.lineStyle(3, 0x8a5a30, 1).strokeEllipse(side * w / 2, -h / 2, 30, h * 0.6);
        front.fillStyle(0x3d2412, 1).fillEllipse(side * w / 2 + side * 6, -h / 2 + 6, 26, h - 40);
      });
      return { x: lg.x, y, w };
    });
    // The fruit held, top left: one picture each, up to three.
    this.boostIcons = Array.from({ length: RUN.boosts }, (_, i) => {
      const ic = food && this.textures.exists(food)
        ? this.add.image(50 + i * 80, MAP_H - 200, food).setScale(1.2)
        : this.add.circle(50 + i * 90, MAP_H - 200, 28, 0xffd23c);
      return ic.setScrollFactor(0).setDepth(21).setAlpha(0.25);
    });
  }

  // Seconds since he set off, by physics steps (the same on any screen).
  runTime() {
    return Math.max(0, this.runSteps) / 60;
  }

  // The room's medal: by his time (`medalTimes`: under `gold` s for gold,
  // under `silver` for silver; through the door at all is bronze).
  runMedal(t) {
    return tierInfo(timeTier(t, this.room.medalTimes));
  }

  showBoosts() {
    (this.boostIcons || []).forEach((ic, i) => ic.setAlpha(i < this.boosts ? 1 : 0.25));
  }

  // Fruit (a boost each) and the rocks he trips on.
  runnerPickups(time) {
    const b = this.ball;
    this.fruit.forEach((f) => {
      if (f.got || Math.hypot(f.x - b.position.x, f.y - b.position.y) > RADIUS + 60) return;
      f.got = true;
      this.boosts = Math.min(RUN.boosts, this.boosts + 1);
      this.showBoosts();
      audio.sfx(this, 'food');
      this.floatText(f.x, f.y - 40, this.boosts === 1 ? 'Double tap → to Hyper Dash!' : '+1 Hyper Dash!');
      this.tweens.killTweensOf(f.img);
      this.tweens.add({ targets: f.img, y: f.y - 60, alpha: 0, scale: 1.6, duration: 300, onComplete: () => f.img.destroy() });
    });
    // (Rocks are in runStep: they hold him there, in the physics step.)
  }

  // Rocks stop him dead (the user, 2026-11-03: "the rocks need to stop
  // him"): he has to jump them. Running into one, he's held against its
  // side, his speed gone (done here in the physics step: knocked back once
  // a frame, he skipped and flickered against it). Boosted, he smashes it.
  rockStep(time) {
    const b = this.ball;
    const M = Matter();
    const feet = b.position.y + RADIUS;
    this.stumbles.forEach((r) => {
      if (r.hit || feet < r.y - r.h + 8 || feet > r.y + 30) return;
      const side = b.position.x < r.x ? -1 : 1;
      const contact = r.x + side * (RADIUS + r.half);
      const nextX = b.position.x + b.velocity.x;
      // Only if this step would take him into it (or he's already in it).
      if ((side < 0 && nextX <= contact) || (side > 0 && nextX >= contact)) return;
      if (this.dashing) {
        r.hit = true;
        this.floatText(r.x, r.y - r.h - 30, 'Smash!');
        audio.sfx(this, 'crate');
        this.tweens.add({ targets: r.img, x: r.x + 260, y: r.y + 80, angle: 220, alpha: 0, duration: 600, ease: 'Sine.In' });
        return;
      }
      M.Body.setPosition(b, { x: contact, y: b.position.y });
      M.Body.setVelocity(b, { x: 0, y: b.velocity.y });
      this.runSpeed = 0;
      this.blockedAt = time;
      if (time > (r.toldAt || 0) + 1500) {
        r.toldAt = time;
        this.floatText(r.x, r.y - r.h - 30, 'Jump it!');
      }
    });
  }

  // One physics step in a runner room.
  runStep(time, dir, grounded) {
    const M = Matter();
    const b = this.ball;
    // One-way paths: see-through (a sensor) while he's rising through one
    // or below its top, solid once he's above it. (Cancelling the contact in
    // the collision events came too late: the hit was already resolved.)
    this.islands.forEach((isl) => {
      if (!isl.oneWay) return;
      const near = b.position.x > isl.left - 120 && b.position.x < isl.right + 120;
      const open = near && this.belowOneWay(isl);
      if (isl.open === open) return;
      isl.open = open;
      isl.bodies.forEach((bd) => { bd.isSensor = open; });
    });
    // Held still until the countdown's GO; the clock runs from there.
    if (this.waiting) {
      this.jumpAsked = false;
      this.dashAsked = 0;
      M.Body.setVelocity(b, { x: 0, y: Math.max(0, b.velocity.y) });
      return;
    }
    if (this.runSteps >= 0) this.runSteps += 1;
    // Driven: right speeds him up (to a run, then on to a sprint), left
    // brakes and runs him back, nothing held and he slows to a stop. He
    // eases to a stop at the door.
    const sp = this.runSpeed;
    let target = dir > 0 ? RUN.sprint : dir < 0 ? -RUN.back : 0;
    const toDoor = this.doorAt.x - b.position.x;
    if (toDoor < 360 && toDoor > -60 && target > 0) target = Math.min(target, Math.max(0, toDoor * 0.04));
    if (Math.sign(sp) && Math.sign(target) !== Math.sign(sp)) {
      // slowing: braking against it, or coasting
      const drop = dir && Math.sign(dir) !== Math.sign(sp) ? RUN.brake : RUN.coast;
      this.runSpeed = sp > 0 ? Math.max(target > 0 ? target : 0, sp - drop) : Math.min(target < 0 ? target : 0, sp + drop);
      if (Math.sign(this.runSpeed) !== Math.sign(sp) && target) this.runSpeed = 0;
    } else if (Math.abs(sp) < Math.abs(target)) {
      const rate = Math.abs(sp) < RUN.run ? RUN.accel : RUN.creep;
      this.runSpeed = sp + Math.sign(target) * Math.min(rate, Math.abs(target) - Math.abs(sp));
    } else this.runSpeed = sp > 0 ? Math.max(target, sp - RUN.coast) : Math.min(target, sp + RUN.coast);

    // Jump (a little after running off an edge too); let go early for a hop.
    if (this.jumpAsked && time - this.groundAt < COYOTE && !this.jumping) {
      M.Body.setVelocity(b, { x: b.velocity.x, y: Math.min(b.velocity.y, 0) - RUN.jump });
      this.jumping = true;
      this.groundAt = 0;
      audio.sfx(this, 'jump');
    }
    this.jumpAsked = false;
    if (this.jumping && !this.jumpHeld && b.velocity.y < -5) M.Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y * 0.55 });
    if (this.jumping && (b.velocity.y >= 0 || !this.jumpHeld)) this.jumping = false;

    // The boost: a double tap forward spends a fruit.
    if (this.dashAsked === 1 && time - this.dashAt >= DASH_AGAIN_MS) {
      if (this.boosts > 0) {
        this.boosts -= 1;
        this.showBoosts();
        this.dashDir = 1;
        this.dashAt = time;
        this.dashUntil = time + DASH_MS * 1.5;
        audio.sfx(this, 'toss');
        this.callPower();
      } else if (time > (this.toldBoostAt || 0) + 1500) {
        this.toldBoostAt = time;
        this.floatText(b.position.x, b.position.y - 90, 'Grab fruit to Hyper Dash!');
      }
    }
    this.dashAsked = 0;

    // Launch pads: up he goes, much higher boosted.
    const feet = b.position.y + RADIUS;
    this.pads.forEach((pd) => {
      // Any speed, on it or landing on it (the user, 2026-11-03: "launch
      // him no matter the speed"): the catch reaches up a fall's step.
      if (time < pd.readyAt || Math.abs(b.position.x - pd.x) > 112 || feet < pd.y - 40 - Math.max(0, b.velocity.y) || feet > pd.y + 24 || b.velocity.y < -4) return;
      pd.readyAt = time + 600;
      M.Body.setPosition(b, { x: b.position.x, y: pd.y - RADIUS - 2 });
      M.Body.setVelocity(b, { x: b.velocity.x, y: -RUN.pad });
      this.padUntil = time + 250;
      this.jumping = false;
      this.groundAt = 0;
      audio.sfx(this, 'pad');
      this.tweens.add({ targets: pd.g, scaleY: 0.6, duration: 80, yoyo: true });
    });

    // Along the ground at his speed; in the air, his speed forward and
    // gravity's say up and down.
    const v = this.dashing ? DASH_SPEED : this.runSpeed;
    const a = grounded && !this.jumping && time > (this.padUntil || 0) ? this.slopeAt(b.position.x, b.position.y + RADIUS) : null;
    // In the air against rock in front (an island's side, under a missed
    // ravine), he stops pushing on and drops: pushed into it, its grip held
    // him there.
    const ahead = Math.sign(v) || 1;
    const blocked = !grounded && [-0.6, 0, 0.6].some((dy) => M.Query.point(this.ground, { x: b.position.x + ahead * (RADIUS + 4), y: b.position.y + dy * RADIUS })
      .some((bd) => !bd.oneWay));
    if (a !== null && Math.abs(a) <= FULL_SPEED_SLOPE) M.Body.setVelocity(b, { x: v * Math.cos(a), y: v * Math.sin(a) });
    else M.Body.setVelocity(b, { x: blocked ? 0 : v, y: b.velocity.y });
    this.rockStep(time);
    if (b.velocity.y > MAX_FALL) M.Body.setVelocity(b, { x: b.velocity.x, y: MAX_FALL });
  }

  reachDoor() {
    this.finished = true;
    this.doorHint.setVisible(false);
    this.btnDoor.setVisible(false);
    const t = this.runTime();
    if (this.clockText) this.clockText.setText(clock(t));
    this.medal = this.runMedal(t);
    // Its paws (kept at the best), on the level's record; a test run keeps none.
    this.medalFresh = this.test ? 0 : earn(this.levelId, 'bonusTime', this.medal.tier);
    const b = this.ball;
    Matter().Body.setStatic(b, true);
    audio.sfx(this, 'door');
    const d = this.door;
    if (d.frames > 1) {
      let f = 0;
      this.time.addEvent({ delay: 60, repeat: d.frames - 1, callback: () => { d.setFrame(f); f += 1; } });
    }
    play(this.shaan, this.art, 'idle');
    this.tweens.add({ targets: this.shaan, x: this.doorAt.x, alpha: 0, scale: SCALE * 0.7, delay: 500, duration: 420, ease: 'Sine.In' });
    this.time.delayedCall(950, () => this.endCard('Bonus level complete!',
      this.room.runner ? `You made it in ${t.toFixed(1)} seconds.`
        : this.unit === 'rings' ? `You claimed ${this.coinsGot} of ${this.totalCoins()} rings.`
          : `You gathered ${this.coinsGot} of ${this.totalCoins()} tokens.`, true, this.medal));
  }

  fellOff() {
    if (this.room.runner) { this.backBeforeGap(); return; }
    this.finished = true;
    Matter().Body.setStatic(this.ball, true);
    if (this.test) { this.startOver(); return; }
    this.endCard('Whoops!', 'Back to the level.', false);
  }

  // A runner room: no fall (the user, 2026-11-03: "instead of falling ...
  // have him appear right before the gap he fell in"). He's put back on the
  // lowest path just before the gap, standing; the clock runs on, so the
  // fall costs him time.
  backBeforeGap() {
    const b = this.ball;
    const M = Matter();
    const x = b.position.x;
    // The lowest path's islands: their tops at the right end the lowest.
    const ends = this.islands.map((isl) => ({ isl, y: surfaceY(isl.curve, isl.right - 1) }));
    const low = Math.max(...ends.map((e) => e.y));
    const before = ends.filter((e) => e.y > low - 120 && e.isl.right <= x + 60)
      .sort((p, q) => q.isl.right - p.isl.right)[0];
    const isl = before ? before.isl : this.islands[0];
    // Far enough back to get up speed again (260 px put him, stopped, in
    // front of a rock just before the gap: he could never clear both), and
    // not up against a rock.
    let nx = Math.max(isl.left + 80, isl.right - 700);
    (this.stumbles || []).forEach((r) => {
      if (!r.hit && r.x > nx - 60 && r.x < nx + 200 && Math.abs(r.y - surfaceY(isl.curve, r.x)) < 60) nx = Math.max(isl.left + 80, r.x - 260);
    });
    M.Body.setPosition(b, { x: nx, y: surfaceY(isl.curve, nx) - RADIUS - 4 });
    M.Body.setVelocity(b, { x: 0, y: 0 });
    this.runSpeed = 0;
    this.dashUntil = 0;
    this.jumping = false;
    this.cameras.main.flash(250, 255, 255, 255);
    this.floatText(nx, surfaceY(isl.curve, nx) - 140, 'Whoops! Go again!');
    audio.sfx(this, 'splash');
  }

  // Test mode: the room from the start again.
  startOver() {
    this.leaving = true;
    this.scene.restart({ levelId: this.levelId, test: true, retry: true });
  }

  endCard(title, line, won, medal = null) {
    if (this.intro && this.intro.active) this.intro.destroy();
    const shade = this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.35).setOrigin(0).setScrollFactor(0).setDepth(30);
    // The room's score card (the user, 2026-11-05): its three Z paw prints
    // as shadows, then the ones its time earned (the best so far) pop in.
    const up = medal ? 130 : 0;
    if (medal) {
      const w = 720;
      const px = (MAP_W - w) / 2;
      const py = MAP_H / 2 - 10;
      const panel = this.add.graphics().setScrollFactor(0).setDepth(31);
      panel.fillStyle(COLORS.ink, 1).fillRoundedRect(px + 5, py + 6, w, 150, 22);
      panel.fillStyle(COLORS.parchment, 1).fillRoundedRect(px, py, w, 150, 22);
      panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(px, py, w, 150, 22);
      const mt = this.room.medalTimes || {};
      const t = this.runTime();
      const got = this.test ? medal.tier : held(this.levelId, 'bonusTime');
      const best = tierInfo(got);
      const detail = best && best.tier > medal.tier ? `${medal.name}, best ${best.name}`
        : `${medal.name}   (gold ${clock(mt.gold)}, silver ${clock(mt.silver)})`;
      const tally = this.add.text(MAP_W / 2, py + 112, 'Z paw prints: 0 / 3', heading(26, COLORS.inkCss))
        .setOrigin(0.5).setScrollFactor(0).setDepth(32);
      let n = 0;
      pawCard(this, [{ label: `Time ${clock(t)}`, detail, detailAt: 150, max: 3, got, fresh: this.test ? medal.tier : this.medalFresh }], {
        x: px + 24, y: py + 50, w: w - 48, rowH: 64, depth: 32, scroll: false, delay: 700,
        onDone: (k) => tally.setText(`Z paw prints: ${k} / 3`),
      });
      for (let i = 0; i < got; i++) this.time.delayedCall(700 + i * 260, () => { n += 1; tally.setText(`Z paw prints: ${n} / 3`); });
    }
    const t = this.add.text(MAP_W / 2, MAP_H / 2 - 40 - up, title, heading(60, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 12,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(31).setScale(0.6);
    this.add.text(MAP_W / 2, MAP_H / 2 + 40 - up, line, text(28, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    this.tweens.add({ targets: t, scale: 1, duration: 320, ease: 'Back.Out' });
    if (won) audio.sfx(this, 'level-end');
    const go = () => this.leave(won);
    if (!won) { this.time.delayedCall(1300, go); return; }
    const tap = this.add.text(MAP_W / 2, MAP_H / 2 + (medal ? 180 : 100), 'Tap to continue', text(24, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    this.tweens.add({ targets: tap, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    this.time.delayedCall(600, () => {
      shade.setInteractive({ useHandCursor: true });
      shade.on('pointerup', go);
      ['ENTER', 'SPACE'].forEach((key) => this.input.keyboard.once(`keydown-${key}`, go));
    });
  }

  // Back to the level, at the bonus door's spot (Platformer.js backFromBonus).
  leave(won) {
    if (this.leaving) return;
    if (this.test) { this.startOver(); return; }
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300, 43, 29, 18);
    cam.once('camerafadeoutcomplete', () => {
      const level = this.scene.get(this.parentKey);
      this.scene.wake(this.parentKey);
      if (level && level.backFromBonus) level.backFromBonus(won, won && this.medal ? this.medal.tier : 0);
      this.scene.stop();
    });
  }
}
