// A foam room (`foam: {...}` in data/bonusRooms.js; Axel's Break the Bubble
// first, the user, 2026-11-17). Everything it adds to BonusRoom.js lives
// here, behind the same hooks as zpower.js (build, buildHud, collide, step,
// update, medal, scoreLine, scoreRow, respawn).
//
// The rules (decided by the user, docs/bonus-level-ideas.md):
// - Axel is in a pool with puffs on its floor. He throws from one fixed spot
//   at the surface, from his tail, at an angle: the arrows swing the aim,
//   and a dotted line predicts the path, bouncing off the screen's edges.
//   After each throw he dives, fetches the next puff from the floor by
//   himself (its kind chosen for him) and comes back to the spot.
// - Four kinds, each a tint with its own picture. A thrown puff sticks
//   where it meets the field; five or more of a kind connected break. Puffs
//   left with nothing holding them up fall into the water (a match on a
//   dangling bit drops the whole bit).
// - Every puff broken or fallen charges the Z meter. A press of the power
//   key (X, K or F, or the button) with a full segment fires a shockwave at
//   the cluster the aim line hits. With a full meter a press activates the
//   Sonic Boom; his next throw is a cone along the aim, breaking the puffs of
//   the kind he holds inside it.
// - Score: 1 a field puff broken, 2 one fallen, 10 a trapped Z-bolt. Gold at
//   90% of the room's most, silver at 60%. The timer counts up; it isn't
//   scored. One field per bonus level. Clear it and he leaves the pool and
//   walks along the shore to the portal, off screen till then.

import { ZMeter, SEGMENTS } from '../zmeter.js?v=4607924';
import { MAP_W, MAP_H } from '../data/world.js?v=4607924';
import { tierInfo, clock } from '../paws.js?v=4607924';
import { play } from '../actors.js?v=4607924';
import { audio } from '../audio.js?v=4607924';
import { COLORS, heading, text } from '../theme.js?v=4607924';
import { TOUCH_ONLY } from '../touch.js?v=4607924';

const MATCH = 5;                      // this many connected break (the user; 6 until 2026-11-18)
const PER_PUFF = 1 / 10;              // meter charge for each puff broken or fallen (provisional)
const THROW_SPEED = 20;               // px a step
const AIM_TURN = 0.03;                // radians a step the arrows swing the aim
const AIM_MAX = 1.45;                 // about 83 degrees either side of straight up (72 until the
                                      // user, 2026-11-18: "need to be able to aim farther down")
const FETCH_MS = 420;                 // down to the floor, and the same back up
// He throws from his tail (the user, 2026-11-17): the held puff rides its
// tip, behind him and a little up. Offsets from his middle, facing right.
const TAIL = { x: -58, y: -34 };
// The four kinds: a tint and its picture (provisional; the user chose four,
// each tint always with the same picture).
export const KINDS = [
  { tint: '#ff9ec7', ink: '#7a2848', pic: 'shell' },
  { tint: '#7cc8ff', ink: '#1f4f7a', pic: 'star' },
  { tint: '#7fe8c4', ink: '#1d6650', pic: 'pearl' },
  { tint: '#ffd76a', ink: '#7a5512', pic: 'clam' },
];
const Matter = () => Phaser.Physics.Matter.Matter;

export const owns = true;   // its own step and update (BonusRoom skips its rolling)

export function reset(scene) {
  scene.fm = {
    sec: 0, flying: null, held: 0, hasPuff: true, moving: false, fetching: false, camSet: false,
    score: 0, broken: 0, fallen: 0, bolts: 0, bonusBolts: 0, total: 0, boltTotal: 0,
    aim: 0, aimHit: null, aimEnd: null, toldAt: 0, rnd: 1, slots: [],
  };
}

// ---- the puffs' pictures: drawn at half size and shown at 2x, unsmoothed,
// so they sit with the pixel art ----
function puffTexture(scene, k, R) {
  const key = `foam-puff-${k}`;
  if (scene.textures.exists(key)) return key;
  const S = Math.ceil(R + 4);
  const tex = scene.textures.createCanvas(key, S, S);
  const ctx = tex.getContext();
  const c = S / 2, r = R / 2;
  const kind = KINDS[k];
  const blob = () => {
    ctx.beginPath();
    ctx.arc(c, c + r * 0.12, r * 0.62, 0, Math.PI * 2);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      ctx.moveTo(c + Math.cos(a) * r * 0.5 + r * 0.42, c + Math.sin(a) * r * 0.5);
      ctx.arc(c + Math.cos(a) * r * 0.5, c + Math.sin(a) * r * 0.5, r * 0.42, 0, Math.PI * 2);
    }
  };
  ctx.fillStyle = '#1b1a2e';
  ctx.save(); ctx.translate(c, c); ctx.scale(1.12, 1.12); ctx.translate(-c, -c); blob(); ctx.fill(); ctx.restore();
  ctx.fillStyle = kind.tint;
  blob(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(c - r * 0.3, c - r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = kind.ink;
  ctx.strokeStyle = kind.ink;
  ctx.lineWidth = 1.5;
  const p = r * 0.34;
  ctx.beginPath();
  if (kind.pic === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? p * 0.45 : p;
      ctx[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * d, c + r * 0.08 + Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill();
  } else if (kind.pic === 'shell') {
    ctx.moveTo(c, c + p * 1.0);
    ctx.arc(c, c + p * 1.0, p * 1.3, -Math.PI * 0.82, -Math.PI * 0.18);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = kind.tint;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(c, c + p); ctx.lineTo(c + i * p * 0.7, c - p * 0.15); ctx.stroke(); }
  } else if (kind.pic === 'pearl') {
    ctx.arc(c, c + r * 0.06, p * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(c - p * 0.3, c - p * 0.2, p * 0.25, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.ellipse(c, c + r * 0.1, p * 1.15, p * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = kind.tint;
    ctx.beginPath(); ctx.moveTo(c - p * 1.1, c + r * 0.1); ctx.lineTo(c + p * 1.1, c + r * 0.1); ctx.stroke();
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

const F = (scene) => scene.room.foam;
function cellXY(scene, sec, r, c) {
  const f = F(scene);
  return [sec.x + f.left + f.radius + c * 2 * f.radius + (r % 2 ? f.radius : 0), f.top + r * f.row];
}
const keyOf = (r, c) => `${r},${c}`;
function neighbours(r, c) {
  const d = [[0, -1], [0, 1], [-1, 0], [1, 0], ...(r % 2 === 0 ? [[-1, -1], [1, -1]] : [[-1, 1], [1, 1]])];
  return d.map(([a, b]) => [r + a, c + b]);
}
// The flying puff's walls: the field's (the screen's) edges.
function walls(scene) {
  const f = F(scene);
  const x0 = section(scene).x + f.left;
  return [x0 + f.radius, x0 + f.cols * 2 * f.radius - f.radius];
}

function makePuff(scene, sec, r, c, kind, bolt) {
  const f = F(scene);
  const [x, y] = cellXY(scene, sec, r, c);
  const s = scene.add.image(x, y, puffTexture(scene, kind, f.radius)).setScale(2).setDepth(4);
  let b = null;
  if (bolt) b = scene.add.image(x, y + 2, 'zbolt').setScale(0.9).setDepth(4.1);
  return { r, c, kind, bolt: !!bolt, sprite: s, boltImg: b };
}

export function build(scene) {
  const fm = scene.fm;
  const f = F(scene);
  fm.sections = f.sections.map((s) => ({ name: s.name, x: s.x, cells: new Map() }));
  fm.sections.forEach((sec, i) => {
    f.sections[i].cells.forEach(([r, c, kind, bolt]) => {
      sec.cells.set(keyOf(r, c), makePuff(scene, sec, r, c, kind, bolt));
      fm.total += 1;
      if (bolt) fm.boltTotal += 1;
    });
  });
  // The puffs on the pool floor (the user: "a bunch of them on the bottom").
  fm.slots = f.slots.map((x) => {
    const kind = pick(scene);
    const s = scene.add.image(x, f.floor, puffTexture(scene, kind, f.radius)).setScale(2).setDepth(1.55).setAlpha(0.9);
    scene.tweens.add({ targets: s, y: f.floor - 5, duration: 900 + (x % 7) * 60, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return { x, kind, sprite: s, taken: false };
  });
  fm.held = pick(scene);
  fm.heldImg = scene.add.image(0, 0, puffTexture(scene, fm.held, f.radius)).setScale(2).setDepth(6);
  fm.aimG = scene.add.graphics().setDepth(7);
}

function section(scene) { return scene.fm.sections[scene.fm.sec]; }

// A kind still in the field, weighted toward its bottom edge (the ones he
// can reach; an even pick of all four made a field take ~750 throws).
function pick(scene) {
  const fm = scene.fm;
  fm.rnd = (fm.rnd * 1103515245 + 12345) >>> 0;
  const cells = [...section(scene).cells.values()];
  if (!cells.length) return (fm.rnd >>> 8) % 4;
  const exposed = cells.filter((q) => !cells.some((o) => o.r === q.r + 1 && Math.abs(o.c - q.c) <= 1));
  const w = [0, 0, 0, 0];
  exposed.forEach((q) => { w[q.kind] += 1; });
  cells.forEach((q) => { w[q.kind] += 0.15; });
  const weights = w.map((x) => x * x);
  let roll = ((fm.rnd >>> 8) / 16777216) * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < 4; k++) { roll -= weights[k]; if (roll <= 0 && weights[k] > 0) return k; }
  return cells[0].kind;
}

export function buildHud(scene) {
  const fm = scene.fm;
  fm.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  const box = (x, label) => {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
    g.fillStyle(COLORS.parchment, 0.95).fillRoundedRect(x, 14, 150, 64, 10);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, 14, 150, 64, 10);
    scene.add.text(x + 75, 30, label, heading(16, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    return scene.add.text(x + 75, 56, '', heading(26, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  };
  fm.scoreText = box(MAP_W - 340, 'SCORE');
  fm.timeText = box(MAP_W - 176, 'TIME');
  scene.add.image(MAP_W - 420, 46, 'zbolt').setScrollFactor(0).setDepth(21).setScale(1.1);
  fm.boltText = scene.add.text(MAP_W - 396, 46, '0', heading(24, '#ffffff', { stroke: COLORS.inkCss, strokeThickness: 6 }))
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
  // Above the jump button (2026-11-20): beside it, it sat on the bubble tray.
  const btn = scene.add.image(MAP_W - 90, MAP_H - 230, 'btn-power').setScale(0.8).setTint(0xffc93c)
    .setScrollFactor(0).setDepth(21).setAlpha(0.65).setInteractive();
  btn.on('pointerdown', () => { scene.touch.blast = true; });
  const up = () => { scene.touch.blast = false; };
  btn.on('pointerup', up);
  btn.on('pointerout', up);
  fm.btn = btn;
  fm.btnLabel = scene.add.text(MAP_W - 90, MAP_H - 182, 'X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setAlpha(0.4).setVisible(!TOUCH_ONLY);
  refresh(fm);
}

function refresh(fm) {
  fm.scoreText.setText(String(fm.score).padStart(6, '0'));
  fm.boltText.setText(String(fm.bolts + fm.bonusBolts));
}

export const collide = () => false;
export const respawn = () => {};

// Which way he faces (1 right, -1 left). Kept here: the sprite's flipX
// reads the other way round for Axel's right-facing art, and the held puff
// was drawn at his head.
function face(scene, d) {
  scene.fm.face = d;
  scene.shaan.setFlipX(d > 0);
}

// Where a throw starts: his tail tip, at the spot.
export function origin(scene) {
  const f = F(scene);
  const [sx, sy] = f.spot;
  return [section(scene).x + sx + TAIL.x, sy + TAIL.y - 12];
}

// The path a throw at `aim` takes, bouncing off the edges, to the first
// puff it meets (or the top): { pts, x, y, hit }.
export function predict(scene, aim, from = origin(scene)) {
  const f = F(scene);
  const [w0, w1] = walls(scene);
  const cells = [...section(scene).cells.values()];
  let [x, y] = from;
  let vx = Math.sin(aim) * 6, vy = -Math.cos(aim) * 6;
  const pts = [];
  // a near-flat aim climbs slowly, so the path gets room to reach the field
  for (let i = 0; i < 1600; i++) {
    x += vx; y += vy;
    if (x < w0) { x = 2 * w0 - x; vx = -vx; }
    if (x > w1) { x = 2 * w1 - x; vx = -vx; }
    if (i % 4 === 0) pts.push([x, y]);
    const hit = cells.find((q) => Math.hypot(q.sprite.x - x, q.sprite.y - y) < 2 * f.radius * 0.9);
    if (hit || y <= f.top) return { pts, x, y, hit: hit || null };
  }
  return { pts, x, y, hit: null };
}

// Once a physics step: the aim, the throw in flight, the power key.
export function step(scene, time, dir) {
  const fm = scene.fm;
  const f = F(scene);
  const cam = scene.cameras.main;
  const b = scene.ball;
  const M = Matter();
  if (!fm.camSet) {
    fm.camSet = true;
    cam.stopFollow();
    cam.setScroll(section(scene).x, 0);
    M.Body.setStatic(b, true);
  }
  if (!fm.moving) {
    fm.aim = Phaser.Math.Clamp(fm.aim + dir * AIM_TURN, -AIM_MAX, AIM_MAX);
    if (!fm.fetching) {
      const [sx, sy] = f.spot;
      M.Body.setPosition(b, { x: section(scene).x + sx, y: sy + Math.sin(time / 260) * 3 });
    }
    if (scene.jumpAsked && !fm.flying && !fm.fetching && fm.hasPuff) throwPuff(scene);
  }
  scene.jumpAsked = false;
  if (fm.flying) {
    const p = fm.flying;
    const [w0, w1] = walls(scene);
    p.x += p.vx; p.y += p.vy;
    if (p.x < w0) { p.x = 2 * w0 - p.x; p.vx = -p.vx; }
    if (p.x > w1) { p.x = 2 * w1 - p.x; p.vx = -p.vx; }
    p.sprite.setPosition(p.x, p.y);
    const touched = [...section(scene).cells.values()].find((q) => Math.hypot(q.sprite.x - p.x, q.sprite.y - p.y) < 2 * f.radius * 0.9);
    if (p.y <= f.top || touched) land(scene, p, touched);
  }
  // The power key. With a full meter a press activates the Sonic Boom (the
  // user: "activated and then thrown"); his next throw is the cone. With a
  // full segment short of full, it's the shockwave, at what the aim hits.
  const held = fm.holdPower;
  if (held && !fm.pressed && !fm.moving) {
    if (fm.meter.full && !fm.boomReady) activateBoom(scene);
    else if (!fm.boomReady) shockwave(scene);
  }
  fm.pressed = held;
}

function activateBoom(scene) {
  const fm = scene.fm;
  fm.boomReady = true;
  fm.meter.fill = 0;
  const [x, y] = origin(scene);
  scene.floatText(x + 60, y - 90, 'Sonic Boom! Throw it!');
  audio.sfx(scene, 'correct');
  ring(scene, x, y, 0xffe600, 90, 420);
}

function throwPuff(scene) {
  const fm = scene.fm;
  const f = F(scene);
  const [x, y] = origin(scene);
  const s = scene.shaan;
  scene.tweens.add({ targets: s, angle: 14, duration: 80, yoyo: true, ease: 'Sine.Out' });
  if (fm.boomReady) {
    fm.boomReady = false;
    coneBoom(scene, x, y, fm.aim, fm.held);
  } else {
    const sprite = scene.add.image(x, y, puffTexture(scene, fm.held, f.radius)).setScale(2).setDepth(5);
    fm.flying = { x, y, vx: Math.sin(fm.aim) * THROW_SPEED, vy: -Math.cos(fm.aim) * THROW_SPEED, kind: fm.held, sprite };
  }
  fm.hasPuff = false;
  audio.sfx(scene, 'toss');
  scene.time.delayedCall(120, () => fetchNext(scene));
}

// Down to the floor for the next puff (its kind chosen for him) and back up
// to the spot (the user: he fetches by himself, from one spot).
function fetchNext(scene) {
  const fm = scene.fm;
  const f = F(scene);
  if (fm.moving) return;
  const kind = pick(scene);
  const free = fm.slots.filter((s) => !s.taken);
  let slot = free.filter((s) => s.kind === kind).sort((a, b) => Math.abs(a.x - f.spot[0]) - Math.abs(b.x - f.spot[0]))[0];
  if (!slot) {
    // none of that kind lying there: the nearest one turns into it
    slot = free.sort((a, b) => Math.abs(a.x - f.spot[0]) - Math.abs(b.x - f.spot[0]))[0];
    slot.kind = kind;
    slot.sprite.setTexture(puffTexture(scene, kind, f.radius));
  }
  slot.taken = true;
  fm.fetching = true;
  const M = Matter();
  const b = scene.ball;
  const sx = section(scene).x;
  const [px, py] = [sx + f.spot[0], f.spot[1]];
  const bx = sx + slot.x;               // his middle over the puff
  const by = f.floor - 10;
  const go = { t: 0 };
  face(scene, slot.x >= f.spot[0] ? 1 : -1);
  scene.tweens.add({
    targets: go, t: 1, duration: FETCH_MS, ease: 'Sine.InOut',
    onUpdate: () => M.Body.setPosition(b, { x: px + (bx - px) * go.t, y: py + (by - py) * go.t }),
    onComplete: () => {
      // grab it; a new one settles in its place a moment later
      slot.sprite.setVisible(false);
      fm.held = slot.kind;
      fm.hasPuff = true;
      fm.heldImg.setTexture(puffTexture(scene, fm.held, f.radius));
      scene.time.delayedCall(700, () => {
        slot.kind = pick(scene);
        slot.sprite.setTexture(puffTexture(scene, slot.kind, f.radius)).setVisible(true).setAlpha(0);
        scene.tweens.add({ targets: slot.sprite, alpha: 0.9, duration: 300 });
        slot.taken = false;
      });
      const back = { t: 0 };
      scene.tweens.add({
        targets: back, t: 1, duration: FETCH_MS, ease: 'Sine.InOut',
        onUpdate: () => M.Body.setPosition(b, { x: bx + (px - bx) * back.t, y: by + (py - by) * back.t }),
        onComplete: () => { fm.fetching = false; },
      });
    },
  });
}

// Stick to the nearest free cell touching the field (or the top row).
function land(scene, p, hitPuff) {
  const fm = scene.fm;
  const f = F(scene);
  const sec = section(scene);
  let best = null;
  const r0 = Math.round((p.y - f.top) / f.row);
  for (let r = Math.max(0, r0 - 1); r <= r0 + 1; r++) {
    for (let c = 0; c < f.cols - (r % 2); c++) {
      if (sec.cells.has(keyOf(r, c))) continue;
      const touches = r === 0 || neighbours(r, c).some(([a, b]) => sec.cells.has(keyOf(a, b)));
      if (!touches) continue;
      const [x, y] = cellXY(scene, sec, r, c);
      const d = Math.hypot(x - p.x, y - p.y);
      if (!best || d < best.d) best = { r, c, d };
    }
  }
  p.sprite.destroy();
  fm.flying = null;
  if (!best || best.r >= f.maxRows) {
    // Too low: it knocks the puff it hit loose instead (a column hanging to
    // the limit made every throw under it fizzle, so a player could be stuck).
    if (hitPuff && sec.cells.get(keyOf(hitPuff.r, hitPuff.c)) === hitPuff) {
      scene.floatText(p.x, p.y, 'Bump!');
      breakPuff(scene, sec, hitPuff);
      dropLoose(scene, sec);
      afterClear(scene);
    }
    return;
  }
  const puff = makePuff(scene, sec, best.r, best.c, p.kind, 0);
  puff.own = true;   // his own foam: it charges the meter but scores nothing
  sec.cells.set(keyOf(best.r, best.c), puff);
  audio.sfx(scene, 'food');
  const group = flood(sec, best.r, best.c, (q) => q.kind === p.kind);
  if (group.length >= MATCH) {
    group.forEach((q) => breakPuff(scene, sec, q));
    scene.floatText(puff.sprite.x, puff.sprite.y + 40, group.length >= 10 ? 'Splash!' : 'Pop!');
    // whatever was hanging from them falls, the whole dangling bit
    dropLoose(scene, sec);
    afterClear(scene);
  }
}

export function flood(sec, r, c, ok) {
  const out = [];
  const seen = new Set([keyOf(r, c)]);
  const todo = [[r, c]];
  while (todo.length) {
    const [a, b] = todo.pop();
    const q = sec.cells.get(keyOf(a, b));
    if (!q || !ok(q)) continue;
    out.push(q);
    neighbours(a, b).forEach(([x, y]) => {
      const k = keyOf(x, y);
      if (!seen.has(k) && sec.cells.has(k)) { seen.add(k); todo.push([x, y]); }
    });
  }
  return out;
}

// (Only the field's own puffs score: counting the ones he threw let a
// score run past the room's most.)
function award(scene, q, points) {
  const fm = scene.fm;
  if (!q.own) fm.score += points;
  fm.meter.fill = Math.min(SEGMENTS, fm.meter.fill + PER_PUFF);
  if (q.bolt) {
    fm.bolts += 1;
    fm.score += 10;
    const t = scene.add.image(q.sprite.x, q.sprite.y, 'zbolt').setScale(1.4).setDepth(9);
    scene.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    scene.floatText(q.sprite.x, q.sprite.y - 30, '+10');
    audio.sfx(scene, 'correct');
  }
  refresh(fm);
}

function breakPuff(scene, sec, q) {
  sec.cells.delete(keyOf(q.r, q.c));
  if (!q.own) scene.fm.broken += 1;
  award(scene, q, 1);
  const parts = [q.sprite, q.boltImg].filter(Boolean);
  scene.tweens.add({ targets: parts, scale: 2.8, alpha: 0, duration: 260, onComplete: () => parts.forEach((s) => s.destroy()) });
}

// Whatever no longer hangs from the top row falls into the water: 2 each.
function dropLoose(scene, sec) {
  const f = F(scene);
  const held = new Set();
  [...sec.cells.values()].filter((q) => q.r === 0).forEach((q) => {
    flood(sec, q.r, q.c, () => true).forEach((x) => held.add(keyOf(x.r, x.c)));
  });
  const loose = [...sec.cells.values()].filter((q) => !held.has(keyOf(q.r, q.c)));
  loose.forEach((q, i) => {
    sec.cells.delete(keyOf(q.r, q.c));
    if (!q.own) scene.fm.fallen += 1;
    award(scene, q, 2);
    const parts = [q.sprite, q.boltImg].filter(Boolean);
    scene.tweens.add({ targets: parts, y: f.surface + 10, duration: 420 + i * 12, ease: 'Quad.In', onComplete: () => {
      parts.forEach((s) => s.destroy());
      const splash = scene.add.ellipse(q.sprite.x, f.surface + 6, 50, 14, 0xffffff, 0.8).setDepth(5);
      scene.tweens.add({ targets: splash, scaleX: 1.8, alpha: 0, duration: 300, onComplete: () => splash.destroy() });
    } });
  });
  if (loose.length) {
    scene.floatText(MAP_W / 2 + scene.cameras.main.scrollX, 300, `${loose.length} fell! +${loose.length * 2}`);
    audio.sfx(scene, 'splash');
  }
}

// A press with a full segment: a shockwave at the cluster the aim line hits.
function shockwave(scene) {
  const fm = scene.fm;
  const f = F(scene);
  const sec = section(scene);
  const [ox, oy] = origin(scene);
  if (fm.meter.fill < 1 - 1e-6) {
    if (scene.time.now > fm.toldAt + 900) { fm.toldAt = scene.time.now; scene.floatText(ox + 60, oy - 80, 'Fill a segment!'); }
    return;
  }
  const target = predict(scene, fm.aim).hit;
  if (!target) { scene.floatText(ox + 60, oy - 80, 'Aim at the foam!'); return; }
  fm.meter.fill = Math.max(0, fm.meter.fill - 1);
  const reach = 2 * f.radius * 2.2;
  const hit = [...sec.cells.values()].filter((q) => Math.hypot(q.sprite.x - target.sprite.x, q.sprite.y - target.sprite.y) <= reach);
  ring(scene, target.sprite.x, target.sprite.y, 0xbff8ff, 160, 420);
  scene.cameras.main.shake(140, 0.006);
  scene.floatText(target.sprite.x, target.sprite.y + 60, 'Shockwave!');
  audio.sfx(scene, 'crate');
  hit.forEach((q) => breakPuff(scene, sec, q));
  dropLoose(scene, sec);
  afterClear(scene);
}

// The Sonic Boom, thrown: a cone widening from his tail tip along the aim
// (the user: "the sonic boom needs to be a cone"), breaking the puffs of the
// kind he was holding that are inside it, and only those (the user's pick),
// each as the cone's front reaches it.
export const CONE = Math.tan((24 * Math.PI) / 180);
const CONE_MS = 380;
const CONE_REACH = 760;
export function inCone(x, y, aim, qx, qy, radius) {
  const dx = qx - x, dy = qy - y;
  const along = dx * Math.sin(aim) - dy * Math.cos(aim);
  const across = Math.abs(dx * Math.cos(aim) + dy * Math.sin(aim));
  return along > 0 && along <= CONE_REACH && across <= along * CONE + radius * 0.6;
}
function coneBoom(scene, x, y, aim, kind) {
  const f = F(scene);
  const sec = section(scene);
  const g = scene.add.graphics({ x, y }).setDepth(8);
  const w = CONE_REACH * CONE;
  g.fillStyle(0xfff27a, 0.28).fillTriangle(0, 0, -w, -CONE_REACH, w, -CONE_REACH);
  g.lineStyle(5, 0xffe600, 0.95).strokeTriangle(0, 0, -w, -CONE_REACH, w, -CONE_REACH);
  const a0 = -Math.PI / 2 - Math.atan(CONE), a1 = -Math.PI / 2 + Math.atan(CONE);
  for (let k = 1; k <= 4; k++) g.lineStyle(4, 0xffffff, 0.75).beginPath().arc(0, 0, (CONE_REACH * k) / 5, a0, a1).strokePath();
  g.setRotation(aim).setScale(1, 0);
  scene.tweens.add({ targets: g, scaleY: 1, duration: CONE_MS, ease: 'Quad.Out' });
  scene.tweens.add({ targets: g, alpha: 0, delay: CONE_MS + 120, duration: 300, onComplete: () => g.destroy() });
  scene.cameras.main.shake(300, 0.012);
  scene.floatText(x + 60, y - 60, 'Sonic Boom!');
  audio.sfx(scene, 'splash');
  const hit = [...sec.cells.values()].filter((q) => q.kind === kind && inCone(x, y, aim, q.sprite.x, q.sprite.y, f.radius));
  let last = 0;
  hit.forEach((q) => {
    const at = (Math.hypot(q.sprite.x - x, q.sprite.y - y) / CONE_REACH) * CONE_MS;
    last = Math.max(last, at);
    scene.time.delayedCall(at, () => { if (sec.cells.get(keyOf(q.r, q.c)) === q) breakPuff(scene, sec, q); });
  });
  if (!hit.length) scene.time.delayedCall(CONE_MS, () => scene.floatText(x + 60, y - 110, 'None that colour!'));
  scene.time.delayedCall(last + 60, () => {
    dropLoose(scene, sec);
    afterClear(scene);
  });
}

function ring(scene, x, y, color, size, ms) {
  const r = scene.add.circle(x, y, 20, color, 0).setStrokeStyle(6, color, 1).setDepth(8);
  scene.tweens.add({ targets: r, radius: size, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}

// The field empty: out of the pool and along the shore to the portal.
function afterClear(scene) {
  const fm = scene.fm;
  const sec = section(scene);
  if (sec.cells.size || fm.moving) return;
  fm.moving = true;
  // (a throw still in the air when the field emptied landed after and
  // stayed: it just pops)
  if (fm.flying) {
    const p = fm.flying;
    fm.flying = null;
    scene.tweens.add({ targets: p.sprite, scale: 2.8, alpha: 0, duration: 220, onComplete: () => p.sprite.destroy() });
  }
  fm.aimG.clear();
  const f = F(scene);
  const cam = scene.cameras.main;
  scene.time.delayedCall(500, () => {
    const say = scene.add.text(cam.scrollX + MAP_W / 2, 330, 'All clear!', heading(56, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 12,
    })).setOrigin(0.5).setDepth(22);
    scene.tweens.add({ targets: say, alpha: 0, delay: 900, duration: 400, onComplete: () => say.destroy() });
    audio.sfx(scene, 'correct');
  });
  scene.time.delayedCall(1500 + (fm.fetching ? FETCH_MS * 2 : 0), () => {
    const M = Matter();
    const from = scene.ball.position.x;
    const fromY = scene.ball.position.y;
    const pool = scene.pools[0];
    const to = pool.x + pool.w + 110;
    const leap = { t: 0 };
    const topY = scene.doorAt.y - 240;
    const endY = scene.doorAt.y - 38;
    face(scene, 1);
    play(scene.shaan, scene.art, 'jump');
    scene.tweens.add({
      targets: leap, t: 1, duration: 1100, ease: 'Sine.InOut',
      onUpdate: () => {
        const t = leap.t;
        const x = from + (to - from) * t;
        const y = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * topY + t * t * endY;
        M.Body.setPosition(scene.ball, { x, y });
      },
      onComplete: () => walkToPortal(scene),
    });
  });
}

// He walks off along the shore to the portal, the view following, and goes in.
function walkToPortal(scene) {
  const M = Matter();
  const cam = scene.cameras.main;
  const s = scene.shaan;
  const from = scene.ball.position.x;
  const to = scene.doorAt.x - 10;
  const y = scene.doorAt.y - 38;
  face(scene, 1);
  play(s, scene.art, 'run');
  const ms = Math.max(600, ((to - from) / 6) * (1000 / 60));
  scene.tweens.add({ targets: cam, scrollX: scene.room.width - MAP_W, duration: ms, ease: 'Sine.InOut' });
  const walk = { x: from };
  scene.tweens.add({
    targets: walk, x: to, duration: ms, ease: 'Sine.InOut',
    onUpdate: () => M.Body.setPosition(scene.ball, { x: walk.x, y }),
    onComplete: () => scene.reachDoor(),
  });
}

// Every frame: the power key, his picture, the held puff, the aim line, the meter.
export function update(scene, time) {
  const fm = scene.fm;
  const k = scene.keys;
  const f = F(scene);
  fm.holdPower = k.X.isDown || k.K.isDown || k.F.isDown || !!scene.touch.blast;
  const s = scene.shaan;
  s.setOrigin(0.5, 0.62);
  if (!fm.moving) {
    play(s, scene.art, 'swim');
    s.anims.timeScale = fm.fetching ? 1.8 : 0.7;
    if (!fm.fetching) face(scene, 1);
    if (fm.boomReady && time % 160 < 17) ring(scene, ...origin(scene), 0xffe600, 50, 300);
  }
  // the held puff on his tail tip (behind him, which way he faces)
  const b = scene.ball;
  const facing = fm.face || 1;
  fm.heldImg.setVisible(!fm.moving && fm.hasPuff).setPosition(b.position.x + TAIL.x * facing, b.position.y + TAIL.y - 12);
  if (fm.boomReady) fm.heldImg.setTint(0xfff6a0); else fm.heldImg.clearTint();
  // the aim: a dotted line along the path, bouncing off the edges, and a
  // ring where it will meet the field (or the cone, with the boom ready)
  fm.aimG.clear();
  if (!fm.moving) {
    const [ox, oy] = origin(scene);
    if (fm.boomReady) {
      const w = 760 * CONE;
      fm.aimG.lineStyle(3, 0xffe600, 0.7);
      [[-w, -760], [w, -760]].forEach(([ex, ey]) => {
        const ca = Math.cos(fm.aim), sa = Math.sin(fm.aim);
        fm.aimG.lineBetween(ox, oy, ox + ex * ca - ey * sa, oy + ex * sa + ey * ca);
      });
    } else {
      const pr = predict(scene, fm.aim);
      fm.aimG.fillStyle(0xffffff, 0.9);
      pr.pts.forEach(([x, y], i) => { if (i % 2 === 0) fm.aimG.fillCircle(x, y, i % 8 === 0 ? 4 : 3); });
      fm.aimG.lineStyle(3, 0xffffff, 0.8).strokeCircle(pr.x, pr.y, f.radius);
      fm.aimHit = pr.hit;
    }
  }
  fm.meter.update(time);
  fm.btn.setAlpha(fm.meter.fill >= 1 ? 1 : 0.65);
  fm.btnLabel.setAlpha(fm.meter.fill >= 1 ? 1 : 0.4);
  fm.timeText.setText(clock(Math.floor(scene.runTime())));
}

function maxScore(fm) {
  return fm.total + 10 * fm.boltTotal;
}
export function medal(scene) {
  const fm = scene.fm;
  const max = maxScore(fm);
  const sc = fm.score;
  const tier = sc >= 0.9 * max ? 3 : sc >= 0.6 * max ? 2 : 1;
  return { ...tierInfo(tier), score: sc, max };
}
export function scoreLine(scene) {
  const fm = scene.fm;
  return `Broken ${fm.broken}   ·   Fell ${fm.fallen}   ·   Z-bolts ${fm.bolts + fm.bonusBolts}`;
}
export function scoreRow(scene, med) {
  const max = maxScore(scene.fm);
  return { label: `Score ${med.score}`, detail: `${med.name}   (gold ${Math.ceil(0.9 * max)}, silver ${Math.ceil(0.6 * max)})` };
}
