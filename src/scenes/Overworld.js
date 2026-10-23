// The Zebonkia overworld, played like the Super Mario World map:
// walk between level dots along open paths, press Enter (or tap the dot
// you're standing on) to go into a level.

import { LEVELS, PATHS, MAP_W, MAP_H } from '../data/world.js';
import { state, pathKey } from '../state.js';
import { COLORS, heading, text, makeButton } from '../theme.js';
import { audio } from '../audio.js';

const WALK_SPEED = 280;     // map px per second
const DOT_SPACING = 18;     // px between paw prints on a path
const PAW_SIZE = 16;        // px across one paw print

// Points along a gently bent path from one level dot to another.
function pathPoints(p) {
  const a = LEVELS[p.from];
  const b = LEVELS[p.to];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const cx = mx + (-dy / len) * p.bend;
  const cy = my + (dx / len) * p.bend;
  const steps = Math.max(8, Math.round(len / 4));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
    });
  }
  return pts;
}

function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

// Evenly spaced dots along a point list.
function dotsAlong(pts) {
  const out = [];
  let carry = DOT_SPACING / 2;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += DOT_SPACING;
    }
    carry = d - seg;
  }
  // Keep the ends clear of the level dots themselves.
  return out.filter((_, i) => i > 0 && i < out.length - 1);
}

// Paw prints along a path: each one turned to face the way the path runs,
// stepping a little left and right like real tracks.
function pawsAlong(pts) {
  const dots = dotsAlong(pts);
  return dots.map((d, i) => {
    const a = dots[Math.max(0, i - 1)];
    const b = dots[Math.min(dots.length - 1, i + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const side = i % 2 ? 3.5 : -3.5;
    return {
      x: d.x - Math.sin(ang) * side,
      y: d.y + Math.cos(ang) * side,
      rot: ang + Math.PI / 2, // the print's toes point up in its texture
    };
  });
}

// A black paw silhouette with the Z cut out of the pad, so the map shows
// through it. Drawn once into a texture at 4x and shrunk on the map.
function makePawTexture(scene) {
  if (scene.textures.exists('paw-sil')) return;
  const S = 64;
  const tex = scene.textures.createCanvas('paw-sil', S, S);
  const ctx = tex.getContext();
  ctx.fillStyle = '#1c130c';
  ctx.beginPath();
  ctx.ellipse(32, 41, 17, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  [[11, 24, 6.5, 8], [23, 12, 7, 9], [41, 12, 7, 9], [53, 24, 6.5, 8]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 5.5;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(23, 32);
  ctx.lineTo(41, 32);
  ctx.lineTo(23, 50);
  ctx.lineTo(41, 50);
  ctx.stroke();
  tex.refresh();
}

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('Overworld');
  }

  create() {
    this.walking = false;
    this.at = state.data.at;
    // Paths opened by the level just played: their new dots pop in with an
    // animation. A path's paw prints only appear as she first walks it.
    const fresh = state.takeNewPaths();
    this.pending = new Set(fresh.map(pathKey));

    this.add.image(0, 0, 'map').setOrigin(0);

    makePawTexture(this);
    this.pathLayer = this.add.container(0, 0);
    this.nodeLayer = this.add.container(0, 0);
    this.drawOpenPaths();
    this.buildNodes();
    this.buildPlayer();
    this.buildPanel();
    this.buildHud();
    this.bindInput();

    this.cameras.main.fadeIn(300, 43, 29, 18);
    this.updatePanel();

    if (fresh.length) {
      this.time.delayedCall(450, () => this.revealPaths(fresh));
    }
  }

  // ---------- paths ----------

  // Open paths she can use (their new dot has popped in).
  usablePaths() {
    return state.openPaths().filter((p) => {
      const k = pathKey(p);
      return state.data.revealed.includes(k) && !this.pending.has(k);
    });
  }

  // Paths that show their paw prints: walked at least once.
  shownPaths() {
    return this.usablePaths().filter((p) => state.hasWalked(p));
  }

  drawOpenPaths() {
    this.pathLayer.removeAll(true);
    const drawn = new Set();
    this.shownPaths().forEach((p) => {
      // A path listed both ways is drawn once.
      if (drawn.has(`${p.to}>${p.from}`)) return;
      drawn.add(pathKey(p));
      pawsAlong(pathPoints(p)).forEach((d) => this.pathLayer.add(this.pawPrint(d, p)));
    });
  }

  pawPrint(d, p) {
    const img = this.add.image(d.x, d.y, 'paw-sil').setRotation(d.rot);
    img.setDisplaySize(PAW_SIZE, PAW_SIZE);
    if (p.exit === 'secret') img.setTint(0x8a1f1f);
    return img;
  }

  // New dots pop in one after another; no trail yet.
  revealPaths(paths) {
    this.walking = true; // hold input while the dots appear
    let delay = 0;
    paths.forEach((p) => {
      this.time.delayedCall(delay, () => {
        this.pending.delete(pathKey(p));
        this.refreshNodes();
        this.popNode(p.to);
      });
      delay += 350;
    });
    this.time.delayedCall(delay + 100, () => {
      this.walking = false;
      this.updatePanel();
    });
  }

  // Leave a paw print on the map as she walks a path for the first time.
  stampPaw(d, p) {
    const paw = this.pawPrint(d, p);
    this.pathLayer.add(paw);
    const full = paw.scaleX;
    paw.setScale(0);
    this.tweens.add({ targets: paw, scale: full, duration: 160, ease: 'Back.Out' });
  }

  // ---------- level dots ----------

  buildNodes() {
    this.nodes = {};
    Object.entries(LEVELS).forEach(([id, lvl]) => {
      const c = this.add.container(lvl.x, lvl.y);
      c.g = this.add.graphics();
      c.add(c.g);
      if (lvl.n) c.add(this.add.text(0, 0, String(lvl.n), heading(16)).setOrigin(0.5, 0.55));
      c.setSize(40, 40);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.onNodeTapped(id));
      this.nodeLayer.add(c);
      this.nodes[id] = c;
    });
    this.refreshNodes();
  }

  refreshNodes() {
    Object.entries(this.nodes).forEach(([id, c]) => {
      const lvl = LEVELS[id];
      const open = state.isNodeOpen(id) && this.isRevealed(id);
      c.setVisible(open);
      if (!open) return;
      const g = c.g;
      g.clear();

      const big = lvl.kind === 'final';
      const r = big ? 21 : 12;
      let fill = COLORS.yellow;
      if (lvl.hasSecret && !state.foundSecret(id)) fill = COLORS.red;
      if (lvl.kind === 'final') fill = COLORS.red;
      if (state.isCleared(id) && !(lvl.hasSecret && !state.foundSecret(id))) fill = COLORS.green;

      // dot
      g.fillStyle(COLORS.ink, 1);
      g.fillCircle(0, 3, r + 3);
      g.fillStyle(fill, 1);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, COLORS.ink, 1);
      g.strokeCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.45);
      g.fillCircle(-r * 0.35, -r * 0.35, r * 0.3);

      // treasure pips: one diamond per quiz item
      const n = lvl.items.length;
      lvl.items.forEach((it, i) => {
        const px = (i - (n - 1) / 2) * 9;
        const py = r + 10;
        const have = state.hasTreasure(id, it.id);
        g.fillStyle(COLORS.ink, 1);
        g.fillPoints(diamond(px, py, 5), true);
        g.fillStyle(have ? 0xffc93c : COLORS.parchment, 1);
        g.fillPoints(diamond(px, py, 3), true);
      });

      // check mark when every quiz treasure in the level is collected
      if (state.isChecked(id)) {
        const bx = r + 3;
        const by = -r - 1;
        g.fillStyle(COLORS.ink, 1);
        g.fillCircle(bx, by + 1.5, 9);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(bx, by, 8.5);
        g.lineStyle(3, COLORS.green, 1);
        g.beginPath();
        g.moveTo(bx - 4, by);
        g.lineTo(bx - 1, by + 3.5);
        g.lineTo(bx + 5, by - 3.5);
        g.strokePath();
      }
    });
  }

  // A node only shows once the path leading to it has been drawn.
  isRevealed(id) {
    if (!PATHS.some((p) => p.to === id)) return true;
    return this.usablePaths().some((p) => p.to === id);
  }

  popNode(id) {
    const c = this.nodes[id];
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 380, ease: 'Back.Out' });
  }

  // ---------- player token ----------

  buildPlayer() {
    const lvl = LEVELS[this.at];
    const p = this.add.container(lvl.x, lvl.y);
    const shadow = this.add.ellipse(0, 4, 30, 10, COLORS.ink, 0.35);
    const body = this.add.container(0, 0);
    const g = this.add.graphics();
    // Placeholder explorer: head, hat brim, hat crown, band.
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(0, -26, 14);
    g.fillStyle(0xf2c9a0, 1);
    g.fillCircle(0, -26, 11.5);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(-4, -25, 2);
    g.fillCircle(4, -25, 2);
    g.fillEllipse(0, -36, 36, 12);
    g.fillStyle(0xd9a441, 1);
    g.fillEllipse(0, -37, 32, 8);
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(-11, -52, 22, 16, 7);
    g.fillStyle(0xd9a441, 1);
    g.fillRoundedRect(-9, -50, 18, 13, 6);
    g.fillStyle(0x8a4b25, 1);
    g.fillRect(-9, -41, 18, 4);
    body.add(g);
    p.add([shadow, body]);
    this.player = p;
    this.playerBody = body;
    this.bob = this.tweens.add({
      targets: body, y: -5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  // ---------- info panel ----------

  buildPanel() {
    const w = 400;
    const h = 150;
    // Bottom centre is open sea on the map, so the panel covers no level.
    const x = (MAP_W - w) / 2 + 40;
    const y = MAP_H - h - 18;
    const panel = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(0, 6, w, h, 18);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(0, 0, w, h, 18);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(0, 0, w, h, 18);
    this.panelTitle = this.add.text(20, 14, '', heading(26));
    this.panelStatus = this.add.text(20, 56, '', text(17));
    this.panelHint = this.add.text(20, 90, '', text(15, '#6b4a2e'));
    this.playBtn = makeButton(this, w - 70, h - 36, 'Play', () => this.enterLevel(), {
      width: 110, height: 48, size: 22,
    });
    panel.add([g, this.panelTitle, this.panelStatus, this.panelHint, this.playBtn]);
    this.panel = panel;
  }

  updatePanel() {
    const id = this.at;
    const lvl = LEVELS[id];
    const have = state.treasureFor(id).length;
    this.panelTitle.setText(lvl.name);

    let status = `${lvl.title ? `${lvl.title}  ·  ` : ''}Treasure ${have}/${lvl.items.length}`;
    if (state.isChecked(id)) status += '   ✓ Complete!';
    else if (state.isCleared(id)) status += '   Cleared';
    this.panelStatus.setText(status);

    let hint = 'Arrow keys to walk  ·  Enter to play';
    if (lvl.hasSecret && !state.foundSecret(id)) hint = 'Red dot: a bonus exit hides here!';
    if (lvl.kind === 'final') hint = 'The Z-Stone waits inside the volcano.';
    this.panelHint.setText(hint);
  }

  // ---------- HUD ----------

  buildHud() {
    const t = state.totals();
    const w = 330;
    const x = MAP_W - w - 22;
    const y = 22;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(x, y + 5, w, 52, 16);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x, y, w, 52, 16);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, 52, 16);
    this.add.text(x + 18, y + 26, `✓ ${t.checks}/${t.levels}`, text(22, COLORS.greenCss)).setOrigin(0, 0.5);
    this.add.text(x + 110, y + 26, `Treasure ${t.items}/${t.maxItems}`, text(22)).setOrigin(0, 0.5);
    // No music on the map for now; a level's music fades out on the way back.
    audio.stopMusic();

    // Reset needs two taps so a stray click can't wipe progress.
    const reset = this.add.text(MAP_W - 26, y + 70, 'Reset progress', text(14, COLORS.parchmentCss, {
      backgroundColor: 'rgba(43,29,18,0.75)',
      padding: { x: 8, y: 4 },
    })).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    let armed = false;
    reset.on('pointerup', () => {
      if (!armed) {
        armed = true;
        reset.setText('Tap again to reset');
        this.time.delayedCall(2500, () => { armed = false; reset.setText('Reset progress'); });
        return;
      }
      state.reset();
      this.scene.restart();
    });
  }

  // ---------- input & movement ----------

  bindInput() {
    const kb = this.input.keyboard;
    const dirs = {
      LEFT: [-1, 0], A: [-1, 0],
      RIGHT: [1, 0], D: [1, 0],
      UP: [0, -1], W: [0, -1],
      DOWN: [0, 1], S: [0, 1],
    };
    Object.entries(dirs).forEach(([key, v]) => {
      kb.on(`keydown-${key}`, () => this.tryStep(v[0], v[1]));
    });
    kb.on('keydown-ENTER', () => this.enterLevel());
    kb.on('keydown-SPACE', () => this.enterLevel());
  }

  // Open neighbours of a node, with the point list oriented away from it.
  neighbours(id) {
    const out = [];
    this.usablePaths()
      .forEach((p) => {
        if (p.from === id) out.push({ to: p.to, p, pts: pathPoints(p) });
        if (p.to === id) out.push({ to: p.from, p, pts: pathPoints(p).reverse() });
      });
    return out;
  }

  // Keyboard: pick the open path whose first stretch best matches the direction.
  tryStep(dx, dy) {
    if (this.walking) return;
    let best = null;
    let bestScore = 0.35;
    this.neighbours(this.at).forEach((n) => {
      const a = n.pts[0];
      const b = n.pts[Math.min(n.pts.length - 1, 12)];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const len = Math.hypot(vx, vy) || 1;
      const score = (vx * dx + vy * dy) / len;
      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    });
    if (best) this.walkRoute([best]);
  }

  // Tap/click: walk the shortest open route to that dot, or play if already there.
  onNodeTapped(id) {
    if (this.walking) return;
    if (id === this.at) {
      this.enterLevel();
      return;
    }
    const route = this.findRoute(this.at, id);
    if (route) this.walkRoute(route);
  }

  findRoute(from, to) {
    const prev = { [from]: null };
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === to) break;
      this.neighbours(cur).forEach((n) => {
        if (!(n.to in prev)) {
          prev[n.to] = { from: cur, step: n };
          queue.push(n.to);
        }
      });
    }
    if (!(to in prev)) return null;
    const steps = [];
    for (let cur = to; prev[cur]; cur = prev[cur].from) steps.unshift(prev[cur].step);
    return steps;
  }

  walkRoute(steps) {
    if (!steps.length) return;
    this.walking = true;
    const [step, ...rest] = steps;
    const pts = step.pts;
    const total = pathLength(pts);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    // First time along this path: paw prints appear behind her as she goes.
    const paws = state.hasWalked(step.p) ? [] : pawsAlong(pts);
    let stamped = 0;
    const stampUpTo = (d) => {
      while (stamped < paws.length && DOT_SPACING * (stamped + 1.5) <= d) {
        this.stampPaw(paws[stamped], step.p);
        stamped++;
      }
    };
    const prog = { d: 0 };
    this.tweens.add({
      targets: prog,
      d: total,
      duration: (total / WALK_SPEED) * 1000,
      ease: 'Linear',
      onUpdate: () => {
        let i = 1;
        while (i < cum.length - 1 && cum[i] < prog.d) i++;
        const seg = cum[i] - cum[i - 1] || 1;
        const t = Math.min(1, Math.max(0, (prog.d - cum[i - 1]) / seg));
        const a = pts[i - 1];
        const b = pts[i];
        this.player.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        if (Math.abs(b.x - a.x) > 0.5) this.playerBody.scaleX = b.x < a.x ? -1 : 1;
        stampUpTo(prog.d);
      },
      onComplete: () => {
        stampUpTo(Infinity);
        state.markWalked(step.p);
        this.at = step.to;
        state.data.at = step.to;
        state.save();
        this.updatePanel();
        if (rest.length) {
          this.walkRoute(rest);
        } else {
          this.walking = false;
          this.tweens.add({ targets: this.nodes[this.at], scale: 1.15, duration: 120, yoyo: true });
        }
      },
    });
  }

  enterLevel() {
    if (this.walking) return;
    this.walking = true;
    const lvl = LEVELS[this.at];
    const label = this.add.text(MAP_W / 2, MAP_H / 2, lvl.name, heading(64, COLORS.yellowCss, {
      stroke: COLORS.inkCss,
      strokeThickness: 12,
    })).setOrigin(0.5).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: label, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.time.delayedCall(650, () => {
      this.cameras.main.fadeOut(300, 43, 29, 18);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Level', { levelId: this.at });
      });
    });
  }
}

function diamond(x, y, r) {
  return [
    { x, y: y - r },
    { x: x + r, y },
    { x, y: y + r },
    { x: x - r, y },
  ];
}
