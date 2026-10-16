// The Zebonkia overworld, played like the Super Mario World map:
// walk between level dots along open paths, press Enter (or tap the dot
// you're standing on) to go into a level.

import { LEVELS, PATHS, MAP_W, MAP_H } from '../data/world.js';
import { state, pathKey } from '../state.js';
import { COLORS, heading, text, makeButton } from '../theme.js';

const WALK_SPEED = 280;     // map px per second
const DOT_SPACING = 16;     // px between path dots

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

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('Overworld');
  }

  create() {
    this.walking = false;
    this.at = state.data.at;
    // Paths opened by the level just played: drawn in with an animation
    // rather than shown straight away.
    const fresh = state.takeNewPaths();
    this.pending = new Set(fresh.map(pathKey));

    this.add.image(0, 0, 'map').setOrigin(0);

    this.pathLayer = this.add.graphics();
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

  shownPaths() {
    return state.openPaths().filter((p) => {
      const k = pathKey(p);
      return state.data.revealed.includes(k) && !this.pending.has(k);
    });
  }

  drawOpenPaths() {
    this.pathLayer.clear();
    this.shownPaths().forEach((p) => this.drawPathDots(this.pathLayer, p));
  }

  drawPathDots(g, p) {
    const secret = p.exit === 'secret';
    dotsAlong(pathPoints(p)).forEach((d) => {
      g.fillStyle(COLORS.ink, 1);
      g.fillCircle(d.x, d.y + 1, 5);
      g.fillStyle(secret ? COLORS.red : COLORS.yellow, 1);
      g.fillCircle(d.x, d.y, 4);
    });
  }

  revealPaths(paths) {
    this.walking = true; // hold input while the path draws
    let delay = 0;
    const temp = [];
    paths.forEach((p) => {
      const dots = dotsAlong(pathPoints(p));
      const secret = p.exit === 'secret';
      dots.forEach((d, i) => {
        this.time.delayedCall(delay + i * 45, () => {
          const dot = this.add.circle(d.x, d.y, 4, secret ? COLORS.red : COLORS.yellow)
            .setStrokeStyle(2, COLORS.ink);
          temp.push(dot);
          dot.setScale(0);
          this.tweens.add({ targets: dot, scale: 1, duration: 160, ease: 'Back.Out' });
        });
      });
      delay += dots.length * 45;
      this.time.delayedCall(delay, () => {
        this.pending.delete(pathKey(p));
        this.refreshNodes();
        this.popNode(p.to);
      });
      delay += 250;
    });
    this.time.delayedCall(delay + 200, () => {
      this.walking = false;
      this.drawOpenPaths();
      temp.forEach((d) => d.destroy());
      this.updatePanel();
    });
  }

  // ---------- level dots ----------

  buildNodes() {
    this.nodes = {};
    Object.entries(LEVELS).forEach(([id, lvl]) => {
      const c = this.add.container(lvl.x, lvl.y);
      c.g = this.add.graphics();
      c.add(c.g);
      c.setSize(56, 56);
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
      const r = big ? 21 : 15;
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
        const px = (i - (n - 1) / 2) * 15;
        const py = r + 14;
        const have = state.hasTreasure(id, it.id);
        g.fillStyle(COLORS.ink, 1);
        g.fillPoints(diamond(px, py, 7), true);
        g.fillStyle(have ? 0xffc93c : COLORS.parchment, 1);
        g.fillPoints(diamond(px, py, 4.5), true);
      });

      // check mark when every quiz treasure in the level is collected
      if (state.isChecked(id)) {
        const bx = r + 4;
        const by = -r - 2;
        g.fillStyle(COLORS.ink, 1);
        g.fillCircle(bx, by + 2, 13);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(bx, by, 12);
        g.lineStyle(4, COLORS.green, 1);
        g.beginPath();
        g.moveTo(bx - 6, by);
        g.lineTo(bx - 1.5, by + 5);
        g.lineTo(bx + 7, by - 5);
        g.strokePath();
      }
    });
  }

  // A node only shows once the path leading to it has been drawn.
  isRevealed(id) {
    if (!PATHS.some((p) => p.to === id)) return true;
    return this.shownPaths().some((p) => p.to === id);
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
    this.panelGuide = this.add.text(20, 52, '', text(17, '#6b4a2e'));
    this.panelStatus = this.add.text(20, 80, '', text(17));
    this.panelHint = this.add.text(20, 112, '', text(15, '#6b4a2e'));
    this.playBtn = makeButton(this, w - 70, h - 36, 'Play', () => this.enterLevel(), {
      width: 110, height: 48, size: 22,
    });
    panel.add([g, this.panelTitle, this.panelGuide, this.panelStatus, this.panelHint, this.playBtn]);
    this.panel = panel;
  }

  updatePanel() {
    const id = this.at;
    const lvl = LEVELS[id];
    const have = state.treasureFor(id).length;
    this.panelTitle.setText(lvl.name);
    this.panelGuide.setText(`Guide: ${lvl.guide}`);

    let status = `Treasure ${have}/${lvl.items.length}`;
    if (state.isChecked(id)) status += '   ✓ Complete!';
    else if (state.isCleared(id)) status += '   Cleared';
    this.panelStatus.setText(status);

    let hint = 'Arrow keys to walk  ·  Enter to play';
    if (lvl.hasSecret && !state.foundSecret(id)) hint = 'Red dot: a secret exit hides here!';
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
    this.shownPaths()
      .forEach((p) => {
        if (p.from === id) out.push({ to: p.to, pts: pathPoints(p) });
        if (p.to === id) out.push({ to: p.from, pts: pathPoints(p).reverse() });
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
      },
      onComplete: () => {
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
