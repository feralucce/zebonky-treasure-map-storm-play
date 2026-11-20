// A terraces room (`terraces: {...}` in data/bonusRooms.js; Sofia's Terrace
// Garden first: Chris's idea, the user's choices, 2026-11-17). Everything it
// adds to BonusRoom.js lives here, behind the same hooks as circuits.js.
// Played and tuned first as a throwaway demo (tools/sofia_demo/).
//
// The rules (docs/bonus-level-ideas.md, "Sofia's and Unity's rooms"): the
// falling-block kind of play, but not obviously Tetris (the user):
// - A terraced hillside: each terrace is a row, all the same width
//   (the user: "Straight sides"; a hill wide at the bottom tucked every
//   row's edge under an overhang). The terraced look is in the drawing.
// - Sofia tosses each clump down from the hilltop; it's steered left and
//   right and turned as it tumbles. Clumps are 2, 3 or 5 cells (not the
//   classic four), one plant kind each, and grow together into one shape
//   (no tile lines).
// - Any full terrace blooms, clears and charges the Z meter (a segment).
//   Everything above drops a row.
// - Z Quake: X with a full meter sinks the bottom rows into the hill and
//   everything drops, making room.
// - It ends when a clump can't be tossed. The medal is for terraces planted.

import { ZMeter, SEGMENTS } from '../zmeter.js?v=4607924';
import { MAP_W, MAP_H } from '../data/world.js?v=4607924';
import { texKey } from '../data/artsets.js?v=4607924';
import { tierInfo, clock } from '../paws.js?v=4607924';
import { play, FEET_ROW } from '../actors.js?v=4607924';
import { audio } from '../audio.js?v=4607924';
import { COLORS, heading, text } from '../theme.js?v=4607924';
import { TOUCH_ONLY } from '../touch.js?v=4607924';

export const owns = true;

const D = (scene) => scene.room.terraces;
const key = (c, r) => `${c},${r}`;
const hexNum = (h) => parseInt(h.slice(1), 16);

export function reset(scene) {
  scene.tr = {
    grid: {}, piece: null, nextId: 1, dropT: 0, planted: 0, ended: false, t: 0, queue: [], keysOn: false,
    moveRep: 0, bloom: [], tossT: 0, quakeT: 0, touchWas: {}, touchDown: false, auto: null, pool: [], used: 0,
  };
}

// ---------- the hill ----------

function geo(scene) {
  const d = D(scene);
  const width = () => d.width;
  const lo = (r) => -Math.floor(width(r) / 2);
  const hi = (r) => width(r) - Math.floor(width(r) / 2);
  const inside = (c, r) => r >= 0 && r < d.rows && c >= lo(r) && c < hi(r);
  const x = (c) => d.cx + c * d.cell;
  const y = (r) => d.top + r * d.cell;
  return { width, lo, hi, inside, x, y, S: d.cell, rows: d.rows };
}

const cellsOf = (p) => p.cells.map(([dc, dr]) => [p.c + dc, p.r + dr]);

function fits(tr, cells) {
  const G = tr.G;
  return cells.every(([c, r]) => (r < 0 ? c >= G.lo(0) && c < G.hi(0) : G.inside(c, r)) && !tr.grid[key(c, r)]);
}

// a quarter turn, pulled back to its own top-left
function turned(p) {
  const n = p.cells.map(([c, r]) => [-r, c]);
  const mc = Math.min(...n.map(([c]) => c)), mr = Math.min(...n.map(([, r]) => r));
  return { ...p, cells: n.map(([c, r]) => [c - mc, r - mr]) };
}

export function build(scene) {
  const tr = scene.tr;
  tr.G = geo(scene);
  tr.api = { fits: (cells) => fits(tr, cells), cellsOf, turned };
  const G = tr.G;
  // the hillside the beds are cut into, sloping away on both sides
  const hill = scene.add.graphics().setDepth(2);
  const L = G.x(G.lo(0)), R = G.x(G.hi(0)), top = G.y(0) - 20;
  [[L - 30, L - 250], [R + 30, R + 250]].forEach(([near, far], k) => {
    const pts = [[near, top], [far, MAP_H], [near, MAP_H]];
    hill.fillStyle(COLORS.ink, 1).fillTriangle(pts[0][0] + (k ? 6 : -6), pts[0][1] - 6, pts[1][0] + (k ? 8 : -8), pts[1][1], pts[2][0], pts[2][1]);
    hill.fillStyle(0x7a8a30, 1).fillTriangle(...pts.flat());
    // little steps down the slope
    for (let r = 1; r < G.rows; r += 2) {
      const yy = G.y(r);
      const xx = near + (far - near) * ((yy - top) / (MAP_H - top));
      hill.lineStyle(3, 0x5c6a20, 1).lineBetween(near, yy, xx, yy);
    }
  });
  hill.fillStyle(0x9aaa3c, 1).fillRect(L - 30, top - 6, R - L + 60, 12);
  // the terraces: one for every row, a stone wall along each one's front
  for (let r = 0; r < G.rows; r++) {
    hill.fillStyle(COLORS.ink, 1).fillRect(G.x(G.lo(r)) - 6, G.y(r), G.width(r) * G.S + 12, MAP_H - G.y(r));
    hill.fillStyle(0x5c3e24, 1).fillRect(G.x(G.lo(r)) - 2, G.y(r) + 4, G.width(r) * G.S + 4, MAP_H - G.y(r));
  }
  for (let r = 0; r < G.rows; r++) {
    hill.fillStyle(0x8c8278, 1).fillRect(G.x(G.lo(r)) - 2, G.y(r) + G.S - 7, G.width(r) * G.S + 4, 7);
    hill.fillStyle(COLORS.ink, 1);
    for (let xx = G.x(G.lo(r)); xx < G.x(G.hi(r)); xx += 28) hill.fillRect(xx, G.y(r) + G.S - 7, 2, 7);
  }
  tr.g = scene.add.graphics().setDepth(3);
  tr.fx = scene.add.graphics().setDepth(9);
}

// ---------- the clumps ----------

function toss(scene) {
  const tr = scene.tr;
  const d = D(scene);
  const sh = d.shapes[Math.floor(Math.random() * d.shapes.length)];
  const kinds = Object.keys(d.kinds);
  const minR = Math.min(...sh.map(([, r]) => r));
  const p = { cells: sh.map(([c, r]) => [c, r - minR]), c: -1, r: 0, kind: kinds[Math.floor(Math.random() * kinds.length)], id: tr.nextId++ };
  if (!fits(tr, cellsOf(p))) { finish(scene); return; }
  tr.piece = p;
  tr.dropT = 0;
  tr.tossT = 0.35;
  audio.sfx(scene, 'toss');
}

function move(tr, dc, dr) {
  const t = { ...tr.piece, c: tr.piece.c + dc, r: tr.piece.r + dr };
  if (!fits(tr, cellsOf(t))) return false;
  tr.piece = t;
  return true;
}

function turn(tr) {
  const n = turned(tr.piece);
  for (const dx of [0, -1, 1, -2, 2]) {
    const t = { ...n, c: tr.piece.c + dx };
    if (fits(tr, cellsOf(t))) { tr.piece = t; return; }
  }
}

function land(scene) {
  const tr = scene.tr;
  const d = D(scene);
  const G = tr.G;
  cellsOf(tr.piece).forEach(([c, r]) => { tr.grid[key(c, r)] = { kind: tr.piece.kind, id: tr.piece.id }; });
  tr.piece = null;
  audio.sfx(scene, 'pad');
  const full = [];
  for (let r = 0; r < G.rows; r++) {
    let ok = true;
    for (let c = G.lo(r); c < G.hi(r); c++) if (!tr.grid[key(c, r)]) { ok = false; break; }
    if (ok) full.push(r);
  }
  if (full.length) {
    tr.bloom = full.map((r) => ({ r, t: 0.6 }));
    tr.planted += full.length;
    tr.meter.fill = Math.min(SEGMENTS, tr.meter.fill + d.perRow * full.length);
    full.forEach((fr) => sink(tr, fr, 1));
    say(scene, full.length > 1 ? `${full.length} terraces planted!` : 'Terrace planted!');
    audio.sfx(scene, 'correct');
  }
  toss(scene);
}

// drop everything above row `bottom` by n rows (rows bottom-n+1..bottom go)
function sink(tr, bottom, n) {
  const G = tr.G;
  for (let r = bottom; r >= 0; r--) {
    for (let c = G.lo(G.rows - 1); c < G.hi(G.rows - 1); c++) {
      const from = r - n;
      const v = from >= 0 ? tr.grid[key(c, from)] : null;
      if (v && G.inside(c, r)) tr.grid[key(c, r)] = v; else delete tr.grid[key(c, r)];
    }
  }
}

function quake(scene) {
  const tr = scene.tr;
  if (!tr.meter.full && tr.meter.fill < SEGMENTS) { say(scene, 'Plant terraces to fill the Z meter!'); return; }
  tr.meter.fill = 0;
  tr.quakeT = 1;
  sink(tr, tr.G.rows - 1, D(scene).sink);
  if (tr.piece && !fits(tr, cellsOf(tr.piece))) { tr.piece.r = 0; if (!fits(tr, cellsOf(tr.piece))) tr.piece = null; }
  say(scene, 'Z Quake!');
  audio.sfx(scene, 'crate');
  scene.cameras.main.shake(400, 0.012);
}

// ---------- HUD ----------

export function buildHud(scene) {
  const tr = scene.tr;
  tr.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  const box = (x, label) => {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
    g.fillStyle(COLORS.parchment, 0.95).fillRoundedRect(x, 14, 150, 64, 10);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, 14, 150, 64, 10);
    scene.add.text(x + 75, 30, label, heading(16, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    return scene.add.text(x + 75, 56, '', heading(24, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  };
  tr.plantText = box(MAP_W - 340, 'TERRACES');
  tr.timeText = box(MAP_W - 176, 'TIME');
  // touch: a drop button over left and right (held), and a Z Quake button
  const y = MAP_H - 80;
  // (dropping is the scene's D-pad down: scene.touch.down)
  tr.btn = scene.add.image(MAP_W - 210, y, 'btn-power').setScale(0.8).setTint(0xf0c060).setScrollFactor(0).setDepth(20).setInteractive();
  tr.btn.on('pointerdown', () => tr.queue.push('quake'));
  tr.btnLabel = scene.add.text(MAP_W - 210, MAP_H - 30, 'X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setVisible(!TOUCH_ONLY);
}

export const collide = () => false;
export const respawn = () => {};

function listen(scene) {
  const tr = scene.tr;
  const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'turn', KeyW: 'turn', Space: 'turn', KeyZ: 'turn', KeyJ: 'turn', KeyX: 'quake', KeyK: 'quake', KeyF: 'quake' };
  scene.input.keyboard.on('keydown', (ev) => { if (map[ev.code] && !ev.repeat) tr.queue.push(map[ev.code]); });
  tr.keysOn = true;
}

// ---------- once a physics step ----------

export function step(scene) {
  const tr = scene.tr;
  const d = D(scene);
  if (!tr.camSet) {
    tr.camSet = true;
    scene.cameras.main.stopFollow();
    scene.cameras.main.setScroll(0, 0);
    Phaser.Physics.Matter.Matter.Body.setStatic(scene.ball, true);
    if (scene.door) scene.door.setVisible(false);
  }
  if (!tr.keysOn) listen(scene);
  scene.jumpAsked = false;
  if (tr.ended) return;
  const dt = 1 / 60;
  tr.t += dt;
  // touch: the scene's left, right and jump buttons, as presses
  ['left', 'right', 'jump'].forEach((k) => {
    const on = !!scene.touch[k];
    if (on && !tr.touchWas[k]) tr.queue.push(k === 'jump' ? 'turn' : k);
    tr.touchWas[k] = on;
  });
  if (!tr.piece) toss(scene);
  if (!tr.piece) return;
  const k = scene.keys;
  const a = tr.auto;
  // one press a step, as they come
  const act = tr.queue.shift();
  if (act === 'left') { move(tr, -1, 0); tr.moveRep = 0.22; }
  else if (act === 'right') { move(tr, 1, 0); tr.moveRep = 0.22; }
  else if (act === 'turn') turn(tr);
  else if (act === 'quake') quake(scene);
  if (!tr.piece) return;
  // held: keep sliding
  const h = a ? 0 : (k.RIGHT.isDown || k.D.isDown || scene.touch.right ? 1 : 0) - (k.LEFT.isDown || k.A.isDown || scene.touch.left ? 1 : 0);
  tr.moveRep -= dt;
  if (h && tr.moveRep <= 0) { move(tr, h, 0); tr.moveRep = 0.08; }
  const soft = a ? a.soft : (k.DOWN.isDown || k.S.isDown || scene.touch.down);
  tr.dropT += dt;
  if (tr.dropT >= (soft ? d.soft : d.drop)) { tr.dropT = 0; if (!move(tr, 0, 1)) land(scene); }
  tr.tossT -= dt; tr.quakeT -= dt;
  tr.bloom.forEach((b) => { b.t -= dt; });
  tr.bloom = tr.bloom.filter((b) => b.t > 0);
  Phaser.Physics.Matter.Matter.Body.setPosition(scene.ball, { x: d.cx - d.cell / 2, y: d.top - 8 });
}

function say(scene, msg) {
  const t = scene.add.text(MAP_W / 2, 118, msg, heading(36, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 8 }))
    .setOrigin(0.5).setScrollFactor(0).setDepth(22);
  scene.tweens.add({ targets: t, y: 90, alpha: 0, delay: 700, duration: 600, onComplete: () => t.destroy() });
}

function finish(scene) {
  const tr = scene.tr;
  if (tr.ended) return;
  tr.ended = true;
  tr.piece = null;
  say(scene, 'The hill is full!');
  audio.sfx(scene, 'level-end');
  scene.doorAt = { x: D(scene).cx, y: D(scene).top };
  if (scene.door) { scene.door.x = D(scene).cx; scene.door.y = D(scene).top - 30; }
  scene.time.delayedCall(1300, () => scene.reachDoor());
}

// ---------- every frame ----------

function sprite(scene, k, x, y, w, alpha) {
  const tr = scene.tr;
  let img = tr.pool[tr.used];
  if (!img) { img = scene.add.image(0, 0, k).setDepth(3.5); tr.pool.push(img); }
  tr.used += 1;
  if (img.texture.key !== k) img.setTexture(k);
  img.setOrigin(0.5, 1).setPosition(x, y).setScale(w / img.width).setAlpha(alpha).setVisible(true);
}

function drawClump(scene, cells, kind, alpha) {
  const tr = scene.tr;
  const G = tr.G;
  const S = G.S;
  const d = D(scene);
  const g = tr.g;
  const set = new Set(cells.map(([c, r]) => key(c, r)));
  const tint = hexNum(d.kinds[kind][1]);
  g.fillStyle(COLORS.ink, alpha);
  cells.forEach(([c, r]) => g.fillRoundedRect(G.x(c) - 3, G.y(r) - 3, S + 6, S + 6, 15));
  g.fillStyle(tint, alpha);
  cells.forEach(([c, r]) => {
    g.fillRoundedRect(G.x(c), G.y(r), S, S, 13);
    if (set.has(key(c + 1, r))) g.fillRect(G.x(c) + S / 2, G.y(r), S, S);
    if (set.has(key(c, r + 1))) g.fillRect(G.x(c), G.y(r) + S / 2, S, S);
  });
  // a darker band of soil low in each cell, so it reads as earth
  g.fillStyle(0x000000, 0.12 * alpha);
  cells.forEach(([c, r]) => g.fillRect(G.x(c) + 4, G.y(r) + S * 0.6, S - 8, S * 0.3));
  const art = scene.room.artset;
  cells.forEach(([c, r]) => {
    if (kind === 'hay') {
      const hk = texKey(art, scene.cache.json.get(`artset:${art}`).food);
      sprite(scene, hk, G.x(c) + S * 0.32, G.y(r) + S * 0.62, S * 0.45, alpha);
      sprite(scene, hk, G.x(c) + S * 0.7, G.y(r) + S * 0.82, S * 0.45, alpha);
    } else if (!set.has(key(c, r - 1))) {
      sprite(scene, texKey(art, d.kinds[kind][0]), G.x(c) + S / 2, G.y(r) + S * 0.4, S * 1.15, alpha);
    }
  });
}

export function update(scene, time) {
  const tr = scene.tr;
  const G = tr.G;
  const g = tr.g;
  g.clear();
  tr.used = 0;
  // terraces just planted: a glow where they were
  tr.bloom.forEach((b) => g.fillStyle(0xffe678, b.t).fillRect(G.x(G.lo(b.r)), G.y(b.r), G.width(b.r) * G.S, G.S));
  const groups = {};
  Object.entries(tr.grid).forEach(([k, v]) => { (groups[v.id + v.kind] ||= { kind: v.kind, cells: [] }).cells.push(k.split(',').map(Number)); });
  Object.values(groups).forEach((gr) => drawClump(scene, gr.cells, gr.kind, 1));
  if (tr.piece) {
    const ghost = { ...tr.piece };
    while (fits(tr, cellsOf({ ...ghost, r: ghost.r + 1 }))) ghost.r += 1;
    drawClump(scene, cellsOf(ghost), tr.piece.kind, 0.3);
    drawClump(scene, cellsOf(tr.piece), tr.piece.kind, 1);
  }
  for (let i = tr.used; i < tr.pool.length; i++) tr.pool[i].setVisible(false);
  // Sofia on the hilltop: tossing, or stomping for Z Quake
  const s = scene.shaan;
  const d = D(scene);
  s.setScale(0.75).setOrigin(0.5, FEET_ROW / 128).setFlipX(true);
  s.setPosition(d.cx - d.cell / 2, d.top - 2 - (tr.quakeT > 0.6 ? 30 : 0));
  const want = tr.tossT > 0 || tr.quakeT > 0 ? 'jump' : 'idle';
  if (tr.anim !== want) { tr.anim = want; play(s, scene.art, want); }
  // Z Quake's waves along the bottom of the hill
  const fx = tr.fx;
  fx.clear();
  if (tr.quakeT > 0) {
    for (let k = 0; k < 3; k++) {
      fx.lineStyle(6, 0xffe678, tr.quakeT).strokeEllipse(d.cx, G.y(G.rows - 1) + 30, (120 + (1 - tr.quakeT) * 500 + k * 70) * 2, (30 + k * 10) * 2);
    }
  }
  // HUD
  tr.meter.update(time);
  tr.btn.setAlpha(tr.meter.fill >= SEGMENTS ? 1 : 0.65);
  tr.btnLabel.setAlpha(tr.meter.fill >= SEGMENTS ? 1 : 0.4);
  tr.plantText.setText(String(tr.planted));
  tr.timeText.setText(clock(Math.floor(tr.t)));
}

// ---------- the score ----------

export function medal(scene) {
  const tr = scene.tr;
  const m = D(scene).medal;
  const tier = tr.planted >= m.gold ? 3 : tr.planted >= m.silver ? 2 : 1;
  return { ...tierInfo(tier), score: tr.planted, max: m.gold };
}
export function scoreLine(scene) {
  const n = scene.tr.planted;
  return `You planted ${n} terrace${n === 1 ? '' : 's'}.`;
}
export function scoreRow(scene, med) {
  const m = D(scene).medal;
  return { label: `Terraces ${scene.tr.planted}`, detail: `${med.name}   (gold ${m.gold}, silver ${m.silver})` };
}
