// A chase room (`chase: {...}` in data/bonusRooms.js; Charlie's Chase the
// Bananalope first: Chris's idea, the user's choices, 2026-11-17). Everything
// it adds to BonusRoom.js lives here, behind the same hooks as circuits.js.
//
// The rules (docs/bonus-level-ideas.md, "Charlie's room: Chase the
// Bananalope"):
// - Seen from behind Charlie, third person (his shoulders and the back of
//   his head). A winding forest trail with rises, no laps; now and then it
//   forks round a giant tree. Drawn as a pseudo-3D road, the way older
//   racing games did it: the trail is cut into segments, each projected to
//   the screen, and everything on it grows as it comes closer.
// - We drive him: up (or the go button) speeds him up, letting go slows him;
//   left and right steer anywhere across the trail (free steering).
// - Obstacles (rocks, stumps, mud, fallen trunks) slow him when he hits one:
//   steer round them, no jump.
// - Bananlers charge the Z meter: lines of them across the trail, and more
//   the bananalope sheds as it runs.
// - Hyper Dash: hold the power key. It needs at least one segment to start
//   and drains the meter as long as he boosts. Started from a full meter
//   it's a super boost: faster, and unstoppable (he smashes through
//   obstacles).
// - The gap to the bananalope shows at the top. Catch it to end the run;
//   the medal is for how fast. A cap (90 s) ends it anyway.
// All the numbers are provisional (the user: tweak once played).

import { ZMeter, SEGMENTS } from '../zmeter.js?v=d69665c';
import { MAP_W, MAP_H } from '../data/world.js?v=d69665c';
import { texKey } from '../data/artsets.js?v=d69665c';
import { tierInfo, clock } from '../paws.js?v=d69665c';
import { audio } from '../audio.js?v=d69665c';
import { COLORS, heading, text } from '../theme.js?v=d69665c';
import { bandId } from './band.js?v=d69665c';
import { TOUCH_ONLY } from '../touch.js?v=d69665c';

const SEG = 200;              // a segment's length (world units)
const ROAD = 700;             // the trail's half-width (world units)
const CAM_H = 1000;           // the camera's height over the trail
const DEPTH = 1 / Math.tan((50 * Math.PI) / 180);   // a 100 degree view
const PLAYER_Z = CAM_H * DEPTH;   // Charlie, ahead of the camera
const DRAW = 280;             // segments drawn ahead
const HY = 300;               // the horizon on screen
const VF = MAP_H - HY;
const MAX = 5500;             // his top speed (world units a second; the user, 2026-11-17: 8000 "needs to be slower")
const LOPE = 0.95 * MAX;      // the bananalope's pace: top speed slowly gains
const CURVE_K = 0.6;
const HILL_K = 0.15;
const PW = 0.22;              // half his width, in half-widths (a little under his picture, to be kind)
const SIZES = { rock: 260, stump: 240, mud: 420, trunk: 620, fruit: 150, lope: 700, tree: 1700, plant: 420 };
const WIDE = { rock: 0.36, stump: 0.32, mud: 0.55, trunk: 0.85, log: 99 };   // a log is across the whole trail
const JUMP_T = 0.62;          // seconds in the air
const JUMP_PX = 150;          // how high he goes on screen
const jumpH = (t) => (t < 0 ? 0 : 4 * (t / JUMP_T) * (1 - t / JUMP_T));
const SKY = [0x14, 0x7e, 0x6f];
// His gallop from behind (the user, 2026-11-18: "put the gallop we just made
// in"): six frames, 12 a second at top speed, slower when he is slower.
const GALLOP = 6;
const GALLOP_K = 4 / 3;
const GALLOP_FPS = 12;
const AIR_FRAME = 4;          // gathered, paws tucked: his frame over a log

export const owns = true;

const D = (scene) => scene.room.chase;

export function reset(scene) {
  scene.ch = {
    segs: [], pos: 0, x: 0, speed: 0, t: 0, ended: false, go: false, caught: false,
    lopeZ: 0, lopeSpeed: 0, shedAt: 0, boosting: false, super: false, touchBoost: false,
    pool: [], used: 0, got: 0, smashed: 0, hits: 0, bumpAt: -1e9, auto: null, steps: 0,
    jt: -1, jumpQ: false, touchWas: false, bolts: 0, boltT: 0, touchGo: false,
  };
}

// ---------- the track ----------

function halfAt(d, i) {
  for (const f of d.forks) {
    const a = f.s, b = f.s + f.n;
    if (i >= a && i < b) return 1 + Math.min(1, Math.min(i - a, b - 1 - i) / d.forkEase);
  }
  return 1;
}
function lopeXAt(d, i) {
  const L = d.lope;
  const j = Math.max(0, Math.min(L.length - 2, Math.floor(i / 20)));
  const [i0, x0] = L[j], [i1, x1] = L[j + 1];
  return x0 + (x1 - x0) * Math.max(0, Math.min(1, (i - i0) / (i1 - i0)));
}
const ease = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function build(scene, set) {
  const ch = scene.ch;
  const d = D(scene);
  makeTextures(scene, set);
  // segments: bends, rises, the fork widths
  const segs = [];
  let y = 0;
  d.sections.forEach((sec) => {
    const y0 = y, y1 = y + sec.hill * SEG * HILL_K * (sec.n / 100);
    for (let k = 0; k < sec.n && segs.length < d.length; k++) {
      const i = segs.length;
      segs.push({
        i, curve: sec.curve * CURVE_K, y1: ease(y0, y1, k / sec.n), y2: ease(y0, y1, (k + 1) / sec.n),
        h: halfAt(d, i), things: [], dark: Math.floor(i / 3) % 2,
      });
    }
    y = y1;
  });
  while (segs.length < d.length) segs.push({ i: segs.length, curve: 0, y1: y, y2: y, h: 1, things: [], dark: Math.floor(segs.length / 3) % 2 });
  ch.segs = segs;
  // the roadside forest: Chris's plants near, big trees behind them
  const rand = rng(17);
  const plants = (set.dressing && set.dressing.ground_plants || [])
    .filter((f) => !/rock/.test(f)).map((f) => texKey(scene.room.artset, f)).filter((k) => scene.textures.exists(k));
  segs.forEach((s) => {
    if (s.i % 3 === 0 && plants.length) {
      [-1, 1].forEach((side) => s.things.push({ kind: 'plant', key: plants[Math.floor(rand() * plants.length)], x: side * (s.h + 0.35 + rand() * 1.4), w: SIZES.plant * (0.7 + rand() * 0.6), flip: rand() < 0.5 }));
    }
    if (s.i % 7 === 0) [-1, 1].forEach((side) => s.things.push({ kind: 'tree', key: 'chase-tree', x: side * (s.h + 2.4 + rand() * 2.5), w: SIZES.tree * (0.7 + rand() * 0.5) }));
    // the giant tree in a fork's middle
    if (s.h > 1.6 && s.i % 6 === 0) s.things.push({ kind: 'tree', key: 'chase-tree', x: 0, w: SIZES.tree * 1.3 });
  });
  d.obstacles.forEach((o) => segs[o.s] && segs[o.s].things.push({
    kind: o.k, key: `chase-${o.k}`, x: o.x, w: o.k === 'log' ? 2 * ROAD * segs[o.s].h * 1.15 : SIZES[o.k], hit: false,
  }));
  ch.logs = d.obstacles.filter((o) => o.k === 'log').map((o) => o.s);
  // How many times it bolts ("Almost!") depends on the difficulty band
  // (Chris, 2026-11-20: "maybe each difficulty has a different number of
  // 'almost!'?"): the data's `bolts` is Pioneer's; Explorer gets two
  // thirds of them, Junior Explorer a third (door 1: 6, 4, 2). Its real
  // escapes are the data's that still fall within the band's bolts.
  const band = bandId();
  const full = d.bolts || 0;
  ch.boltsTotal = band === 'pioneer' ? full : Math.max(1, Math.round(full * (band === 'explorer' ? 2 / 3 : 1 / 3)));
  ch.escapes = (d.escapes || []).filter((n) => n <= ch.boltsTotal);
  ch.bolts = ch.boltsTotal;
  const fruit = texKey(scene.room.artset, set.food);
  ch.fruitKey = scene.textures.exists(fruit) ? fruit : 'chase-fruit';
  d.bananlers.forEach((b) => segs[b.s] && segs[b.s].things.push({ kind: 'fruit', key: ch.fruitKey, x: b.x, w: SIZES.fruit, got: false }));
  ch.trackLen = segs.length * SEG;
  // the bananalope starts its gap ahead
  ch.lopeZ = PLAYER_Z + d.gapSeconds * LOPE;
  ch.gap0 = ch.lopeZ - PLAYER_Z;
  // the drawing: the trail, the things on it, Charlie
  ch.road = scene.add.graphics().setScrollFactor(0).setDepth(4);
  ch.fx = scene.add.graphics().setScrollFactor(0).setDepth(9.7);
  // Charlie: the six-frame gallop from behind, drawn at 3 px a pixel and shown
  // at 4 (the game's pixel size). His feet are on the frame's ground line,
  // 108 of its 112 pixels down.
  for (let i = 1; i <= GALLOP; i++) {
    const t = scene.textures.get(`chase-charlie-back-${i}`);
    if (t) t.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  ch.charlie = scene.add.image(MAP_W / 2, MAP_H - 12, 'chase-charlie-back-1').setOrigin(0.5, 108 / 112).setScale(GALLOP_K).setScrollFactor(0).setDepth(9.6);
  ch.stride = 0;
  ch.lastT = -1;
}

// ---------- the stand-in pictures (until Chris draws them) ----------

function canvasTex(scene, key, w, h, draw, k = 1) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, Math.ceil(w * k), Math.ceil(h * k));
  const c = t.getContext();
  c.scale(k, k);
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c);
  t.refresh();
}
const INK = '#1b1a2e';
function blob(c, fill, fn, lw = 4) {
  c.beginPath(); fn(); c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = lw; c.stroke();
}

function makeTextures(scene, set) {
  // the bananalope from behind: a banana-yellow antelope with bananler antlers
  [0, 1].forEach((f) => canvasTex(scene, `chase-lope-${f}`, 170, 190, (c) => {
    const up = f ? -1 : 1;
    [[58, up], [72, -up], [98, up], [112, -up]].forEach(([x, u]) => {
      blob(c, '#c99a3a', () => c.rect(x - 5, 128 + u * 6, 10, 46), 3);
      blob(c, INK, () => c.rect(x - 6, 170 + u * 6, 12, 8), 2);
    });
    blob(c, '#f6cf4a', () => c.ellipse(85, 120, 50, 34, 0, 0, Math.PI * 2));
    c.fillStyle = '#7a5520';
    [[60, 108], [104, 104], [84, 96], [70, 130], [108, 130]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 4, 3, 0.5, 0, Math.PI * 2); c.fill(); });
    blob(c, '#fff6dc', () => c.ellipse(85, 128, 20, 16, 0, 0, Math.PI * 2), 3);
    blob(c, '#7a5520', () => c.ellipse(85, 112, 5, 10, 0, 0, Math.PI * 2), 2);
    // neck and head
    blob(c, '#f6cf4a', () => c.ellipse(85, 72, 16, 22, 0, 0, Math.PI * 2));
    blob(c, '#f6cf4a', () => c.ellipse(85, 50, 20, 18, 0, 0, Math.PI * 2));
    [[60, 50, -0.5], [110, 50, 0.5]].forEach(([x, y, a]) => blob(c, '#f6cf4a', () => c.ellipse(x, y, 12, 6, a, 0, Math.PI * 2), 3));
    // bananler antlers: banana bunches curving up and out
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 3; k++) {
        const bx = 85 + s * (8 + k * 9), by = 34 - k * 4;
        c.beginPath();
        c.moveTo(bx, by);
        c.quadraticCurveTo(bx + s * (6 + k * 6), by - 30, bx + s * (22 + k * 8), by - 34 + k * 6);
        c.quadraticCurveTo(bx + s * (8 + k * 6), by - 18, bx + s * 4, by + 2);
        c.closePath();
        c.fillStyle = k === 1 ? '#ffe46a' : '#f6d23a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#6b4a1a'; c.beginPath(); c.arc(bx + s * (22 + k * 8), by - 34 + k * 6, 3, 0, Math.PI * 2); c.fill();
      }
    });
  }));
  canvasTex(scene, 'chase-stump', 120, 110, (c) => {
    blob(c, '#7a4a26', () => { c.moveTo(14, 30); c.lineTo(14, 96); c.quadraticCurveTo(60, 112, 106, 96); c.lineTo(106, 30); c.closePath(); });
    blob(c, '#c9925a', () => c.ellipse(60, 30, 46, 18, 0, 0, Math.PI * 2));
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 2;
    [30, 18, 8].forEach((r) => { c.beginPath(); c.ellipse(60, 30, r, r * 0.4, 0, 0, Math.PI * 2); c.stroke(); });
  });
  canvasTex(scene, 'chase-trunk', 320, 100, (c) => {
    blob(c, '#6b4224', () => c.roundRect(20, 22, 270, 62, 26));
    c.strokeStyle = '#4a2c16'; c.lineWidth = 3;
    [60, 120, 190, 240].forEach((x) => { c.beginPath(); c.moveTo(x, 30); c.lineTo(x + 14, 76); c.stroke(); });
    blob(c, '#5fb83a', () => c.ellipse(130, 24, 50, 10, 0, 0, Math.PI * 2), 3);
    blob(c, '#c9925a', () => c.ellipse(292, 53, 22, 31, 0, 0, Math.PI * 2));
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; c.beginPath(); c.ellipse(292, 53, 11, 16, 0, 0, Math.PI * 2); c.stroke();
  });
  canvasTex(scene, 'chase-log', 640, 90, (c) => {
    blob(c, '#7a4a26', () => c.roundRect(14, 20, 600, 56, 26));
    c.strokeStyle = '#4a2c16'; c.lineWidth = 3;
    [70, 150, 240, 330, 420, 510].forEach((x) => { c.beginPath(); c.moveTo(x, 28); c.lineTo(x + 18, 68); c.stroke(); });
    c.fillStyle = '#9a6a3a'; c.fillRect(40, 30, 540, 6);
    [[120, 22], [300, 20], [470, 22]].forEach(([x, y]) => blob(c, '#5fb83a', () => c.ellipse(x, y, 34, 7, 0, 0, Math.PI * 2), 3));
    blob(c, '#c9925a', () => c.ellipse(614, 48, 18, 28, 0, 0, Math.PI * 2));
    blob(c, '#c9925a', () => c.ellipse(16, 48, 14, 26, 0, 0, Math.PI * 2));
  });
  canvasTex(scene, 'chase-mud', 240, 70, (c) => {
    blob(c, '#4a2f18', () => c.ellipse(120, 38, 112, 28, 0, 0, Math.PI * 2));
    c.fillStyle = '#6b4626'; c.beginPath(); c.ellipse(100, 32, 60, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a07a52'; c.beginPath(); c.ellipse(86, 28, 22, 4, 0, 0, Math.PI * 2); c.fill();
  });
  canvasTex(scene, 'chase-rock', 140, 100, (c) => {
    blob(c, '#8a8f9e', () => { c.moveTo(10, 92); c.lineTo(24, 36); c.lineTo(62, 12); c.lineTo(108, 24); c.lineTo(130, 92); c.closePath(); });
    c.fillStyle = '#b4b9c6'; c.beginPath(); c.moveTo(30, 40); c.lineTo(62, 18); c.lineTo(80, 30); c.lineTo(44, 52); c.fill();
  });
  canvasTex(scene, 'chase-tree', 260, 520, (c) => {
    blob(c, '#6b4224', () => { c.moveTo(96, 520); c.lineTo(110, 230); c.lineTo(150, 230); c.lineTo(164, 520); c.closePath(); });
    blob(c, '#6b4224', () => { c.moveTo(60, 520); c.quadraticCurveTo(96, 470, 110, 440); c.lineTo(120, 520); c.closePath(); }, 3);
    blob(c, '#6b4224', () => { c.moveTo(200, 520); c.quadraticCurveTo(164, 470, 150, 440); c.lineTo(140, 520); c.closePath(); }, 3);
    [[70, 190, 70], [190, 190, 70], [130, 120, 90], [130, 220, 70], [60, 120, 50], [200, 120, 50]].forEach(([x, y, r], k) => {
      blob(c, k % 2 ? '#2f7d32' : '#3f9a2e', () => c.arc(x, y, r, 0, Math.PI * 2));
    });
    c.fillStyle = '#5fb83a';
    [[110, 90], [160, 150], [80, 170]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); });
  });
  canvasTex(scene, 'chase-fruit', 60, 40, (c) => blob(c, '#f6d23a', () => c.ellipse(30, 20, 24, 12, 0, 0, Math.PI * 2)));
}

// ---------- HUD ----------

export function buildHud(scene) {
  const ch = scene.ch;
  ch.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
  g.fillStyle(COLORS.parchment, 0.95).fillRoundedRect(MAP_W - 176, 14, 150, 64, 10);
  g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(MAP_W - 176, 14, 150, 64, 10);
  scene.add.text(MAP_W - 101, 30, 'TIME', heading(16, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  ch.timeText = scene.add.text(MAP_W - 101, 56, '', heading(26, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  // the gap: Charlie's marker creeps up the bar to the bananalope's
  ch.gapBar = scene.add.graphics().setScrollFactor(0).setDepth(20);
  ch.gapLope = scene.add.image(MAP_W / 2 + 160, 96, 'chase-lope-0').setScale(0.24).setScrollFactor(0).setDepth(21);
  ch.gapMe = scene.add.image(MAP_W / 2 - 160, 98, 'chase-charlie-back-1').setScale(0.2).setScrollFactor(0).setDepth(21);
  // touch: the power button (held to Hyper Dash); the jump button is go
  const y = MAP_H - 80;
  ch.btn = scene.add.image(MAP_W - 210, y, 'btn-power').setScale(0.8).setTint(0xff8a1e).setScrollFactor(0).setDepth(20).setAlpha(0.65).setInteractive();
  ch.btn.on('pointerdown', () => { ch.touchBoost = true; });
  ch.btn.on('pointerup', () => { ch.touchBoost = false; });
  ch.btn.on('pointerout', () => { ch.touchBoost = false; });
  ch.btnLabel = scene.add.text(MAP_W - 210, MAP_H - 30, 'X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setAlpha(0.4).setVisible(!TOUCH_ONLY);
  // touch: a go button (held to run); the scene's jump button jumps
  const goBtn = scene.add.image(MAP_W - 330, y, 'btn-jump').setScale(0.8).setTint(0x7dff7a).setScrollFactor(0).setDepth(20).setAlpha(0.75).setInteractive();
  goBtn.on('pointerdown', () => { ch.touchGo = true; goBtn.setAlpha(1); });
  const goUp = () => { ch.touchGo = false; goBtn.setAlpha(0.75); };
  goBtn.on('pointerup', goUp);
  goBtn.on('pointerout', goUp);
  scene.add.text(MAP_W - 330, MAP_H - 30, '↑ · W', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setVisible(!TOUCH_ONLY);
  // 3, 2, 1, GO! after the intro
  const big = (msg, color) => scene.add.text(MAP_W / 2, MAP_H / 2 - 110, msg, heading(96, color, {
    stroke: COLORS.inkCss, strokeThickness: 14,
  })).setOrigin(0.5).setScrollFactor(0).setDepth(22);
  const show = (msg, at, color) => scene.time.delayedCall(at, () => {
    if (ch.go && msg !== 'GO!') return;
    const t = big(msg, color).setScale(0.4);
    scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
    scene.tweens.add({ targets: t, alpha: 0, delay: 550, duration: 200, onComplete: () => t.destroy() });
    audio.sfx(scene, msg === 'GO!' ? 'correct' : 'hint');
  });
  if (scene.retry || scene.inspect) { ch.go = true; return; }
  ['3', '2', '1'].forEach((n, i) => show(n, 3200 + i * 800, '#ffffff'));
  show('GO!', 3200 + 3 * 800, '#7dff7a');
  scene.time.delayedCall(3200 + 3 * 800, () => { ch.go = true; });
}

export const collide = () => false;
export const respawn = () => {};

// ---------- the rules, once a physics step ----------

export function step(scene, time, dir) {
  const ch = scene.ch;
  const d = D(scene);
  if (!ch.camSet) {
    ch.camSet = true;
    scene.cameras.main.stopFollow();
    scene.cameras.main.setScroll(0, 0);
    Phaser.Physics.Matter.Matter.Body.setStatic(scene.ball, true);
    scene.shaan.setVisible(false);   // Charlie is drawn from behind instead
    // the jump keys, as events (up and W run, so they don't jump)
    scene.input.keyboard.on('keydown', (ev) => { if (['Space', 'KeyZ', 'KeyJ'].includes(ev.code) && !ev.repeat) ch.jumpQ = true; });
  }
  scene.jumpAsked = false;
  if (ch.ended) return;
  const dt = 1 / 60;
  ch.steps += 1;
  const k = scene.keys;
  const a = ch.auto;
  const steer = a ? a.steer : dir;
  const go = a ? a.go : (k.UP.isDown || k.W.isDown || ch.touchGo || !!scene.touch.up);
  const touchJ = !!scene.touch.jump;
  const jumpPress = a ? a.jump : (ch.jumpQ || (touchJ && !ch.touchWas));
  ch.touchWas = touchJ;
  ch.jumpQ = false;
  const boostHeld = a ? a.boost : (k.X.isDown || k.K.isDown || k.F.isDown || ch.touchBoost);
  if (!ch.go) return;
  ch.t += dt;
  // the jump: over logs (and anything else low)
  if (ch.jt >= 0) { ch.jt += dt; if (ch.jt >= JUMP_T) ch.jt = -1; }
  if (jumpPress && ch.jt < 0) { ch.jt = 0; audio.sfx(scene, 'jump'); }
  // Hyper Dash: needs a segment to start, drains while held; full = super
  const m = ch.meter;
  if (boostHeld && !ch.boosting && m.fill >= 1) {
    ch.boosting = true;
    ch.super = m.fill >= SEGMENTS;
    say(scene, MAP_W / 2, MAP_H - 220, ch.super ? 'SUPER Hyper Dash!' : 'Hyper Dash!');
    audio.sfx(scene, 'energy');
  } else if (boostHeld && !ch.boosting && m.fill < 1 && !ch.saidFill) {
    ch.saidFill = true;
    say(scene, MAP_W / 2, MAP_H - 220, 'Grab bananlers to Hyper Dash!');
    scene.time.delayedCall(1500, () => { ch.saidFill = false; });
  }
  if (ch.boosting) {
    m.fill = Math.max(0, m.fill - d.drainPerSecond * dt);
    if (!boostHeld || m.fill <= 0) { ch.boosting = false; ch.super = false; }
  }
  // speed
  const seg = segAt(ch, ch.pos + PLAYER_Z);
  const off = Math.abs(ch.x) > seg.h;
  let cap = ch.boosting ? MAX * (ch.super ? d.superBoost : d.boost) : MAX;
  if (off) cap = Math.min(cap, MAX * (ch.boosting ? 0.7 : 0.45));
  // (over the cap, it eases down to it; under, boosting or go builds up to it)
  if (ch.speed > cap) ch.speed = Math.max(cap, ch.speed - MAX * 1.2 * dt);
  else if (ch.boosting) ch.speed = Math.min(cap, ch.speed + MAX * 1.6 * dt);
  else if (go) ch.speed = Math.min(cap, ch.speed + (MAX / 3) * dt);
  else ch.speed = Math.max(0, ch.speed - (MAX / 2.5) * dt);
  const sp = ch.speed / MAX;
  // steering, and the bend pushing him out
  ch.x += steer * dt * (0.9 + 1.3 * Math.min(1, sp));
  ch.x -= dt * 2 * sp * seg.curve * 0.22 * Math.min(1, sp);
  ch.x = Math.max(-seg.h - 0.6, Math.min(seg.h + 0.6, ch.x));
  const from = Math.floor((ch.pos + PLAYER_Z) / SEG);
  ch.pos = Math.min(ch.trackLen - PLAYER_Z - SEG * (DRAW + 2), ch.pos + ch.speed * dt);
  const to = Math.floor((ch.pos + PLAYER_Z) / SEG);
  for (let i = from; i <= to; i++) touch(scene, ch.segs[i]);
  // the giant tree in a fork's middle: bump off it
  if (seg.h > 1.05 && Math.abs(ch.x) < d.tree * (seg.h - 1) + PW && time - ch.bumpAt > 400) {
    ch.bumpAt = time;
    ch.x = Math.sign(ch.x || 1) * (d.tree * (seg.h - 1) + PW + 0.05);
    if (!ch.super) { ch.speed *= 0.5; bonk(scene, 'Bonk!'); }
  }
  // The bananalope teases (the user, 2026-11-17: "the creature needs to be
  // closer so we can see it, teasing us"): it keeps close, waiting if he
  // falls well behind; each time he catches up it bolts away, until it has
  // bolted `bolts` times and is tired. Only then can he catch it. A couple
  // of the bolts (`escapes`) are real escapes (the user: "it needs to get
  // away a couple time and ACTUALLY get away"): it runs far off down the
  // trail and has to be hunted down. It always outruns him while it bolts,
  // and he can't pass it (the user: "charlie passed it").
  const gap = ch.lopeZ - (ch.pos + PLAYER_Z);
  if (gap < SEG * 2.5 && ch.bolts > 0 && ch.boltT <= 0) {
    ch.bolts -= 1;
    const n = ch.boltsTotal - ch.bolts;
    ch.escape = ch.escapes.includes(n);
    ch.boltT = ch.escape ? 4 : 1.6;
    say(scene, MAP_W / 2, 190, ch.escape ? 'It got away!' : ch.bolts ? 'Almost!' : "Almost... it's getting tired!");
    audio.sfx(scene, ch.escape ? 'splash' : 'toss');
  }
  ch.boltT = Math.max(0, ch.boltT - dt);
  if (ch.boltT > 0) ch.lopeSpeed = Math.max(MAX * (ch.escape ? 2.4 : 1.9), ch.speed * 1.25);
  else ch.lopeSpeed = gap > ch.gap0 * 2.6 ? LOPE * 0.8 : ch.bolts ? LOPE : LOPE * 0.9;
  ch.lopeZ = Math.min(ch.trackLen - SEG * 4, ch.lopeZ + ch.lopeSpeed * dt);
  // never past it: until it's tired he's held just behind
  if (ch.bolts > 0 && ch.pos + PLAYER_Z > ch.lopeZ - SEG * 1.2) {
    ch.pos = ch.lopeZ - SEG * 1.2 - PLAYER_Z;
    ch.speed = Math.min(ch.speed, ch.lopeSpeed);
  }
  ch.shedAt += dt;
  if (ch.shedAt > (d.shedEvery || 0.7)) {
    ch.shedAt = 0;
    const li = Math.floor(ch.lopeZ / SEG) - 2;
    const s = ch.segs[li];
    if (s) s.things.push({ kind: 'fruit', key: ch.fruitKey, x: lopeXAt(d, li) + (Math.random() - 0.5) * 0.3, w: SIZES.fruit, got: false, shed: true });
  }
  if (gap < SEG * 1.5 && ch.bolts === 0) { finish(scene, true); return; }
  if (ch.t >= d.cap) finish(scene, false);
}

// A message over everything (the scene's floatText sits at depth 9, under
// the trees and the trail's things in a chase room).
function say(scene, x, y, msg) {
  const t = scene.add.text(x, y, msg, heading(34, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 8 }))
    .setOrigin(0.5).setScrollFactor(0).setDepth(22);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 300, duration: 900, ease: 'Sine.Out', onComplete: () => t.destroy() });
}

function segAt(ch, z) { return ch.segs[Math.max(0, Math.min(ch.segs.length - 1, Math.floor(z / SEG)))]; }

function touch(scene, s) {
  const ch = scene.ch;
  const d = D(scene);
  if (!s) return;
  s.things.forEach((t) => {
    if (t.kind === 'fruit') {
      if (t.got || Math.abs(t.x - ch.x) > 0.3) return;
      t.got = true;
      ch.got += 1;
      ch.meter.fill = Math.min(SEGMENTS, ch.meter.fill + d.fruitStep);
      audio.sfx(scene, 'food');
      return;
    }
    if (!WIDE[t.kind] || t.hit) return;
    if (ch.jt >= 0 && jumpH(ch.jt) > 0.25) return;   // jumped over it
    if (Math.abs(t.x - ch.x) > WIDE[t.kind] / 2 + PW) return;
    t.hit = true;
    if (ch.super) {
      t.smashed = true;
      ch.smashed += 1;
      say(scene, MAP_W / 2, MAP_H - 240, 'Smash!');
      audio.sfx(scene, 'crate');
      scene.cameras.main.shake(120, 0.006);
      return;
    }
    ch.hits += 1;
    ch.speed *= t.kind === 'mud' ? 0.65 : 0.45;
    bonk(scene, t.kind === 'mud' ? 'Splat!' : 'Bonk!');
  });
}

function bonk(scene, msg) {
  say(scene, MAP_W / 2, MAP_H - 240, msg);
  audio.sfx(scene, 'crate');
  scene.cameras.main.shake(160, 0.01);
}

function finish(scene, caught) {
  const ch = scene.ch;
  if (ch.ended) return;
  ch.ended = true;
  ch.caught = caught;
  ch.boosting = false;
  const say = scene.add.text(MAP_W / 2, 300, caught ? 'Caught it!' : 'Time!', heading(64, COLORS.yellowCss, {
    stroke: COLORS.inkCss, strokeThickness: 12,
  })).setOrigin(0.5).setScrollFactor(0).setDepth(22);
  scene.tweens.add({ targets: say, scale: 1.15, duration: 300, yoyo: true });
  audio.sfx(scene, caught ? 'level-end' : 'hint');
  scene.time.delayedCall(1600, () => { say.destroy(); scene.reachDoor(); });
}

// ---------- drawing, every frame ----------

function fog(col, f) {
  const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
  return (Math.round(r + (SKY[0] - r) * f) << 16) | (Math.round(g + (SKY[1] - g) * f) << 8) | Math.round(b + (SKY[2] - b) * f);
}

function project(p, camX, camY, camZ) {
  const cz = p.z - camZ;
  const scale = DEPTH / cz;
  p.scale = scale;
  p.sx = MAP_W / 2 + scale * (p.x - camX) * MAP_W / 2;
  p.sy = HY - scale * (p.y - camY) * VF;
  p.sw = scale * p.w * MAP_W / 2;
}

function quad(g, col, x1, y1, w1, x2, y2, w2) {
  g.fillStyle(col, 1);
  g.beginPath();
  g.moveTo(x1 - w1, y1); g.lineTo(x2 - w2, y2); g.lineTo(x2 + w2, y2); g.lineTo(x1 + w1, y1);
  g.closePath(); g.fillPath();
}

function sprite(scene, key, x, y, w, depth, flip = false, alpha = 1) {
  const ch = scene.ch;
  let img = ch.pool[ch.used];
  if (!img) { img = scene.add.image(0, 0, key).setOrigin(0.5, 1).setScrollFactor(0); ch.pool.push(img); }
  ch.used += 1;
  if (img.texture.key !== key) img.setTexture(key);
  const s = w / img.width;
  img.setPosition(x, y).setScale(s).setDepth(depth).setFlipX(flip).setAlpha(alpha).setVisible(true).setAngle(0);
  return img;
}

export function update(scene, time) {
  const ch = scene.ch;
  const d = D(scene);
  const g = ch.road;
  g.clear();
  ch.used = 0;
  ch.lopeAt = null;
  const base = segAt(ch, ch.pos);
  const basePct = (ch.pos % SEG) / SEG;
  const pSeg = segAt(ch, ch.pos + PLAYER_Z);
  const pPct = ((ch.pos + PLAYER_Z) % SEG) / SEG;
  const playerY = pSeg.y1 + (pSeg.y2 - pSeg.y1) * pPct;
  const camY = playerY + CAM_H;
  const camX = ch.x * ROAD;
  let maxy = MAP_H;
  let x = 0, dx = -(base.curve * basePct);
  const drawn = [];
  for (let n = 0; n < DRAW; n++) {
    const s = ch.segs[base.i + n];
    if (!s) break;
    const p1 = { x: 0, y: s.y1, z: s.i * SEG, w: s.h * ROAD };
    const nh = ch.segs[s.i + 1] ? ch.segs[s.i + 1].h : s.h;
    const p2 = { x: 0, y: s.y2, z: (s.i + 1) * SEG, w: nh * ROAD };
    project(p1, camX - x, camY, ch.pos);
    project(p2, camX - x - dx, camY, ch.pos);
    s.p = p1; s.clip = maxy;
    x += dx; dx += s.curve;
    drawn.push(s);
    if (p1.z - ch.pos <= 1 || p2.sy >= p1.sy || p2.sy >= maxy) continue;
    const f = Math.min(0.85, (n / DRAW) ** 1.6);
    const grass = fog(s.dark ? 0x276b2a : 0x2f7d32, f);
    g.fillStyle(grass, 1).fillRect(0, p2.sy, MAP_W, p1.sy - p2.sy + 1);
    quad(g, fog(s.dark ? 0x4a2f18 : 0x5a3a1e, f), p1.sx, p1.sy, p1.sw * 1.08, p2.sx, p2.sy, p2.sw * 1.08);
    quad(g, fog(s.dark ? 0x8d6034 : 0x9a6a3a, f), p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw);
    // a fork's middle: the giant tree's mossy island
    const isl1 = d.tree * Math.max(0, s.h - 1), isl2 = d.tree * Math.max(0, nh - 1);
    if (isl1 > 0.01 || isl2 > 0.01) {
      quad(g, fog(s.dark ? 0x347f34 : 0x3b8f3a, f), p1.sx, p1.sy, p1.sw * isl1 / s.h, p2.sx, p2.sy, p2.sw * isl2 / nh);
    }
    maxy = p2.sy;
  }
  // things, far to near
  for (let n = drawn.length - 1; n >= 0; n--) {
    const s = drawn[n];
    const p = s.p;
    if (!p || p.z - ch.pos <= 1) continue;
    const depth = 5 + (1 - n / DRAW) * 4;
    const half = MAP_W / 2 * p.scale * ROAD;
    s.things.forEach((t) => {
      if (t.got || t.smashed) return;
      const w = t.w * p.scale * MAP_W / 2;
      if (w < 1.5) return;
      let y = p.sy;
      if (t.shed) y -= Math.abs(Math.sin(time / 120 + t.x * 9)) * w * 0.35;
      if (y - w * 0.2 > s.clip + 2) return;
      sprite(scene, t.key, p.sx + t.x * half, y, w, depth, t.flip, t.hit ? 0.55 : 1);
    });
    // the bananalope on this segment
    if (Math.floor(ch.lopeZ / SEG) === s.i && !ch.caught) {
      const li = s.i;
      const w = SIZES.lope * p.scale * MAP_W / 2;
      const fr = Math.floor(time / 110) % 2;
      const lx = p.sx + lopeXAt(d, li) * half;
      const lz = ch.lopeZ / SEG;
      const hop = Math.max(0, ...(ch.logs || []).map((l) => 1 - Math.abs(lz - l) / 3.5));
      const ly = p.sy - Math.abs(Math.sin(time / 110)) * w * 0.05 - Math.sin(hop * Math.PI / 2) * w * 0.45;
      sprite(scene, `chase-lope-${fr}`, lx, ly, w, depth + 0.01);
      ch.lopeAt = [lx, ly - w * 1.1];
    }
  }
  for (let i = ch.used; i < ch.pool.length; i++) ch.pool[i].setVisible(false);
  // Charlie: running, leaning into his steering
  const sp = ch.speed / MAX;
  // the stride runs at 12 frames a second at top speed, half that slow; the
  // drawing carries his own rise and fall, so no extra bob
  const dtMs = ch.lastT < 0 ? 0 : Math.min(100, time - ch.lastT);
  ch.lastT = time;
  if (sp > 0.05) ch.stride = (ch.stride + dtMs / 1000 * GALLOP_FPS * (0.5 + 0.5 * Math.min(1, sp))) % GALLOP;
  const air = jumpH(ch.jt);
  const fr = air ? AIR_FRAME : sp > 0.05 ? Math.floor(ch.stride) + 1 : 1;
  ch.charlie.setTexture(`chase-charlie-back-${fr}`);
  ch.charlie.setAngle((scene.dir || (ch.auto ? ch.auto.steer : 0)) * 7);
  ch.charlie.y = MAP_H - 12 - air * JUMP_PX;
  // Hyper Dash: speed lines, and a flame trail on a super boost
  const fx = ch.fx;
  fx.clear();
  if (air) fx.fillStyle(0x000000, 0.25 * (1 - air * 0.5)).fillEllipse(MAP_W / 2, MAP_H - 14, 200 * (1 - air * 0.4), 34 * (1 - air * 0.4));
  if (ch.boosting) {
    for (let k = 0; k < (ch.super ? 26 : 14); k++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = 260 + Math.random() * 200, r1 = r0 + 80 + Math.random() * 140;
      fx.lineStyle(ch.super ? 4 : 3, k % 3 ? 0xffffff : (ch.super ? 0xff8a1e : 0xfff2a8), 0.8);
      fx.lineBetween(MAP_W / 2 + Math.cos(a) * r0, HY + 120 + Math.sin(a) * r0 * 0.6, MAP_W / 2 + Math.cos(a) * r1, HY + 120 + Math.sin(a) * r1 * 0.6);
    }
    if (ch.super) {
      [[0, 46, 0xff8a1e], [0, 30, 0xffd96a]].forEach(([dy, r, c]) => fx.fillStyle(c, 0.5).fillCircle(MAP_W / 2, MAP_H - 30 + dy, r + Math.random() * 8));
    }
  }
  // a bobbing marker over the bananalope, so it can be spotted far ahead
  if (ch.lopeAt && !ch.caught) {
    const [mx, my0] = ch.lopeAt;
    const my = my0 - 14 - Math.abs(Math.sin(time / 200)) * 8;
    fx.fillStyle(COLORS.ink, 1).fillTriangle(mx - 13, my - 15, mx + 13, my - 15, mx, my + 5);
    fx.fillStyle(0xffe600, 1).fillTriangle(mx - 8, my - 12, mx + 8, my - 12, mx, my);
  }
  // HUD
  ch.meter.update(time);
  const can = ch.meter.fill >= 1 || ch.boosting;
  ch.btn.setAlpha(can ? 1 : 0.65);
  ch.btnLabel.setAlpha(can ? 1 : 0.4);
  ch.timeText.setText(clock(Math.floor(ch.t)));
  const gap = Math.max(0, ch.lopeZ - (ch.pos + PLAYER_Z));
  const frac = 1 - Math.min(1, gap / (ch.gap0 * 1.6));
  const bx0 = MAP_W / 2 - 160, bx1 = MAP_W / 2 + 160;
  ch.gapBar.clear();
  ch.gapBar.fillStyle(COLORS.ink, 0.85).fillRoundedRect(bx0 - 16, 86, bx1 - bx0 + 32, 22, 11);
  ch.gapBar.fillStyle(0xff8a1e, 1).fillRoundedRect(bx0 - 10, 91, (bx1 - bx0 + 20) * frac, 12, 6);
  ch.gapMe.x = bx0 + (bx1 - bx0) * frac;
  // its bolts left: once they're gone it's tired and can be caught
  const nb = ch.boltsTotal || 0;
  for (let i = 0; i < nb; i++) {
    const cx = bx1 + 44 + i * 18;
    ch.gapBar.fillStyle(COLORS.ink, 1).fillCircle(cx, 97, 8);
    ch.gapBar.fillStyle(i < ch.bolts ? 0xffe600 : 0x5d566e, 1).fillCircle(cx, 97, 5);
  }
}

// ---------- the score ----------

export function medal(scene) {
  const ch = scene.ch;
  const m = D(scene).medal;
  const tier = !ch.caught ? 1 : ch.t < m.gold ? 3 : ch.t < m.silver ? 2 : 1;
  return { ...tierInfo(tier), score: Math.round(ch.t * 10) / 10, max: 0 };
}
export function scoreLine(scene) {
  const ch = scene.ch;
  return ch.caught ? `You caught the bananalope in ${ch.t.toFixed(1)} seconds!` : 'The bananalope got away this time.';
}
export function scoreRow(scene, med) {
  const ch = scene.ch;
  const m = D(scene).medal;
  return { label: ch.caught ? `Caught in ${clock(Math.round(ch.t * 10) / 10)}` : 'Not caught', detail: `${med.name}   (gold ${clock(m.gold)}, silver ${clock(m.silver)})` };
}
