// A circuits room (`circuits: {...}` in data/bonusRooms.js; Ricky's Cumulus
// Circuits first: Chris's idea, the user's choices, 2026-11-17). Everything
// it adds to BonusRoom.js lives here, behind the same hooks as foam.js.
//
// The rules (docs/bonus-level-ideas.md, "Ricky's room: Cumulus Circuits"):
// - One board of tiles carrying wires. Power comes from a storm cloud over
//   the top edge; trees stand round the other edges. A tree lights when a
//   connected run of wires reaches it from the cloud, and a lit tree stays
//   lit. Light as many as possible before the clock runs out.
// - Ricky hops from tile to tile with the arrows and spins the tile he's on
//   a quarter turn with the jump key (the user: he hops, no tapping tiles).
// - Each tree lit fills 2 segments of the Z meter. With the meter full, the
//   power key fires Static Shock: +20 s on the clock (all provisional).
// - Score: 10 a tree, +30 for all of them; gold for all, silver for 5 or
//   more, bronze otherwise, paid in Z-bolts. Time left isn't scored.
// - Then he hops off the board and along the ground to the portal, off
//   screen till then (as in Axel's room).

import { ZMeter, SEGMENTS } from '../zmeter.js?v=fe9db25';
import { MAP_W, MAP_H } from '../data/world.js?v=fe9db25';
import { tierInfo, clock } from '../paws.js?v=fe9db25';
import { play } from '../actors.js?v=fe9db25';
import { audio } from '../audio.js?v=fe9db25';
import { COLORS, heading, text } from '../theme.js?v=fe9db25';

const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0]];
const OPP = { [N]: S, [S]: N, [E]: W, [W]: E };
const HOP_MS = 150;
const SPIN_MS = 110;
const RICKY_SCALE = 0.62;   // on a 96 px tile; scaled with the tile (k)
const k96 = (scene) => C(scene).tile / 96;
const Matter = () => Phaser.Physics.Matter.Matter;

export const owns = true;   // its own step and update (BonusRoom skips its rolling)

export function rot(mask, turns) {
  let m = mask;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

const C = (scene) => scene.room.circuits;
const centre = (scene, c, r) => {
  const b = C(scene);
  return [b.x + c * b.tile + b.tile / 2, b.y + r * b.tile + b.tile / 2];
};

export function reset(scene) {
  scene.cm = {
    tiles: [], at: [0, 0], lit: new Set(), timeLeft: 90, ended: false, busy: 0, queue: [],
    score: 0, camSet: false, keysOn: false,
  };
}

export function build(scene) {
  const cm = scene.cm;
  const b = C(scene);
  cm.timeLeft = b.time;
  cm.at = b.source.slice();
  // the board's backing
  const bg = scene.add.graphics().setDepth(2.5);
  bg.fillStyle(0x1b1a2e, 0.55).fillRoundedRect(b.x - 10, b.y - 10, b.cols * b.tile + 20, b.rows * b.tile + 20, 16);
  cm.tiles = b.tiles.map((t) => {
    const [x, y] = centre(scene, t.c, t.r);
    const g = scene.add.graphics({ x, y }).setDepth(3);
    return { ...t, g, powered: false };
  });
  // the storm cloud over the source
  const [sx, sy] = centre(scene, b.source[0], b.source[1]);
  cm.cloud = scene.add.graphics({ x: sx, y: sy - b.tile * 0.5 - 50 }).setDepth(3.5);
  drawCloud(cm.cloud);
  scene.tweens.add({ targets: cm.cloud, y: cm.cloud.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  // the trees, just off the board's edges, each with a wire to its tile
  cm.trees = b.trees.map((tr) => {
    const [x, y] = centre(scene, tr.c, tr.r);
    const d = DIRS.find(([bit]) => bit === tr.out);
    const tx = x + d[1] * (b.tile / 2 + 34), ty = y + d[2] * (b.tile / 2 + 34);
    const wire = scene.add.graphics().setDepth(2.8);
    const g = scene.add.graphics({ x: tx, y: ty }).setDepth(3.2).setScale(Math.max(0.75, k96(scene)));
    const t = { ...tr, x: tx, y: ty, g, wire, lit: false, fromX: x + d[1] * b.tile / 2, fromY: y + d[2] * b.tile / 2 };
    drawTree(t);
    return t;
  });
  power(scene, true);
}

function drawCloud(g) {
  g.clear();
  [[-34, 6, 26], [-8, -8, 32], [24, 0, 28], [44, 10, 20], [-50, 14, 18]].forEach(([x, y, r]) => {
    g.fillStyle(0x1b1a2e, 1).fillCircle(x, y, r + 4);
  });
  [[-34, 6, 26], [-8, -8, 32], [24, 0, 28], [44, 10, 20], [-50, 14, 18]].forEach(([x, y, r]) => {
    g.fillStyle(0x7d8499, 1).fillCircle(x, y, r);
  });
  g.fillStyle(0x9aa1b6, 1).fillCircle(-12, -14, 18);
  // its bolt down into the source tile
  g.fillStyle(0xffe600, 1).lineStyle(3, 0x1b1a2e, 1);
  const pts = [[4, 20], [-8, 40], [2, 40], [-6, 60], [12, 34], [2, 34], [10, 20]];
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fillPath(); g.strokePath();
}

function drawTree(t) {
  const g = t.g;
  g.clear();
  // trunk
  g.fillStyle(0x1b1a2e, 1).fillRect(-8, 2, 16, 34);
  g.fillStyle(0x7a4a26, 1).fillRect(-5, 4, 10, 30);
  // a puffy cumulus crown
  const puffs = [[-20, -6, 20], [20, -6, 20], [0, -22, 24], [0, 0, 22]];
  puffs.forEach(([x, y, r]) => g.fillStyle(0x1b1a2e, 1).fillCircle(x, y, r + 3));
  puffs.forEach(([x, y, r]) => g.fillStyle(t.lit ? 0x9dff7a : 0x3f8f4a, 1).fillCircle(x, y, r));
  if (t.lit) {
    [[-18, -10], [14, -16], [2, -2], [-6, -26], [20, 2], [-24, 4]].forEach(([x, y], i) => {
      g.fillStyle(i % 2 ? 0xffe600 : 0x8ff6ff, 1).fillCircle(x, y, 4);
    });
  }
  // its wire from the board
  t.wire.clear();
  t.wire.lineStyle(12, 0x1b1a2e, 1).lineBetween(t.fromX, t.fromY, t.x, t.y);
  t.wire.lineStyle(6, t.lit ? 0x8ff6ff : 0x8a5a2b, 1).lineBetween(t.fromX, t.fromY, t.x, t.y);
}

function drawTile(scene, t) {
  const b = C(scene);
  const g = t.g;
  const h = b.tile / 2 - 3;
  const k = k96(scene);
  g.clear();
  g.fillStyle(0x1b1a2e, 1).fillRoundedRect(-h - 3, -h - 3, 2 * h + 6, 2 * h + 6, 12 * k);
  g.fillStyle(t.powered ? 0x3b4a6e : 0x3a3346, 1).fillRoundedRect(-h, -h, 2 * h, 2 * h, 10 * k);
  g.lineStyle(2, 0x5d566e, 1).strokeRoundedRect(-h + 4 * k, -h + 4 * k, 2 * h - 8 * k, 2 * h - 8 * k, 8 * k);
  const m = rot(t.mask, t.turns);
  DIRS.forEach(([bit, dx, dy]) => {
    if (!(m & bit)) return;
    g.lineStyle(16 * k, 0x1b1a2e, 1).lineBetween(0, 0, dx * (h + 3), dy * (h + 3));
  });
  DIRS.forEach(([bit, dx, dy]) => {
    if (!(m & bit)) return;
    g.lineStyle(9 * k, t.powered ? 0x8ff6ff : 0x8a5a2b, 1).lineBetween(0, 0, dx * (h + 3), dy * (h + 3));
    if (t.powered) g.lineStyle(3 * k, 0xffffff, 0.9).lineBetween(0, 0, dx * (h + 3), dy * (h + 3));
  });
  g.fillStyle(0x1b1a2e, 1).fillCircle(0, 0, 11 * k);
  g.fillStyle(t.powered ? 0xffe600 : 0xb07a3a, 1).fillCircle(0, 0, 7 * k);
}

const tileAt = (scene, c, r) => scene.cm.tiles.find((t) => t.c === c && t.r === r);

// Power from the cloud along connected wires; light any tree it reaches.
function power(scene, quiet = false) {
  const cm = scene.cm;
  const b = C(scene);
  cm.tiles.forEach((t) => { t.powered = false; });
  const src = tileAt(scene, b.source[0], b.source[1]);
  const todo = [];
  if (rot(src.mask, src.turns) & N) { src.powered = true; todo.push(src); }
  while (todo.length) {
    const t = todo.pop();
    const m = rot(t.mask, t.turns);
    DIRS.forEach(([bit, dx, dy]) => {
      if (!(m & bit)) return;
      const n = tileAt(scene, t.c + dx, t.r + dy);
      if (!n || n.powered || !(rot(n.mask, n.turns) & OPP[bit])) return;
      n.powered = true;
      todo.push(n);
    });
  }
  cm.tiles.forEach((t) => drawTile(scene, t));
  cm.trees.forEach((tr) => {
    const t = tileAt(scene, tr.c, tr.r);
    if (tr.lit || !t.powered || !(rot(t.mask, t.turns) & tr.out)) return;
    tr.lit = true;   // a lit tree stays lit
    drawTree(tr);
    if (quiet) return;
    cm.score += b.treePoints;
    cm.meter.fill = Math.min(SEGMENTS, cm.meter.fill + b.perTree);
    scene.floatText(tr.x, tr.y - 60, `Lit! +${b.treePoints}`);
    audio.sfx(scene, 'correct');
    const ring = scene.add.circle(tr.x, tr.y - 8, 30, 0xffe600, 0).setStrokeStyle(6, 0xffe600).setDepth(8);
    scene.tweens.add({ targets: ring, radius: 110, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  });
  refresh(scene);
  if (!quiet && cm.trees.every((tr) => tr.lit)) finish(scene, true);
}

export function buildHud(scene) {
  const cm = scene.cm;
  cm.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  const box = (x, label) => {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
    g.fillStyle(COLORS.parchment, 0.95).fillRoundedRect(x, 14, 150, 64, 10);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, 14, 150, 64, 10);
    scene.add.text(x + 75, 30, label, heading(16, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    return scene.add.text(x + 75, 56, '', heading(26, COLORS.inkCss)).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  };
  cm.scoreText = box(MAP_W - 340, 'SCORE');
  cm.timeText = box(MAP_W - 176, 'TIME');
  cm.treeText = scene.add.text(MAP_W - 265, 96, '', heading(22, '#ffffff', { stroke: COLORS.inkCss, strokeThickness: 6 }))
    .setOrigin(0.5).setScrollFactor(0).setDepth(21);
  // touch: up and down beside the left and right buttons, the power button
  // beside the jump button
  const y = MAP_H - 80;
  const tap = (img, act) => {
    img.setScrollFactor(0).setAlpha(0.75).setDepth(20).setInteractive();
    img.on('pointerdown', () => { cm.queue.push(act); img.setAlpha(1); });
    img.on('pointerup', () => img.setAlpha(0.75));
    img.on('pointerout', () => img.setAlpha(0.75));
    return img;
  };
  // (stacked over the left and right buttons: beside them they sat on the board)
  tap(scene.add.image(135, y - 190, 'btn-jump').setScale(0.7), 'up');
  tap(scene.add.image(135, y - 110, 'btn-jump').setScale(0.7).setFlipY(true), 'down');
  cm.btn = tap(scene.add.image(MAP_W - 210, y, 'btn-jump').setScale(0.8).setTint(0xffc93c), 'power');
  cm.btnLabel = scene.add.text(MAP_W - 210, MAP_H - 30, 'X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setAlpha(0.4);
  refresh(scene);
}

function refresh(scene) {
  const cm = scene.cm;
  if (!cm.scoreText) return;
  cm.scoreText.setText(String(cm.score).padStart(6, '0'));
  cm.treeText.setText(`Trees ${cm.trees.filter((t) => t.lit).length} / ${cm.trees.length}`);
}

export const collide = () => false;
export const respawn = () => {};

// Keys come as events (Phaser's JustDown was already used up by the scene's
// own reading of the arrows and jump keys before this hook runs).
function listen(scene) {
  const cm = scene.cm;
  const map = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'spin', KeyZ: 'spin', KeyJ: 'spin', KeyX: 'power', KeyK: 'power', KeyF: 'power',
  };
  scene.input.keyboard.on('keydown', (ev) => { if (map[ev.code] && !ev.repeat) cm.queue.push(map[ev.code]); });
  cm.keysOn = true;
}

// Once a physics step: the clock, and one action from the queue.
export function step(scene, time) {
  const cm = scene.cm;
  const b = C(scene);
  const M = Matter();
  if (!cm.camSet) {
    cm.camSet = true;
    scene.cameras.main.stopFollow();
    scene.cameras.main.setScroll(0, 0);
    M.Body.setStatic(scene.ball, true);
    const [x, y] = centre(scene, cm.at[0], cm.at[1]);
    M.Body.setPosition(scene.ball, { x, y: y - 8 * k96(scene) });
  }
  if (!cm.keysOn) listen(scene);
  // the touch buttons the scene already has: left, right, jump (spin)
  if (scene.touchJump) { cm.queue.push('spin'); scene.touchJump = false; }
  if (scene.tapped) { cm.queue.push(scene.tapped > 0 ? 'right' : 'left'); scene.tapped = 0; }
  scene.jumpAsked = false;
  if (cm.ended) return;
  cm.timeLeft = Math.max(0, cm.timeLeft - 1 / 60);
  if (cm.timeLeft <= 0) { finish(scene, false); return; }
  if (time < cm.busy || !cm.queue.length) return;
  const act = cm.queue.shift();
  if (act === 'spin') spin(scene, time);
  else if (act === 'power') staticShock(scene);
  else hop(scene, act, time);
}

function hop(scene, act, time) {
  const cm = scene.cm;
  const b = C(scene);
  const [dc, dr] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[act];
  const c = cm.at[0] + dc, r = cm.at[1] + dr;
  if (c < 0 || r < 0 || c >= b.cols || r >= b.rows) return;
  cm.at = [c, r];
  cm.busy = time + HOP_MS;
  const [x, y] = centre(scene, c, r);
  const from = { x: scene.ball.position.x, y: scene.ball.position.y };
  const go = { t: 0 };
  if (dc) cm.face = dc;
  play(scene.shaan, scene.art, 'jump');
  scene.tweens.add({
    targets: go, t: 1, duration: HOP_MS, ease: 'Sine.InOut',
    onUpdate: () => Matter().Body.setPosition(scene.ball, { x: from.x + (x - from.x) * go.t, y: from.y + (y - 8 * k96(scene) - from.y) * go.t - Math.sin(Math.PI * go.t) * 26 * k96(scene) }),
    onComplete: () => play(scene.shaan, scene.art, 'idle'),
  });
  audio.sfx(scene, 'jump');
}

function spin(scene, time) {
  const cm = scene.cm;
  const t = tileAt(scene, cm.at[0], cm.at[1]);
  cm.busy = time + SPIN_MS;
  // The turn counts at once (counted when the animation ended, a quick second
  // press could spin a tile one turn too far); the picture is redrawn turned
  // and swings the last quarter into place.
  scene.tweens.killTweensOf(t.g);
  t.turns = (t.turns + 1) % 4;
  power(scene);
  t.g.setAngle(-90);
  scene.tweens.add({ targets: t.g, angle: 0, duration: SPIN_MS, ease: 'Quad.Out' });
  audio.sfx(scene, 'toss');
}

// A full meter: Static Shock, +20 s on the clock.
function staticShock(scene) {
  const cm = scene.cm;
  const b = C(scene);
  const [x, y] = [scene.ball.position.x, scene.ball.position.y];
  if (!cm.meter.full) {
    scene.floatText(x, y - 70, 'Fill the Z meter!');
    return;
  }
  cm.meter.fill = 0;
  cm.timeLeft += b.shock;
  scene.floatText(x, y - 80, `Static Shock! +${b.shock}s`);
  audio.sfx(scene, 'correct');
  scene.cameras.main.shake(200, 0.008);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const sp = scene.add.star(x, y - 10, 4, 4, 12, k % 2 ? 0xffe600 : 0x8ff6ff).setStrokeStyle(2, COLORS.ink).setDepth(9);
    scene.tweens.add({ targets: sp, x: x + Math.cos(a) * 90, y: y - 10 + Math.sin(a) * 90, alpha: 0, duration: 500, onComplete: () => sp.destroy() });
  }
}

// All lit, or the clock out: off the board and along the ground to the portal.
function finish(scene, all) {
  const cm = scene.cm;
  if (cm.ended) return;
  cm.ended = true;
  const b = C(scene);
  if (all) cm.score += b.allBonus;
  refresh(scene);
  const cam = scene.cameras.main;
  const say = scene.add.text(MAP_W / 2, 330, all ? `All lit! +${b.allBonus}` : 'Time!', heading(56, COLORS.yellowCss, {
    stroke: COLORS.inkCss, strokeThickness: 12,
  })).setOrigin(0.5).setDepth(22);
  scene.tweens.add({ targets: say, alpha: 0, delay: 1000, duration: 400, onComplete: () => say.destroy() });
  audio.sfx(scene, all ? 'level-end' : 'hint');
  const M = Matter();
  scene.time.delayedCall(1300, () => {
    // hop down off the board's right side to the ground, then walk
    const from = { x: scene.ball.position.x, y: scene.ball.position.y };
    const gx = b.x + b.cols * b.tile + 60, gy = scene.doorAt.y - 38;
    const leap = { t: 0 };
    cm.face = 1;
    play(scene.shaan, scene.art, 'jump');
    scene.tweens.add({
      targets: leap, t: 1, duration: 700, ease: 'Sine.InOut',
      onUpdate: () => M.Body.setPosition(scene.ball, { x: from.x + (gx - from.x) * leap.t, y: from.y + (gy - from.y) * leap.t - Math.sin(Math.PI * leap.t) * 120 }),
      onComplete: () => {
        play(scene.shaan, scene.art, 'run');
        const to = scene.doorAt.x - 10;
        const ms = Math.max(600, ((to - gx) / 6) * (1000 / 60));
        scene.tweens.add({ targets: cam, scrollX: scene.room.width - MAP_W, duration: ms, ease: 'Sine.InOut' });
        const walk = { x: gx };
        scene.tweens.add({
          targets: walk, x: to, duration: ms, ease: 'Sine.InOut',
          onUpdate: () => M.Body.setPosition(scene.ball, { x: walk.x, y: gy }),
          onComplete: () => scene.reachDoor(),
        });
      },
    });
  });
}

// Every frame: his picture, the clock, the meter.
export function update(scene, time) {
  const cm = scene.cm;
  const s = scene.shaan;
  s.setScale(RICKY_SCALE * k96(scene)).setOrigin(0.5, 0.62);
  // (his art faces left: flipX turns him right)
  s.setFlipX((cm.face || 1) > 0);
  if (!s.anims.isPlaying) play(s, scene.art, 'idle');
  cm.meter.update(time);
  cm.btn.setAlpha(cm.meter.full ? 1 : 0.4);
  cm.btnLabel.setAlpha(cm.meter.full ? 1 : 0.4);
  cm.timeText.setText(clock(Math.ceil(cm.timeLeft)));
  cm.timeText.setColor(cm.timeLeft <= 10 && !cm.ended ? '#b3261e' : COLORS.inkCss);
}

export function medal(scene) {
  const cm = scene.cm;
  const n = cm.trees.filter((t) => t.lit).length;
  const tier = n >= cm.trees.length ? 3 : n >= 5 ? 2 : 1;
  return { ...tierInfo(tier), score: cm.score, max: cm.trees.length * C(scene).treePoints + C(scene).allBonus };
}
export function scoreLine(scene) {
  const cm = scene.cm;
  return `Trees lit ${cm.trees.filter((t) => t.lit).length} of ${cm.trees.length}`;
}
export function scoreRow(scene, med) {
  return { label: `Score ${med.score}`, detail: `${med.name}   (gold: all trees, silver: 5)` };
}
