// A ring-maze room (`ringMaze: {...}` in data/bonusRooms.js; not `rings`, the hoops; Unity's Crystal Heart
// first: Chris's idea, the user's choices, 2026-11-17). Everything it adds to
// BonusRoom.js lives here, behind the same hooks as circuits.js and chase.js.
// Played and tuned first as a throwaway demo (tools/unity_demo/).
//
// The rules (docs/bonus-level-ideas.md, "Sofia's and Unity's rooms"):
// - A dark cavern bigger than the screen: five rings of path round a
//   glowing crystal heart, joined by spokes, crystals blocking some
//   stretches. Only her glow (and the heart's) lights the way; the camera
//   follows her.
// - She goes the way you press and follows the path; pressing toward a
//   spoke turns her down it (the user tried both, "a is good").
// - Sparkles (Chris's, her food) along every path charge the Z meter.
// - Night Light: tap the power key. A tap spends one segment on 5 s of
//   light, which then runs out by itself; the cave lights up and the
//   Zebonkies near her run off, slip away to the pen near the top, and come
//   back in from it later.
// - A Zebonky reaching her touches her hair: up to 3 sparkles fly out of her
//   mane onto the path nearby, to grab again; it backs off.
// - The heart's path is sealed until the meter first fills; then it stays
//   open, and reaching the pad at the heart's foot ends the run. The medal
//   is for time (provisional numbers).

import { ZMeter, SEGMENTS } from '../zmeter.js?v=bb8c89c';
import { MAP_W, MAP_H } from '../data/world.js?v=bb8c89c';
import { texKey } from '../data/artsets.js?v=bb8c89c';
import { tierInfo, clock } from '../paws.js?v=bb8c89c';
import { zebonkyArt, ensureAnims, play, faceArt, FEET_ROW } from '../actors.js?v=bb8c89c';
import { audio } from '../audio.js?v=bb8c89c';
import { COLORS, heading, text } from '../theme.js?v=bb8c89c';
import { TOUCH_ONLY } from '../touch.js?v=bb8c89c';

export const owns = true;

const D = (scene) => scene.room.ringMaze;
const TAU = Math.PI * 2;
const BW = 0.13;          // half a blocking crystal, in radians of ring
const SNAP = 34;          // how near a spoke (px) counts as at it
const UNITY_K = 0.55;     // her frames on screen
const ZEB_K = 0.48;
const NIGHT_SECS = 5;     // seconds of Night Light each meter segment buys
const FIRST_IN = 1.5;    // seconds before the first Zebonky comes out of the pen
const NEXT_IN = 1.2;      // and between each one after
const rad = (d) => d * Math.PI / 180;
const ang = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const dot = (p, q) => p[0] * q[0] + p[1] * q[1];

export function reset(scene) {
  scene.rg = {
    U: null, zebs: [], sparks: [], got: 0, total: 0, lit: 0, shining: false, shineT: 0, heartOpen: false,
    openAt: -1e9, t: 0, ended: false, reached: false, touch: { up: false, down: false, light: false },
    auto: null, camSet: false, flash: 0,
  };
}

// ---------- the layout ----------

function geometry(scene) {
  const d = D(scene);
  const R = d.radii;
  const ringPos = (i, a) => [d.cx + Math.cos(a) * R[i], d.cy + Math.sin(a) * R[i] * d.sq];
  const arc = (i, a) => Math.hypot(R[i] * Math.sin(a), R[i] * d.sq * Math.cos(a));
  const tangent = (i, a) => norm([-R[i] * Math.sin(a), R[i] * d.sq * Math.cos(a)]);
  const mk = (i, A, p0, p1, extra = {}) => ({ i, A, p0, p1, len: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dir: norm([p1[0] - p0[0], p1[1] - p0[1]]), ...extra });
  const spokes = d.spokes.map(([i, deg]) => mk(i, rad(deg), ringPos(i, rad(deg)), ringPos(i + 1, rad(deg))));
  // the heart's path: from its pad (t 0) out to the inner ring (t 1)
  const HA = rad(d.heartAngle);
  spokes.push(mk(-1, HA, d.heartDoor, ringPos(0, HA), { heart: true }));
  // the pen's path: from the outer ring (t 0) up to the pen (t 1)
  const PA = rad(d.penAngle);
  const last = R.length - 1;
  spokes.push(mk(last, PA, ringPos(last, PA), d.pen, { pen: true }));
  // A crystal's half width (`w`) and the sparkle-free stretch round it
  // (`skip`). Door 1 uses BW on every ring. Bigger rooms set `blockPx`, so a
  // crystal on a ring bigger than door 1's outer one stops her no further off
  // than it does there (Crystal Heart 2 to 5).
  const blocks = d.blocks.map(([i, deg]) => {
    const w = d.blockPx ? Math.min(BW, d.blockPx / R[i]) : BW;
    return { i, b: rad(deg), w, skip: d.blockPx ? w - 0.01 : 0.12 };
  });
  return { R, ringPos, arc, tangent, spokes, blocks };
}

export function build(scene) {
  const rg = scene.rg;
  const d = D(scene);
  rg.G = geometry(scene);
  const G = rg.G;
  scene.add.image(0, 0, d.picture).setOrigin(0).setDepth(1);
  // sparkles along every ring and spoke, clear of the crystals
  const at = (p) => {
    const img = scene.add.image(p[0], p[1], 'good-vibe').setScale(0.5).setDepth(3);
    rg.sparks.push({ p, img, got: false });
  };
  G.R.forEach((r, i) => {
    const n = Math.floor(TAU * r / d.sparkStep);
    for (let k = 0; k < n; k++) {
      const a = TAU * k / n;
      if (G.blocks.some((bl) => bl.i === i && Math.abs(ang(a, bl.b)) < bl.skip)) continue;
      at(G.ringPos(i, a));
    }
  });
  G.spokes.filter((s) => !s.heart && !s.pen).forEach((s) => {
    const n = Math.max(1, Math.floor(s.len / d.sparkStep));
    for (let k = 1; k < n; k++) at([s.p0[0] + (s.p1[0] - s.p0[0]) * k / n, s.p0[1] + (s.p1[1] - s.p0[1]) * k / n]);
  });
  rg.total = rg.sparks.length;
  // the seal on the heart's path, and the light when it opens
  const hs = G.spokes.find((s) => s.heart);
  const mid = [(hs.p0[0] + hs.p1[0]) / 2, (hs.p0[1] + hs.p1[1]) / 2];
  const sealKey = texKey(scene.room.artset, 'pt_crystal_large_a.png');
  rg.seal = scene.textures.exists(sealKey)
    ? scene.add.image(mid[0], mid[1] + 24, sealKey).setOrigin(0.5, 1).setScale(0.45).setDepth(4)
    : scene.add.rectangle(mid[0], mid[1], 50, 50, 0x7d5be6).setDepth(4);
  rg.padGlow = scene.add.ellipse(d.heartDoor[0], d.heartDoor[1], 140, 56, 0xfff0a0, 0).setDepth(2);
  // her: on a ring
  rg.U = { ring: d.start[0], a: rad(d.start[1]), spoke: null, t: 0, last: 0, face: 1, moving: false };
  // the Zebonkies who want to touch her hair
  const penSpoke = G.spokes.find((sp) => sp.pen);
  rg.zebs = d.zebs.map(([, deg, artset], k) => {
    const art = zebonkyArt(scene, artset);
    ensureAnims(scene, art);
    const s = scene.add.sprite(0, 0, texKey(art.name, art.z.anims.idle.file), 0)
      .setScale(ZEB_K).setOrigin(0.5, FEET_ROW / art.z.frameHeight).setDepth(4.5);
    faceArt(s, art);
    play(s, art, 'walk');
    // They start in the pen, the respawn point near the top, and come into
    // the cave one after another down its path (the user, 2026-11-20: "the
    // zebonkies that are chasing her should start at the respawn point and
    // they are entering the cave"). The data's ring and angle are unused now.
    s.setVisible(false);
    return {
      ring: null, a: rad(deg), spoke: penSpoke, t: 1, dir: k % 2 ? 1 : -1, sdir: 1, art, s, bump: 0,
      state: 'pen', timer: FIRST_IN + k * NEXT_IN, k, justTurned: false,
    };
  });
  // the dark, drawn each frame on a canvas the size of the screen
  if (scene.textures.exists('rings-dark')) scene.textures.remove('rings-dark');
  rg.darkTex = scene.textures.createCanvas('rings-dark', MAP_W, MAP_H);
  rg.dark = scene.add.image(0, 0, 'rings-dark').setOrigin(0).setScrollFactor(0).setDepth(8);
  rg.fx = scene.add.graphics().setDepth(8.6);     // over the dark: hearts, eyes, Night Light
}

// ---------- moving along the paths ----------

const pos = (G, e) => (e.spoke
  ? [e.spoke.p0[0] + (e.spoke.p1[0] - e.spoke.p0[0]) * e.t, e.spoke.p0[1] + (e.spoke.p1[1] - e.spoke.p0[1]) * e.t]
  : G.ringPos(e.ring, e.a));

// round the ring `sign` (+: increasing angle) by `dist` px; stops at crystals
function slide(G, e, sign, dist) {
  let na = e.a + sign * dist / G.arc(e.ring, e.a), hit = false;
  G.blocks.forEach((bl) => {
    if (bl.i !== e.ring) return;
    const d0 = ang(e.a, bl.b), d1 = ang(na, bl.b);
    if (Math.abs(d1) < bl.w || (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < 1)) { na = bl.b + Math.sign(d0 || -sign) * bl.w; hit = true; }
  });
  e.a = (na + TAU) % TAU;
  return hit;
}

// the spoke ends on this walker's ring within `tol` px. `out`: the spoke
// leads away from the heart from here.
function reach(rg, e, tol, isUnity) {
  const G = rg.G;
  return G.spokes.flatMap((s) => {
    let out;
    if (s.heart) { if (!isUnity || !rg.heartOpen || e.ring !== 0) return []; out = true; }
    else if (s.pen) return [];
    else if (s.i === e.ring) out = true;
    else if (s.i + 1 === e.ring) out = false;
    else return [];
    const gap = ang(s.A, e.a) * G.arc(e.ring, e.a);
    return Math.abs(gap) <= tol ? [{ s, out }] : [];
  });
}

// on to a spoke from a ring: `out` goes away from the heart (towards t 1 on
// a ring-to-ring spoke; the heart's path runs from its pad, t 0, outwards)
function enter(e, j) {
  e.a = j.s.A;
  e.spoke = j.s;
  if (j.s.heart) e.t = 1;
  else e.t = j.out ? 0 : 1;
  e.ring = null;
}

// along a spoke by `step` px; off the end on to its ring
function along(rg, e, sign, step) {
  const s = e.spoke;
  e.t += sign * step / s.len;
  if (s.heart) {
    if (e.t <= 0) { e.t = 0; return 'heart'; }
    if (e.t >= 1) { e.ring = 0; e.a = s.A; e.spoke = null; }
    return null;
  }
  if (s.pen) {
    if (e.t <= 0) { e.ring = s.i; e.a = s.A; e.spoke = null; }
    else if (e.t >= 1) e.t = 1;
    return null;
  }
  if (e.t <= 0) { e.ring = s.i; e.a = s.A; e.spoke = null; }
  else if (e.t >= 1) { e.ring = s.i + 1; e.a = s.A; e.spoke = null; }
  return null;
}

// The direction on screen for a spoke end, seen from the ring she's on.
function spokeDir(j) {
  if (j.s.heart) return [-j.s.dir[0], -j.s.dir[1]];        // in toward the pad
  return j.out ? j.s.dir : [-j.s.dir[0], -j.s.dir[1]];
}

function stepUnity(scene, input, dt) {
  const rg = scene.rg;
  const G = rg.G;
  const U = rg.U;
  const step = D(scene).speed * dt;
  const before = pos(G, U);
  const d = norm(input);
  if (!input[0] && !input[1]) { U.moving = false; return; }
  if (!U.spoke) {
    const T = G.tangent(U.ring, U.a);
    const turn = reach(rg, U, Math.max(step, SNAP), true).map((j) => ({ j, v: dot(d, spokeDir(j)) })).sort((p, q) => q.v - p.v)[0];
    if (turn && turn.v > 0.5 && turn.v > Math.abs(dot(d, T))) { enter(U, turn.j); U.last = 0; }
    else {
      const tv = dot(d, T);
      // mostly across the path: keep on the way she was going, else lean the way pressed
      const sign = Math.abs(tv) > 0.25 ? Math.sign(tv) : (U.last || (Math.abs(tv) > 0.03 ? Math.sign(tv) : 0));
      if (sign) U.last = slide(G, U, sign, step) ? 0 : sign;
    }
  } else {
    const v = dot(d, U.spoke.dir);
    const sign = Math.abs(v) > 0.25 ? Math.sign(v) : U.last;
    if (sign) {
      if (along(rg, U, sign, step) === 'heart') { finish(scene); return; }
      U.last = U.spoke ? sign : 0;
    }
  }
  const after = pos(G, U);
  U.moving = Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.1;
  if (Math.abs(after[0] - before[0]) > 0.05) U.face = after[0] > before[0] ? 1 : -1;
}

function stepZeb(scene, z, dt) {
  const rg = scene.rg;
  const G = rg.G;
  const d = D(scene);
  const up = pos(G, rg.U);
  const zp = pos(G, z);
  const step = d.zebSpeed * dt;
  if (z.state === 'pen') {
    // waiting in the pen, then out the pen's path and back on the rings
    z.timer -= dt;
    if (z.timer <= 0) {
      z.state = 'enter';
      z.spoke = G.spokes.find((s) => s.pen);
      z.t = 1; z.ring = null;
      z.s.setVisible(true).setAlpha(0);
      scene.tweens.add({ targets: z.s, alpha: 1, duration: 400 });
    }
    return;
  }
  if (z.state === 'enter') {
    along(rg, z, -1, step);
    if (!z.spoke) { z.state = 'roam'; z.dir = Math.random() < 0.5 ? 1 : -1; }
    return;
  }
  if (z.state === 'flee') {
    // running off, away from her, then gone to the pen
    z.timer -= dt;
    if (!z.spoke) {
      const T = G.tangent(z.ring, z.a);
      z.dir = dot([zp[0] - up[0], zp[1] - up[1]], T) > 0 ? 1 : -1;
      if (slide(G, z, z.dir, step * 2.4)) z.timer = Math.min(z.timer, 0.2);
    } else along(rg, z, z.sdir, step * 2.4);
    if (z.timer <= 0) {
      z.state = 'pen';
      z.timer = d.penWait + z.k * 0.7;
      scene.tweens.add({ targets: z.s, alpha: 0, duration: 250, onComplete: () => z.s.setVisible(false) });
      z.spoke = G.spokes.find((s) => s.pen); z.t = 1; z.ring = null;
    }
    return;
  }
  // roaming: round the rings, now and then down a spoke
  if (rg.shining && Math.hypot(zp[0] - up[0], zp[1] - up[1]) < d.scareRange) {
    z.state = 'flee'; z.timer = 1.3;
    if (z.spoke) z.sdir = dot([zp[0] - up[0], zp[1] - up[1]], z.spoke.dir) > 0 ? 1 : -1;
    return;
  }
  if (!z.spoke) {
    const js = reach(rg, z, step + 3, false);
    if (js.length && !z.justTurned && Math.random() < 0.4) { enter(z, js[0]); z.sdir = z.t === 0 ? 1 : -1; return; }
    z.justTurned = js.length > 0;
    if (slide(G, z, z.dir, step)) z.dir = -z.dir;
  } else {
    along(rg, z, z.sdir, step);
    if (!z.spoke) { z.dir = Math.random() < 0.5 ? 1 : -1; z.justTurned = true; }
  }
  // reaching her: it touches her hair, and sparkles fly out of her mane
  if (!rg.shining && z.bump <= 0 && Math.hypot(zp[0] - up[0], zp[1] - up[1]) < 36) {
    z.bump = 1.2; z.dir = -z.dir; if (z.spoke) z.sdir = -z.sdir;
    rg.flash = 0.5;
    dropSparks(scene);
  }
  z.bump -= dt;
}

function dropSparks(scene) {
  const rg = scene.rg;
  const G = rg.G;
  const U = rg.U;
  const n = Math.min(D(scene).drop, rg.got);
  const from = pos(G, U);
  for (let k = 0; k < n; k++) {
    const off = [-1, 1, 2][k] * 46;
    let p;
    if (U.spoke) p = pos(G, { spoke: U.spoke, t: Math.max(0, Math.min(1, U.t + off / U.spoke.len)) });
    else p = G.ringPos(U.ring, U.a + off / G.arc(U.ring, U.a));
    const img = scene.add.image(from[0], from[1], 'good-vibe').setScale(0.5).setDepth(3);
    const sp = { p, img, got: false, dropped: true };
    rg.sparks.push(sp);
    const arcT = { k: 0 };
    scene.tweens.add({
      targets: arcT, k: 1, duration: 400,
      onUpdate: () => img.setPosition(from[0] + (p[0] - from[0]) * arcT.k, from[1] + (p[1] - from[1]) * arcT.k - Math.sin(arcT.k * Math.PI) * 50),
    });
  }
  rg.got -= n;
  if (n) audio.sfx(scene, 'toss');
}

// ---------- HUD ----------

export function buildHud(scene) {
  const rg = scene.rg;
  rg.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  const box = (x, label) => {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
    g.fillStyle(COLORS.parchment, 0.95).fillRoundedRect(x, 14, 150, 64, 10);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, 14, 150, 64, 10);
    scene.add.text(x + 75, 30, label, heading(16, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    return scene.add.text(x + 75, 56, '', heading(24, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  };
  rg.sparkText = box(MAP_W - 340, 'SPARKLES');
  rg.timeText = box(MAP_W - 176, 'TIME');
  rg.hint = scene.add.text(20, 168, 'Fill the Z meter to open the crystal heart', heading(20, '#ffffff', {
    stroke: COLORS.inkCss, strokeThickness: 6,
  })).setScrollFactor(0).setDepth(21);
  // touch: up and down over left and right (held), and a Night Light button
  const y = MAP_H - 80;
  const hold = (img, k) => {
    img.setScrollFactor(0).setAlpha(0.75).setDepth(20).setInteractive();
    img.on('pointerdown', () => { rg.touch[k] = true; img.setAlpha(1); });
    const off = () => { rg.touch[k] = false; img.setAlpha(0.75); };
    img.on('pointerup', off); img.on('pointerout', off);
    return img;
  };
  // (up and down are the scene's D-pad: scene.touch.up / down)
  rg.btn = hold(scene.add.image(MAP_W - 210, y, 'btn-power').setScale(0.8).setTint(0xb48cff), 'light');
  rg.btnLabel = scene.add.text(MAP_W - 210, MAP_H - 30, 'X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setVisible(!TOUCH_ONLY);
}

export const collide = () => false;
export const respawn = () => {};

// ---------- once a physics step ----------

export function step(scene) {
  const rg = scene.rg;
  const d = D(scene);
  if (!rg.camSet) {
    rg.camSet = true;
    Phaser.Physics.Matter.Matter.Body.setStatic(scene.ball, true);
    // (the room's door is out of sight; hide it, and its picture)
    if (scene.door) scene.door.setVisible(false);
  }
  scene.jumpAsked = false;
  if (rg.ended) return;
  const dt = 1 / 60;
  rg.t += dt;
  const k = scene.keys;
  const a = rg.auto;
  const input = a ? a.dir : [
    (k.RIGHT.isDown || k.D.isDown || scene.touch.right ? 1 : 0) - (k.LEFT.isDown || k.A.isDown || scene.touch.left ? 1 : 0),
    (k.DOWN.isDown || k.S.isDown || scene.touch.down ? 1 : 0) - (k.UP.isDown || k.W.isDown || scene.touch.up ? 1 : 0),
  ];
  const lightHeld = a ? a.light : (k.X.isDown || k.K.isDown || k.F.isDown || k.SPACE.isDown || k.Z.isDown || k.J.isDown
    || rg.touch.light || scene.touch.jump);
  // Night Light: a tap spends one segment on NIGHT_SECS of light, which then
  // runs out by itself (Chris, 2026-11-20: "don't like having to hold to use
  // night light, would like it to just run for a certain amount of time
  // before running out"). One segment a tap, not the whole meter: she needs
  // a full meter to open the heart. It was held, draining `drain` a second;
  // `drain` in the data is no longer used.
  const m = rg.meter;
  const lightTap = lightHeld && !rg.lightWas;
  rg.lightWas = lightHeld;
  if (lightTap && !rg.shining && m.fill >= 1) {
    rg.shining = true; rg.shineT = 0; rg.shineLeft = NIGHT_SECS;
    audio.sfx(scene, 'energy');
    say(scene, 'Night Light!');
  }
  if (rg.shining) {
    m.fill = Math.max(0, m.fill - dt / NIGHT_SECS);
    rg.shineT += dt;
    rg.shineLeft -= dt;
    if (rg.shineLeft <= 0 || m.fill <= 0) rg.shining = false;
  }
  rg.lit = Math.max(0, Math.min(1, rg.lit + (rg.shining ? 4 : -2) * dt));
  stepUnity(scene, input, dt);
  if (rg.ended) return;
  rg.zebs.forEach((z) => stepZeb(scene, z, dt));
  // sparkles she runs over
  const up = pos(rg.G, rg.U);
  rg.sparks.forEach((s) => {
    if (s.got || Math.hypot(s.p[0] - up[0], s.p[1] - up[1]) > 28) return;
    s.got = true;
    s.img.destroy();
    rg.got += 1;
    if (!s.dropped) m.fill = Math.min(SEGMENTS, m.fill + d.fruitStep);
    audio.sfx(scene, 'food');
  });
  if (!rg.heartOpen && m.fill >= SEGMENTS) {
    rg.heartOpen = true;
    rg.openAt = scene.time.now;
    rg.seal.setVisible(false);
    say(scene, 'The crystal heart is open!');
    audio.sfx(scene, 'correct');
    scene.tweens.add({ targets: rg.padGlow, fillAlpha: 0.55, duration: 500, yoyo: true, repeat: -1 });
  }
  rg.flash -= dt;
  // her picture's place (BonusRoom puts it on the ball)
  Phaser.Physics.Matter.Matter.Body.setPosition(scene.ball, { x: up[0], y: up[1] });
}

function say(scene, msg) {
  const t = scene.add.text(MAP_W / 2, 190, msg, heading(40, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 9 }))
    .setOrigin(0.5).setScrollFactor(0).setDepth(22);
  scene.tweens.add({ targets: t, y: 150, alpha: 0, delay: 900, duration: 700, onComplete: () => t.destroy() });
}

function finish(scene) {
  const rg = scene.rg;
  if (rg.ended) return;
  rg.ended = true;
  rg.reached = true;
  rg.shining = false;
  say(scene, 'You reached the crystal heart!');
  audio.sfx(scene, 'level-end');
  // she's drawn into the heart (BonusRoom's door tween goes to the door)
  const d = D(scene);
  if (scene.door) { scene.door.x = d.heartDoor[0]; scene.door.y = d.heartDoor[1] - 30; }
  scene.doorAt = { x: d.heartDoor[0], y: d.heartDoor[1] };
  scene.time.delayedCall(1200, () => scene.reachDoor());
}

// ---------- every frame: pictures, the dark, the HUD ----------

export function update(scene, time) {
  const rg = scene.rg;
  const G = rg.G;
  const s = scene.shaan;
  const up = pos(G, rg.U);
  s.setScale(UNITY_K).setOrigin(0.5, FEET_ROW / 128);
  if (!scene.finished) s.setPosition(up[0], up[1] + 18 - (rg.flash > 0 ? Math.abs(Math.sin(rg.flash * 30)) * 6 : 0));
  s.setFlipX(rg.U.face > 0);
  const want = rg.U.moving ? 'run' : 'idle';
  if (rg.anim !== want) { rg.anim = want; play(s, scene.art, want); }
  // the Zebonkies
  rg.zebs.forEach((z) => {
    const p = pos(G, z);
    // (faceArt: setFlipX(true) faces a Zebonky right, whichever way its art was drawn)
    if (z.lastX !== undefined && Math.abs(p[0] - z.lastX) > 0.05) z.s.setFlipX(p[0] > z.lastX);
    z.lastX = p[0];
    z.s.setPosition(p[0], p[1] + 18);
  });
  // the dark: her glow and the heart's
  const cam = scene.cameras.main;
  const ux = up[0] - cam.scrollX, uy = up[1] - cam.scrollY;
  const dk = 0.93 * (1 - rg.lit);
  const c = rg.darkTex.getContext();
  c.clearRect(0, 0, MAP_W, MAP_H);
  if (dk > 0.01) {
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = `rgba(4,4,16,${dk})`;
    c.fillRect(0, 0, MAP_W, MAP_H);
    c.globalCompositeOperation = 'destination-out';
    const gl = c.createRadialGradient(ux, uy - 10, 40, ux, uy - 10, 210);
    gl.addColorStop(0, 'rgba(0,0,0,1)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gl; c.fillRect(0, 0, MAP_W, MAP_H);
    const d = D(scene);
    const hx = d.cx - cam.scrollX, hy = d.cy - 40 - cam.scrollY;
    const hg = c.createRadialGradient(hx, hy, 40, hx, hy, 300);
    hg.addColorStop(0, rg.heartOpen ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hg; c.fillRect(0, 0, MAP_W, MAP_H);
    c.globalCompositeOperation = 'source-over';
  }
  rg.darkTex.refresh();
  // over the dark: far sparkles twinkle, Zebonky eyes glint, hearts on the near ones, Night Light's rings
  const fx = rg.fx;
  fx.clear();
  if (dk > 0.3) {
    rg.sparks.forEach((sp, k) => {
      if (sp.got) return;
      const x = sp.p[0], y = sp.p[1];
      if (Math.abs(x - up[0]) > MAP_W || Math.abs(y - up[1]) > MAP_H || Math.hypot(x - up[0], y - up[1]) < 170) return;
      const tw = Math.sin(time / 330 + k * 1.7);
      if (tw > 0.6) fx.fillStyle(0xfff2b0, (tw - 0.6) * 1.6).fillRect(x - 2, y - 2, 4, 4);
    });
  }
  rg.zebs.forEach((z) => {
    if (!z.s.visible) return;
    const p = pos(G, z);
    const far = Math.hypot(p[0] - up[0], p[1] - up[1]);
    if (dk > 0.3 && far > 170) {
      fx.fillStyle(0xfffac8, 1).fillCircle(p[0] - 7, p[1] - 12, 3).fillCircle(p[0] + 7, p[1] - 12, 3);
    } else if (z.state === 'roam' && far < 320) {
      // a heart: it wants to touch her hair
      const hx = p[0] + 12, hy = p[1] - 44;
      fx.fillStyle(0xff78aa, 1).fillCircle(hx - 4, hy - 2, 5).fillCircle(hx + 4, hy - 2, 5).fillTriangle(hx - 9, hy, hx + 9, hy, hx, hy + 9);
    }
  });
  if (rg.shining) {
    const rr = 120 + (rg.shineT % 1.2) * 520;
    if (rr < 900) fx.lineStyle(6, 0xfff5d2, 0.8).strokeCircle(up[0], up[1] - 20, rr);
  }
  // HUD
  rg.meter.update(time);
  const can = rg.meter.fill >= 1 || rg.shining;
  rg.btn.setAlpha(can ? 1 : 0.65);
  rg.btnLabel.setAlpha(can ? 1 : 0.4);
  rg.sparkText.setText(`${rg.got} / ${rg.total}`);
  rg.timeText.setText(clock(Math.floor(rg.t)));
  rg.hint.setVisible(!rg.heartOpen);
}

// ---------- the score ----------

export function medal(scene) {
  const rg = scene.rg;
  const m = D(scene).medal;
  const tier = rg.t < m.gold ? 3 : rg.t < m.silver ? 2 : 1;
  return { ...tierInfo(tier), score: rg.got, max: rg.total };
}
export function scoreLine(scene) {
  const rg = scene.rg;
  return `You reached the crystal heart in ${rg.t.toFixed(1)} seconds, with ${rg.got} sparkles.`;
}
export function scoreRow(scene, med) {
  const m = D(scene).medal;
  return { label: `Time ${clock(Math.round(scene.rg.t * 10) / 10)}`, detail: `${med.name}   (gold ${clock(m.gold)}, silver ${clock(m.silver)})` };
}
