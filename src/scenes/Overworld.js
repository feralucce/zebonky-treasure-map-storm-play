// The Zebonkia overworld, played like the Super Mario World map.
// The whole map shows the biomes: tap an open one and the map zooms into
// its close-up, with its five level dots. There she walks between dots
// along open paths; Enter (or tapping the dot she's on) plays a level.
// After a level she stays in the biome, until it's finished: then the map
// zooms back out, and the biome's Zebonky joins her if every question in it
// was answered (or a note says that's what earns it). A biome finished
// before has an extra dot that leads back out to the whole map.

import { LEVELS, PATHS, MAP_W, MAP_H, BIOMES, PLAY_BIOMES, biomeLevels } from '../data/world.js?v=f6eb36b';
import { state, pathKey } from '../state.js?v=f6eb36b';
import { COLORS, heading, text, makeButton } from '../theme.js?v=f6eb36b';
import { audio, fullscreenButton } from '../audio.js?v=f6eb36b';
import { BUILD } from '../version.js?v=f6eb36b';
import { starsFor, rewardTotals } from '../rewards.js?v=f6eb36b';
import { currency, currencyIcon } from '../currency.js?v=f6eb36b';
import { showCompanionCard } from '../companionCard.js?v=f6eb36b';
import { showDifficultyMenu } from '../difficultyMenu.js?v=f6eb36b';

const WALK_SPEED = 280;     // map px per second
const DOT_SPACING = 18;     // px between paw prints on a path
const PAW_SIZE = 16;        // px across one paw print
const ZOOM_MS = 900;        // the zoom into and out of a biome

// Zoomed into a biome, the map is drawn K times bigger; dots, prints and
// the explorer are drawn 1/K the size so they stay the same on screen.
let K = 1;

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
  const spacing = DOT_SPACING / K;
  let carry = spacing / 2;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += spacing;
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
    const side = (i % 2 ? 3.5 : -3.5) / K;
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
    K = 1;
    this.walking = false;
    this.view = null;           // the biome zoomed into, or null for the whole map
    this.at = state.data.at;
    // Paths opened by the level just played: their new dots pop in with an
    // animation. A path's paw prints only appear as she first walks it.
    const fresh = state.takeNewPaths();
    this.pending = new Set(fresh.map(pathKey));

    // Everything on the map lives in one container, so zooming into a
    // biome is one scale and move. The panels and buttons stay outside it.
    this.world = this.add.container(0, 0);
    this.world.add(this.add.image(0, 0, 'map').setOrigin(0));
    this.closeupRects = this.cache.json.get('closeups') || {};
    this.closeups = {};
    Object.entries(this.closeupRects).forEach(([b, r]) => {
      const im = this.add.image(r.x, r.y, `closeup-${b}`).setOrigin(0).setDisplaySize(r.w, r.h).setAlpha(0);
      this.world.add(im);
      this.closeups[b] = im;
    });

    makePawTexture(this);
    this.pathLayer = this.add.container(0, 0);
    this.nodeLayer = this.add.container(0, 0);
    this.badgeLayer = this.add.container(0, 0);
    this.world.add([this.pathLayer, this.nodeLayer, this.badgeLayer]);
    this.buildNodes();
    this.buildBadges();
    this.buildPlayer();
    this.world.add(this.player);
    this.buildPanel();
    this.buildHud();
    this.buildDifficulty();
    if (state.inspectAll) {
      this.add.text(MAP_W / 2, 18, 'Inspection mode: every level open, nothing saved', text(17, '#ffffff', {
        backgroundColor: 'rgba(255,59,107,0.85)', padding: { x: 12, y: 6 },
      })).setOrigin(0.5, 0).setDepth(30);
    }
    this.bindInput();
    // Back from the character selector: show whoever was chosen.
    const redraw = () => this.drawPlayerFigure();
    this.events.on('resume', redraw);
    this.events.once('shutdown', () => this.events.off('resume', redraw));

    this.cameras.main.fadeIn(300, 43, 29, 18);

    // Back from a level in a biome: stay in it, unless it's just been
    // finished (or its last question answered): then zoom out and say so.
    const b = state.data.view;
    const event = b ? state.biomeEvent(b) : null;
    // A companion that joined in the level (its last question answered
    // there) has had its card already: the map just zooms out.
    const joined = b && state.data.joinedIn === b;
    if (joined) state.data.joinedIn = null;
    if (b) this.showBiome(b);
    else this.showWorld();
    this.fresh = fresh;
    if (event || joined) {
      this.walking = true;
      this.time.delayedCall(700, () => this.zoomOut(event ? () => this.celebrate(b, event) : () => {
        this.walking = false;
        if (this.fresh.length) this.revealPaths(this.fresh);
        this.fresh = [];
      }));
    } else if (fresh.length) {
      this.time.delayedCall(450, () => this.revealPaths(fresh));
    } else {
      this.pulseNext();
    }

    // Opened from a save link: ask before replacing this device's progress.
    if (state.pendingLoad) {
      const res = state.pendingLoad;
      state.pendingLoad = null;
      this.time.delayedCall(350, () => this.openSaveMenu(res.ok
        ? { mode: 'confirm', loadData: res.data }
        : { mode: 'note', note: res.reason || "That save link doesn't work." }));
    }
  }

  // ---------- whole map and biome close-ups ----------

  // A biome is open once any of its level dots is.
  biomeOpen(b) {
    return biomeLevels(b).some((id) => state.isNodeOpen(id) && this.isRevealed(id));
  }

  // The level to play next in a biome: its first open dot not yet played,
  // else where she stands (if in it), else its first level.
  nextLevel(b) {
    const ids = biomeLevels(b);
    const next = ids.find((id) => state.isNodeOpen(id) && this.isRevealed(id) && !state.isCleared(id));
    if (next) return next;
    return LEVELS[this.at] && LEVELS[this.at].biome === b ? this.at : ids[0];
  }

  // The whole map: biome badges, no level dots.
  showWorld() {
    K = 1;
    this.view = null;
    state.setView(null);
    this.world.setScale(1).setPosition(0, 0);
    Object.values(this.closeups).forEach((im) => im.setAlpha(0));
    this.pathLayer.setVisible(false);
    this.nodeLayer.setVisible(false);
    this.player.setVisible(false);
    this.badgeLayer.setVisible(true);
    this.refreshBadges();
    this.updatePanel();
  }

  // Zoomed into biome b: its close-up, its dots and trails, the explorer.
  showBiome(b) {
    const r = this.closeupRects[b];
    if (!r) {
      this.showWorld();
      return;
    }
    K = MAP_W / r.w;
    this.view = b;
    state.setView(b);
    this.world.setScale(K).setPosition(-r.x * K, -r.y * K);
    Object.entries(this.closeups).forEach(([k, im]) => im.setAlpha(k === b ? 1 : 0));
    this.badgeLayer.setVisible(false);
    this.pathLayer.setVisible(true);
    this.nodeLayer.setVisible(true);
    if (!LEVELS[this.at] || LEVELS[this.at].biome !== b) {
      this.at = this.nextLevel(b);
      state.data.at = this.at;
      state.save();
    }
    const lvl = LEVELS[this.at];
    this.player.setPosition(lvl.x, lvl.y).setScale(1 / K).setVisible(true);
    this.drawOpenPaths();
    this.refreshNodes();
    this.updatePanel();
  }

  // The camera glides from the whole map into the biome's close-up.
  zoomIn(b) {
    const r = this.closeupRects[b];
    if (!r || this.walking) return;
    this.walking = true;
    audio.sfx(this, 'step');
    if (this.badgePulse) this.badgePulse.stop();
    this.badgeLayer.setVisible(false);
    const k = MAP_W / r.w;
    this.tweens.add({ targets: this.closeups[b], alpha: 1, duration: ZOOM_MS * 0.8, delay: ZOOM_MS * 0.2 });
    this.tweens.add({
      targets: this.world,
      scale: k,
      x: -r.x * k,
      y: -r.y * k,
      duration: ZOOM_MS,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.showBiome(b);
        this.walking = false;
        this.pulseNext();
      },
    });
  }

  // Back out to the whole map; then onDone (a splash, say).
  zoomOut(onDone) {
    const b = this.view;
    this.walking = true;
    if (this.pulse) this.pulse.stop();
    this.pathLayer.setVisible(false);
    this.nodeLayer.setVisible(false);
    this.player.setVisible(false);
    if (b) this.tweens.add({ targets: this.closeups[b], alpha: 0, duration: ZOOM_MS * 0.8 });
    this.tweens.add({
      targets: this.world,
      scale: 1,
      x: 0,
      y: 0,
      duration: ZOOM_MS,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.showWorld();
        this.walking = false;
        if (onDone) {
          this.walking = true;
          onDone();
        }
      },
    });
  }

  // The next level to play gently pulses.
  pulseNext() {
    if (this.pulse) this.pulse.stop();
    this.pulse = null;
    if (!this.view) return;
    const id = biomeLevels(this.view).find((l) => state.isNodeOpen(l) && this.isRevealed(l) && !state.isCleared(l));
    const c = id && this.nodes[id];
    if (!c) return;
    c.setScale(1 / K);
    this.pulse = this.tweens.add({ targets: c, scale: 1.3 / K, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  // One badge per playable biome on the whole map: open ones can be
  // tapped; the one she's working through pulses; finished ones get a tick.
  buildBadges() {
    this.badges = {};
    PLAY_BIOMES.forEach((b) => {
      const ids = biomeLevels(b);
      // Centred among its level dots, in its part of the map.
      const x = ids.reduce((t, id) => t + LEVELS[id].x, 0) / ids.length;
      const y = ids.reduce((t, id) => t + LEVELS[id].y, 0) / ids.length;
      const c = this.add.container(x, y);
      // A soft glow behind a badge that can be gone into (the user,
      // 2026-10-25: "the circles aren't glowing").
      c.halo = this.add.circle(0, 0, 40, 0xffe680, 0.6).setBlendMode(Phaser.BlendModes.ADD);
      c.g = this.add.graphics();
      c.add([c.halo, c.g]);
      c.setSize(64, 64);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.onBadgeTapped(b));
      c.color = BIOMES[b].color;
      this.badgeLayer.add(c);
      this.badges[b] = c;
    });
    this.tweens.add({
      targets: Object.values(this.badges).map((c) => c.halo),
      scale: { from: 0.85, to: 1.35 }, alpha: { from: 0.75, to: 0.15 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  refreshBadges() {
    if (this.badgePulse) this.badgePulse.stop();
    this.badgePulse = null;
    const here = LEVELS[this.at] ? LEVELS[this.at].biome : null;
    let current = null;
    Object.entries(this.badges).forEach(([b, c]) => {
      const open = this.biomeOpen(b);
      c.setVisible(open).setScale(1);
      if (!open) return;
      const done = state.biomeComplete(b);
      c.halo.setVisible(!done || b === this.currentBiome);
      const g = c.g;
      g.clear();
      g.fillStyle(COLORS.ink, 0.9);
      g.fillCircle(0, 4, 27);
      g.fillStyle(c.color, 1);
      g.fillCircle(0, 0, 25);
      g.lineStyle(4, COLORS.ink, 1);
      g.strokeCircle(0, 0, 25);
      g.lineStyle(3, 0xffffff, 0.8);
      g.strokeCircle(0, 0, 19);
      if (done) {
        g.lineStyle(6, 0xffffff, 1);
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(-3, 8);
        g.lineTo(11, -8);
        g.strokePath();
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(-6, -10, -6, 10, 11, 0);    // "go in"
        if (!current || b === here) current = b;
      }
    });
    if (current) {
      this.badgePulse = this.tweens.add({
        targets: this.badges[current], scale: 1.18, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    }
    this.currentBiome = current;
  }

  onBadgeTapped(b) {
    if (this.walking || this.view) return;
    this.zoomIn(b);
  }

  // After a finished biome, back on the whole map: the companion card
  // (companionCard.js). Closing it shows what the finish opened.
  celebrate(b, event) {
    showCompanionCard(this, b, event, () => {
      this.walking = false;
      this.refreshBadges();
      if (this.fresh.length) this.revealPaths(this.fresh);
      this.fresh = [];
    });
  }

  openSaveMenu(data = { mode: 'main' }) {
    if (this.walking) return;
    this.scene.pause();
    this.scene.launch('SaveMenu', data);
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
    this.shownPaths().filter((p) => this.inView(p.from) && this.inView(p.to)).forEach((p) => {
      // A path listed both ways is drawn once.
      if (drawn.has(`${p.to}>${p.from}`)) return;
      drawn.add(pathKey(p));
      pawsAlong(pathPoints(p)).forEach((d) => this.pathLayer.add(this.pawPrint(d, p)));
    });
  }

  pawPrint(d, p) {
    const img = this.add.image(d.x, d.y, 'paw-sil').setRotation(d.rot);
    img.setDisplaySize(PAW_SIZE / K, PAW_SIZE / K);
    if (p.exit === 'secret') img.setTint(0x8a1f1f);
    return img;
  }

  // New dots pop in one after another; no trail yet.
  revealPaths(paths) {
    this.walking = true; // hold input while the dots appear
    let delay = 0;
    paths.forEach((p) => {
      const here = this.inView(p.to);
      this.time.delayedCall(delay, () => {
        this.pending.delete(pathKey(p));
        this.refreshNodes();
        if (!this.view) this.refreshBadges();
        if (here) this.popNode(p.to);
      });
      if (here) delay += 350;
    });
    this.time.delayedCall(delay + 100, () => {
      this.walking = false;
      this.updatePanel();
      this.pulseNext();
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

  // Is this level in the biome on screen?
  inView(id) {
    return !!this.view && !!LEVELS[id] && LEVELS[id].biome === this.view;
  }

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
    // A biome finished before has one more dot: back out to the whole map.
    const exit = this.add.container(0, 0);
    exit.g = this.add.graphics();
    exit.add([exit.g, this.add.text(0, 2, 'Map', heading(14, '#ffffff')).setOrigin(0.5)]);
    exit.setSize(52, 52).setInteractive({ useHandCursor: true });
    exit.on('pointerup', () => this.leaveBiome());
    this.nodeLayer.add(exit);
    this.exitNode = exit;
  }

  leaveBiome() {
    if (this.walking || !this.view) return;
    this.zoomOut();
  }

  refreshNodes() {
    // The way back out: by the biome's first level, once the biome is done.
    const ex = this.exitNode;
    const done = this.view && state.data.biomeDone && state.data.biomeDone[this.view];
    ex.setVisible(!!done);
    if (done) {
      const first = LEVELS[biomeLevels(this.view)[0]];
      const r = this.closeupRects[this.view];
      const ox = first.x - r.x < r.w / 2 ? -1 : 1;
      ex.setPosition(first.x + ox * 46 / K, first.y - 40 / K).setScale(1 / K);
      const g = ex.g;
      g.clear();
      g.fillStyle(COLORS.ink, 1);
      g.fillCircle(0, 3, 25);
      g.fillStyle(0x6b4a2e, 1);
      g.fillCircle(0, 0, 22);
      g.lineStyle(3, COLORS.ink, 1);
      g.strokeCircle(0, 0, 22);
    }
    Object.entries(this.nodes).forEach(([id, c]) => {
      const lvl = LEVELS[id];
      const open = this.inView(id) && state.isNodeOpen(id) && this.isRevealed(id);
      c.setVisible(open);
      if (!open) return;
      c.setScale(1 / K);
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
    this.tweens.add({ targets: c, scale: 1 / K, duration: 380, ease: 'Back.Out' });
  }

  // ---------- player token ----------

  buildPlayer() {
    const lvl = LEVELS[this.at];
    const p = this.add.container(lvl.x, lvl.y);
    const shadow = this.add.ellipse(0, 4, 30, 10, COLORS.ink, 0.35);
    const body = this.add.container(0, 0);
    p.add([shadow, body]);
    this.player = p;
    this.playerBody = body;
    this.drawPlayerFigure();
    this.bob = this.tweens.add({
      targets: body, y: -5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  // The chosen explorer, standing on her dot (redrawn when the selector
  // changes her). Her idle strip plays small; feet on the dot.
  drawPlayerFigure() {
    const cid = state.character().id;
    if (!this.anims.exists(`${cid}-idle`)) {
      const ia = (this.cache.json.get(cid) || {}).anims;
      const rate = (ia && ia.idle && ia.idle.fps) || 3;
      this.anims.create({ key: `${cid}-idle`, frames: this.anims.generateFrameNumbers(`${cid}-idle`), frameRate: rate, repeat: -1 });
    }
    this.playerBody.removeAll(true);
    const fig = this.add.sprite(0, 6, `${cid}-idle`, 0).setOrigin(0.5, 1).setScale(0.62);
    fig.play(`${cid}-idle`);
    this.playerBody.add(fig);
    this.playerFig = fig;
  }

  openCharacterMenu() {
    if (this.walking) return;
    this.scene.pause();
    this.scene.launch('CharacterMenu');
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
    this.panelHint = this.add.text(20, 90, '', text(15, '#6b4a2e', { wordWrap: { width: w - 40 } }));
    // In a biome: how much of its question bank is answered on this
    // difficulty (the whole bank earns its companion).
    this.panelQs = this.add.text(20, 116, '', text(15, COLORS.inkCss, { fontStyle: 'bold' }));
    this.playBtn = makeButton(this, w - 70, h - 36, 'Play', () => this.enterLevel(), {
      width: 110, height: 48, size: 22,
    });
    // Back out to the whole map, any time (the user, 2026-10-25). Escape too.
    this.mapBtn = makeButton(this, w - 56, 32, 'Map', () => this.leaveBiome(), {
      width: 88, height: 40, size: 19, fill: 0x6b4a2e,
    });
    panel.add([g, this.panelTitle, this.panelStatus, this.panelHint, this.panelQs, this.playBtn, this.mapBtn]);
    this.panel = panel;
  }

  updatePanel() {
    this.playBtn.setVisible(!!this.view);
    this.mapBtn.setVisible(!!this.view);
    this.panelQs.setText('');
    if (!this.view) {
      this.panelTitle.setText('Zebonkia');
      this.panelStatus.setText('Tap a glowing circle to explore');
      const n = state.companions().length;
      this.panelHint.setText(n ? `Companions: ${n}` : 'Answer every question in an area to earn a companion');
      return;
    }
    const id = this.at;
    const lvl = LEVELS[id];
    const have = state.treasureFor(id).length;
    this.panelTitle.setText(lvl.name);

    let status = `${lvl.title ? `${lvl.title}  ·  ` : ''}Treasure ${have}/${lvl.items.length}`;
    if (state.isCleared(id)) status += '   Cleared';
    this.panelStatus.setText(status);

    // The level's three stars, filled in once won.
    let hint = 'Arrow keys to walk  ·  Enter to play';
    if (lvl.kind === 'level') {
      const s = starsFor(id);
      const star = (on) => (on ? '★' : '☆');
      hint = `${star(s.crates)} Crates   ${star(s.bonus)} Bonus   ${star(s.tamed)} Tamed`;
    }
    if (lvl.kind === 'final') hint = 'The Z-Stone waits inside the volcano.';
    this.panelHint.setText(hint);
    if (lvl.biome && lvl.kind === 'level') {
      const p = state.questionProgress(lvl.biome);
      const got = state.companions().includes(lvl.biome);
      this.panelQs.setText(`Questions ${p.done}/${p.total}${got ? '  ·  Companion earned' : ''}`);
    }
  }

  // ---------- HUD ----------

  buildHud() {
    const t = rewardTotals();
    // Stars only for now: points (rewards.js) are still counted, but off the
    // map until currency is decided (the user, 2026-10-25).
    const w = 150;
    const x = MAP_W - w - 22;
    const y = 22;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(x, y + 5, w, 52, 16);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x, y, w, 52, 16);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, 52, 16);
    this.add.text(x + w / 2, y + 26, `★ ${t.stars}/${t.maxStars}`, heading(22, '#b8860b')).setOrigin(0.5);
    // Currency (a placeholder name), beside the stars.
    const cw = 170;
    const cx0 = x - cw - 12;
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(cx0, y + 5, cw, 52, 16);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(cx0, y, cw, 52, 16);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(cx0, y, cw, 52, 16);
    this.add.image(cx0 + 30, y + 26, currencyIcon(this));
    this.add.text(cx0 + 52, y + 26, `${currency()}`, heading(22, COLORS.inkCss)).setOrigin(0, 0.5);
    // No music on the map for now; a level's music fades out on the way back.
    audio.stopMusic();

    // Reset needs two taps so a stray click can't wipe progress.
    const reset = this.add.text(MAP_W - 26, y + 70, 'Reset progress', text(14, COLORS.parchmentCss, {
      backgroundColor: 'rgba(43,29,18,0.75)',
      padding: { x: 8, y: 4 },
    })).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    // Save codes, save files and save links.
    const save = this.add.text(MAP_W - 26 - reset.width - 12, y + 70, 'Save', text(14, '#ffffff', {
      backgroundColor: COLORS.greenCss,
      padding: { x: 10, y: 4 },
    })).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    save.on('pointerup', () => this.openSaveMenu());
    // The character selector: who you play as (and, later, what they wear).
    const look = this.add.text(save.x - save.width - 12, y + 70, 'Explorer', text(14, '#ffffff', {
      backgroundColor: COLORS.greenCss,
      padding: { x: 10, y: 4 },
    })).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    look.on('pointerup', () => this.openCharacterMenu());
    fullscreenButton(this, MAP_W - 50, y + 130);
    // Which build this is (lesson UI-18), small in the bottom corner.
    this.add.text(8, MAP_H - 6, `build ${BUILD}`, text(12, 'rgba(255,248,232,0.55)')).setOrigin(0, 1).setDepth(30);
    // Inspection mode saves nothing, so no Save or Reset.
    if (state.inspectAll) { save.setVisible(false); reset.setVisible(false); look.setX(MAP_W - 26); }

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

  // ---------- difficulty ----------

  // A button in the upper left (the user, 2026-10-25) that opens the
  // Difficulty screen (difficultyMenu.js); the band chosen shows under it.
  buildDifficulty() {
    const btn = makeButton(this, 104, 46, 'Difficulty', () => this.openDifficulty(), {
      width: 170, height: 50, size: 20,
    });
    btn.setDepth(5);
    this.difficultyLabel = this.add.text(104, 84, state.difficulty().name, text(15, COLORS.parchmentCss, {
      backgroundColor: 'rgba(43,29,18,0.75)', padding: { x: 8, y: 3 },
    })).setOrigin(0.5, 0).setDepth(5);
  }

  openDifficulty() {
    if (this.walking) return;
    // The map's own keys (walking, Escape) wait while it's open.
    this.walking = true;
    showDifficultyMenu(this, () => {
      this.walking = false;
      this.difficultyLabel.setText(state.difficulty().name);
      this.updatePanel();
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
    const go = () => {
      if (this.walking) return;
      if (this.view) this.enterLevel();
      else if (this.currentBiome) this.onBadgeTapped(this.currentBiome);
    };
    kb.on('keydown-ENTER', go);
    kb.on('keydown-ESC', () => this.leaveBiome());
    kb.on('keydown-SPACE', go);
  }

  // Open neighbours of a node, with the point list oriented away from it.
  neighbours(id) {
    const out = [];
    this.usablePaths()
      .filter((p) => this.inView(p.from) && this.inView(p.to))
      .forEach((p) => {
        if (p.from === id) out.push({ to: p.to, p, pts: pathPoints(p) });
        if (p.to === id) out.push({ to: p.from, p, pts: pathPoints(p).reverse() });
      });
    return out;
  }

  // Keyboard: pick the open path whose first stretch best matches the direction.
  tryStep(dx, dy) {
    if (this.walking || !this.view) return;
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
      while (stamped < paws.length && (DOT_SPACING / K) * (stamped + 1.5) <= d) {
        this.stampPaw(paws[stamped], step.p);
        stamped++;
      }
    };
    const prog = { d: 0 };
    this.tweens.add({
      targets: prog,
      d: total,
      duration: (total * K / WALK_SPEED) * 1000,
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
          this.tweens.add({ targets: this.nodes[this.at], scale: 1.15 / K, duration: 120, yoyo: true });
        }
      },
    });
  }

  enterLevel() {
    if (this.walking || !this.view) return;
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
