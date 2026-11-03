// A bonus level, played as the area's Zebonky (data/bonusRooms.js). The
// level sleeps while it plays and wakes when it ends (Platformer.js
// backFromBonus): falling off the bottom or going through the door both go
// back to the level at the bonus door's spot, with the door gone. The door
// opens with Up or the door button, as in the levels (the user, 2026-11-02),
// and gives a medal by the coins gathered (currency.js MEDALS), paid on the
// level ending screen.
//
// The levels' box physics only knows flat ground and square blocks, so a
// room runs on Phaser's Matter physics: the Zebonky is a ball that rolls on
// hills and curves (the user, 2026-11-02). Shaan rolls with his own curl-up
// strip (the artset's `run`: curl, roll, uncurl when he stops).
//
// Test mode (index.html?bonustest=<level id>, the user, 2026-11-02): the
// room on its own, no level behind it. Falling off starts the room over,
// coins and all, and so does going through the door.

import { MAP_W, MAP_H } from '../data/world.js?v=1758cb2';
import { texKey } from '../data/artsets.js?v=1758cb2';
import { bonusRoomFor } from '../data/bonusRooms.js?v=1758cb2';
import { zebonkyArt, ensureAnims, faceArt, play } from '../actors.js?v=1758cb2';
import { currencyIcon, MEDALS, medalFor, medalNeeds } from '../currency.js?v=1758cb2';
import { audio } from '../audio.js?v=1758cb2';
import { COLORS, heading, text } from '../theme.js?v=1758cb2';

const Matter = () => Phaser.Physics.Matter.Matter;

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
const MAX_FALL = 24;        // px a step: about as fast as he falls
const FULL_SPEED_SLOPE = 0.7; // radians (40 degrees): full speed holds up slopes gentler than this
// Cracked rocks (Shell Bust, the user, 2026-11-02): rolling into one at this
// speed per px of its radius or faster smashes it (a 60 px rock needs 7.8,
// a 90 px one 11.7; full speed is 16).
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
// tapering to a point `under` px below its lowest point.
function outline(top, under = 300) {
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
  const pts = [[xr, yr]];
  const n = Math.max(4, Math.ceil(span / 120));
  for (let i = 0; i <= n; i++) {
    const x = xr - (span * i) / n;
    pts.push([x, deepest(x) + hang((x - xl) / span)]);
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
  }

  create() {
    const room = this.room;
    const set = this.cache.json.get(`artset:${room.artset}`) || {};
    this.cameras.main.setBackgroundColor(set.sky || '#02a9fd');
    this.buildBackdrop(set);
    this.ground = [];
    this.islands = room.islands.map((isl, i) => this.buildIsland(isl, i, set));
    (room.falls || []).forEach((f) => this.buildFalls(f, set));
    this.geysers = (room.geysers || []).map((g) => this.buildGeyser(g, set));
    this.buildCoins();
    this.rocks = (room.rocks || []).map((r, i) => this.buildRock(r, i, set));
    (room.walls || []).forEach((w, i) => this.buildWall(w, i, set));
    this.bumpers = (room.bumpers || []).map((bd) => this.buildBumper(bd));
    this.pools = (room.pools || []).map((w) => this.buildPool(w, set));
    this.rings = (room.rings || []).map((r) => this.buildRing(r));
    this.unit = this.coins.length ? 'coins' : 'rings';
    this.buildDoor(set);
    this.buildShaan();
    this.buildHud();
    this.buildControls();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.width, room.height);
    cam.startFollow(this.shaan, true, 0.12, 0.12);
    // The physics, once per Matter step (step()).
    // (Shutting the scene down destroys its world, listener and all.)
    this.matter.world.on('beforeupdate', () => this.step());
    // Rolling into a cracked rock: fast enough, it smashes and he rolls on
    // through (the contact is cancelled); too slow, he bounces off.
    this.matter.world.on('collisionstart', (ev) => ev.pairs.forEach((pair) => {
      const bump = pair.bodyA.bumper || pair.bodyB.bumper;
      if (bump && (pair.bodyA === this.ball || pair.bodyB === this.ball)) { this.bounce(bump); return; }
      const rock = pair.bodyA.rock || pair.bodyB.rock;
      const ball = pair.bodyA === this.ball || pair.bodyB === this.ball;
      if (!rock || !ball || rock.broken) return;
      if (this.dashing && this.lastSpeed >= rock.need) {
        pair.isActive = false;
        this.breakRock(rock);
      } else if (this.time.now > (rock.toldAt || 0) + 800) {
        rock.toldAt = this.time.now;
        this.floatText(rock.x, rock.y - rock.r - 30, this.dashing ? 'Faster!' : 'Double tap to dash!');
      }
    }));
    cam.fadeIn(300, 43, 29, 18);
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
    const { curve, shape } = outline(isl.top, isl.under);
    const pad = 70;
    const xs = shape.map((p) => p[0]);
    const ys = shape.map((p) => p[1]);
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
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
    const skin = set.skin || {};
    const rock = img(skin.rock || 'sk_rock.png');
    path();
    if (rock) {
      const pat = ctx.createPattern(rock, 'repeat');
      pat.setTransform(new DOMMatrix().translate(x0, y0).scale(0.75));
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
    path();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2b1d12';
    ctx.stroke();
    // The moss along the top, a slice of the strip for each bit of curve.
    const moss = img(skin.moss || 'sk_moss.png');
    if (moss) {
      let along = 0;
      for (let k = 0; k < curve.length - 1; k++) {
        const [ax, ay] = curve[k];
        const [bx, by] = curve[k + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const sx = along % (moss.width - 16);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(Math.atan2(by - ay, bx - ax));
        ctx.drawImage(moss, sx, 0, Math.ceil(len) + 2, moss.height, 0, -14, Math.ceil(len) + 2, moss.height);
        ctx.restore();
        along += len;
      }
    }
    tex.refresh();
    this.add.image(x0, y0, key).setOrigin(0).setDepth(2);

    // The body: each edge of the outline a box on the inside of it.
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
    return { curve, left: isl.top[0][0], right: isl.top[isl.top.length - 1][0] };
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
    const key = currencyIcon(this);
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
    const ckey = currencyIcon(this);
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
      .setScale(SCALE).setOrigin(0.5, CENTRE_Y).setDepth(5);
    faceArt(s, this.art);
    s.setFlipX(true);
    play(s, this.art, 'idle');
    this.shaan = s;
    this.ball = this.matter.add.circle(x, y, RADIUS, {
      friction: 0.8, frictionStatic: 0.9, frictionAir: 0.004, restitution: 0.05, label: 'shaan',
    });
  }

  buildHud() {
    const box = this.add.graphics().setScrollFactor(0).setDepth(20);
    box.fillStyle(COLORS.parchment, 0.95);
    box.fillRoundedRect(MAP_W / 2 - 170, 14, 340, 50, 16);
    box.lineStyle(3, COLORS.ink, 1);
    box.strokeRoundedRect(MAP_W / 2 - 170, 14, 340, 50, 16);
    this.add.text(MAP_W / 2, 39, this.room.name, heading(24, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    if (this.unit === 'rings') {
      const ic = this.add.graphics().setScrollFactor(0).setDepth(21).setPosition(MAP_W - 150, 40);
      ic.lineStyle(7, COLORS.ink, 1).strokeEllipse(0, 0, 22, 36);
      ic.lineStyle(4, 0xffc93c, 1).strokeEllipse(0, 0, 22, 36);
    } else this.add.image(MAP_W - 150, 40, 'currency-coin').setScrollFactor(0).setDepth(21);
    this.coinText = this.add.text(MAP_W - 126, 40, `0 / ${this.totalCoins()}`, heading(24, '#ffffff', {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);

    if (this.test) {
      this.add.text(20, 20, 'TEST MODE', heading(20, '#ffffff', {
        backgroundColor: '#b3261e', padding: { x: 10, y: 4 },
      })).setScrollFactor(0).setDepth(21);
    }
    if (this.retry) return;
    // What to do, for a moment.
    const say = this.add.text(MAP_W / 2, MAP_H / 2 - 120, this.room.intro || 'Roll Shaan to the door!\nMind the gaps.', heading(40, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 10, align: 'center',
    })).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    this.tweens.add({ targets: say, alpha: 0, delay: 2600, duration: 500, onComplete: () => say.destroy() });
    this.intro = say;
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
    return pts.some((p) => Matter().Query.point(this.ground, p).length > 0);
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
    s.setPosition(b.position.x, b.position.y);
    this.animateWater(delta);
    if (this.finished) return;

    const left = k.LEFT.isDown || k.A.isDown || this.touch.left;
    const right = k.RIGHT.isDown || k.D.isDown || this.touch.right;
    this.dir = (right ? 1 : 0) - (left ? 1 : 0);
    // A double tap that way dashes (asked here, done in the next step).
    let tap = this.tapped;
    this.tapped = 0;
    if (Phaser.Input.Keyboard.JustDown(k.RIGHT) || Phaser.Input.Keyboard.JustDown(k.D)) tap = 1;
    if (Phaser.Input.Keyboard.JustDown(k.LEFT) || Phaser.Input.Keyboard.JustDown(k.A)) tap = -1;
    if (tap) {
      if (time - this.tapAt[tap] < DOUBLE_TAP_MS) this.dashAsked = tap;
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
    } else {
      s.setRotation(0);
      const rolling = time - this.movedAt < UNCURL_AFTER;
      play(s, this.art, rolling ? 'run' : 'idle');
      s.anims.timeScale = rolling ? Phaser.Math.Clamp(speed / 7, 0.6, 2.4) : 1;
    }

    // Rings: dash through the middle for their coins.
    this.rings.forEach((r) => {
      // Touching any of it counts (the user, 2026-11-02), the hoop included.
      const ex = (b.position.x - r.x) / (r.r * 0.55 + RADIUS);
      const ey = (b.position.y - r.y) / (r.r + RADIUS);
      if (r.done || ex * ex + ey * ey > 1) return;
      if (this.dashing) this.takeRing(r);
      else if (time > (r.toldAt || 0) + 1000) {
        r.toldAt = time;
        this.floatText(r.x, r.y - r.r - 20, 'Dash through!');
      }
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
    const icon = this.add.image(rd.x, rd.y, currencyIcon(this)).setDepth(5.3).setAlpha(0.85)
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
    if (this.leaving || this.finished) return;
    const M = Matter();
    const b = this.ball;
    const time = this.time.now;
    const dir = this.dir || 0;
    this.lastSpeed = Math.hypot(b.velocity.x, b.velocity.y);   // for the rocks, before this step
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

  reachDoor() {
    this.finished = true;
    this.doorHint.setVisible(false);
    this.btnDoor.setVisible(false);
    this.medal = medalFor(this.coinsGot, this.totalCoins());
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
      this.unit === 'rings' ? `You claimed ${this.coinsGot} of ${this.totalCoins()} rings.`
        : `You gathered ${this.coinsGot} of ${this.totalCoins()} coins.`, true, this.medal));
  }

  fellOff() {
    this.finished = true;
    Matter().Body.setStatic(this.ball, true);
    if (this.test) { this.startOver(); return; }
    this.endCard('Whoops!', 'Back to the level.', false);
  }

  // Test mode: the room from the start again.
  startOver() {
    this.leaving = true;
    this.scene.restart({ levelId: this.levelId, test: true, retry: true });
  }

  endCard(title, line, won, medal = null) {
    if (this.intro && this.intro.active) this.intro.destroy();
    const shade = this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.35).setOrigin(0).setScrollFactor(0).setDepth(30);
    // The medal: a disc in its colour, its name, and what the others need.
    if (medal) {
      const my = MAP_H / 2 - 190;
      const disc = this.add.graphics().setScrollFactor(0).setDepth(31);
      disc.fillStyle(COLORS.ink, 1).fillCircle(MAP_W / 2 + 4, my + 5, 58);
      disc.fillStyle(medal.color, 1).fillCircle(MAP_W / 2, my, 56);
      disc.lineStyle(5, COLORS.ink, 1).strokeCircle(MAP_W / 2, my, 56);
      disc.lineStyle(3, 0xffffff, 0.6).strokeCircle(MAP_W / 2, my, 42);
      this.add.text(MAP_W / 2, my, String(medal.tier), heading(46, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(32);
      this.add.text(MAP_W / 2, MAP_H / 2 + 86, `${medal.name} medal: +${medal.tier} currency`, heading(30, COLORS.yellowCss, {
        stroke: COLORS.inkCss, strokeThickness: 8,
      })).setOrigin(0.5).setScrollFactor(0).setDepth(31);
      const goals = MEDALS.filter((m) => m.from > 0).map((m) => `${m.name} ${medalNeeds(m, this.totalCoins())} ${this.unit}`).join('   ');
      this.add.text(MAP_W / 2, MAP_H / 2 + 132, goals, text(20, COLORS.parchmentCss, {
        stroke: COLORS.inkCss, strokeThickness: 5,
      })).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    }
    const t = this.add.text(MAP_W / 2, MAP_H / 2 - 40, title, heading(60, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 12,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(31).setScale(0.6);
    this.add.text(MAP_W / 2, MAP_H / 2 + 40, line, text(28, COLORS.parchmentCss, {
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
