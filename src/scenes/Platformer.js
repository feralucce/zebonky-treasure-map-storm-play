// Concept side-scroller. Every piece of art is a simple rounded-box SVG
// from assets/svg/. Uses the level contract in levelApi.js, so the map,
// quiz and save flow all work exactly as they will in the finished game.

import { LEVELS, MAP_W, MAP_H } from '../data/world.js';
import { TILE, layoutFor } from '../data/levels.js';
import { state } from '../state.js';
import { COLORS, heading, text } from '../theme.js';
import { startQuiz, finishLevel, leaveLevel } from '../levelApi.js';

const RUN_SPEED = 300;
const ACCEL = 2400;
const JUMP_SPEED = 790;       // about 2.5 tiles high
const COYOTE_MS = 100;        // can still jump just after running off a ledge
const JUMP_BUFFER_MS = 130;   // a jump pressed just before landing still counts

// Water: you float down slowly and each jump press is a swim stroke.
const SWIM_SPEED = 220;
const SWIM_SINK = 160;
const SWIM_STROKE = 430;
const SWIM_HOP_OUT = 780;     // a stroke near the surface pops you out onto land
// The Dorsal Cove waterfall flows uphill and carries you with it.
const CURRENT_LIFT = 660;

// Solid tile characters -> [texture on top of a stack, texture underneath].
const SOLID_TEXTURES = {
  '#': ['ground-top', 'ground'],
  s: ['sand-top', 'sand'],
  R: ['rock-top', 'rock'],
};

export class PlatformerScene extends Phaser.Scene {
  constructor() {
    super('Level');
  }

  init(data) {
    this.levelId = data.levelId;
    this.done = false;
    this.lastGrounded = 0;
    this.jumpPressedAt = -1000;
    this.touch = { left: false, right: false, jump: false };
    this.walkClock = 0;
  }

  create() {
    const lvl = LEVELS[this.levelId];
    const layout = layoutFor(this.levelId);
    const rows = layout.rows;
    const cols = Math.max(...rows.map((r) => r.length));
    const worldW = cols * TILE;
    const worldH = rows.length * TILE;
    this.worldH = worldH;

    this.physics.world.setBounds(0, 0, worldW, worldH + 400);
    // Earth below the bottom row, for screens taller than the level.
    this.add.rectangle(0, worldH, worldW, 200, 0x6b4a2e).setOrigin(0).setDepth(-1);
    this.physics.world.checkCollision.down = false; // pits are open
    this.cameras.main.setBounds(0, 0, worldW, Math.max(worldH, MAP_H));
    this.cameras.main.setBackgroundColor(lvl.color);

    this.buildBackdrop(worldW, worldH);

    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.treasures = this.physics.add.staticGroup();
    let start = { x: TILE * 2, y: worldH - TILE * 3 };
    const treasureSpots = [];
    const at = (r, c) => (rows[r] && rows[r][c]) || '.';

    // Water and current cells, looked up every frame by the player's position.
    this.water = new Set();
    this.current = new Set();
    this.surfaceRow = {};
    this.falls = [];
    const isWater = (r, c) => at(r, c) === '~' || (at(r, c) === 'T' && (at(r, c - 1) === '~' || at(r, c + 1) === '~'));

    rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        if (SOLID_TEXTURES[ch]) {
          // Picture only; collision comes from the merged boxes built below.
          const [topTex, fillTex] = SOLID_TEXTURES[ch];
          const top = !SOLID_TEXTURES[at(r - 1, c)];
          this.add.image(x, y, top ? topTex : fillTex);
        } else if (isWater(r, c)) {
          const surface = !isWater(r - 1, c);
          this.add.image(x, y, surface ? 'water-top' : 'water').setDepth(5).setAlpha(0.6);
          this.water.add(`${c},${r}`);
          if (surface) this.surfaceRow[c] = r;
          if (ch === 'T') treasureSpots.push({ x, y });
        } else if (ch === 'W') {
          const fall = this.add.tileSprite(x, y, TILE, TILE, 'waterfall').setDepth(5).setAlpha(0.5);
          fall.tilePositionX = (c % 2) * TILE;
          this.falls.push(fall);
          this.current.add(`${c},${r}`);
        } else if (ch === 'F') {
          this.add.image(x + 16, (r + 1) * TILE + 6, 'fin').setOrigin(0.5, 1);
        } else if (ch === '=') {
          const p = this.platforms.create(x, r * TILE + 14, 'platform');
          p.body.checkCollision.down = false;
          p.body.checkCollision.left = false;
          p.body.checkCollision.right = false;
        } else if (ch === 'T') {
          treasureSpots.push({ x, y });
        } else if (ch === 'G') {
          this.goal = this.physics.add.staticImage(x, (r + 1) * TILE - 96, 'goal');
          this.goal.body.setSize(40, 192);
        } else if (ch === 'S' && lvl.hasSecret) {
          this.secret = this.physics.add.staticImage(x, (r + 1) * TILE - 48, 'secret-door');
        } else if (ch === 'P') {
          start = { x, y };
        }
      });
    });
    this.buildSolidBoxes(rows);

    (layout.signs || []).forEach((s) => {
      const x = s.col * TILE + TILE / 2;
      const y = (s.row + 1) * TILE;
      this.add.image(x, y, 'sign').setOrigin(0.5, 1);
      this.add.text(x, y - 76, s.text, text(17, COLORS.inkCss, { align: 'center', lineSpacing: -2 })).setOrigin(0.5);
    });

    // Treasures are numbered left to right, so the first one met asks question 1.
    treasureSpots.sort((a, b) => a.x - b.x).forEach((t, i) => this.spawnTreasure(t.x, t.y, i));
    this.start = start;
    this.safe = { ...start };

    // Player: a rounded box with legs.
    this.player = this.physics.add.sprite(start.x, start.y, 'player-idle');
    this.player.body.setSize(38, 58).setOffset(5, 4);
    this.player.setMaxVelocity(RUN_SPEED, 1400);
    this.player.setDragX(ACCEL * 1.4);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.treasures, (_, t) => this.touchTreasure(t));
    if (this.goal) this.physics.add.overlap(this.player, this.goal, () => this.exit('normal'));
    if (this.secret) this.physics.add.overlap(this.player, this.secret, () => this.exit('secret'));

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 60);
    this.cameras.main.setDeadzone(120, 80);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,SPACE,Z,ESC');
    this.keys.ESC.on('down', () => this.leave());

    this.buildHud(lvl);
    this.buildTouchControls();

    // Held keys can get stuck while the quiz has the level paused.
    this.events.on('resume', () => {
      this.input.keyboard.resetKeys();
      this.touch = { left: false, right: false, jump: false };
    });

    this.cameras.main.fadeIn(300, 43, 29, 18);
  }

  // Solid tiles become as few, as large, invisible boxes as possible.
  // One box per tile leaves seams that snag the player when sliding up a
  // wall (riding the waterfall) or along a floor.
  buildSolidBoxes(rows) {
    const runsFor = (row) => {
      const runs = [];
      let startCol = -1;
      for (let c = 0; c <= row.length; c++) {
        const solid = c < row.length && !!SOLID_TEXTURES[row[c]];
        if (solid && startCol < 0) startCol = c;
        if (!solid && startCol >= 0) {
          runs.push(`${startCol}-${c - 1}`);
          startCol = -1;
        }
      }
      return runs;
    };
    let open = {}; // run key -> first row
    const addBox = (key, r0, r1) => {
      const [a, b] = key.split('-').map(Number);
      const w = (b - a + 1) * TILE;
      const h = (r1 - r0 + 1) * TILE;
      const zone = this.add.zone(a * TILE + w / 2, r0 * TILE + h / 2, w, h);
      this.physics.add.existing(zone, true);
      this.solids.add(zone);
    };
    rows.forEach((row, r) => {
      const runs = runsFor(row);
      const next = {};
      runs.forEach((k) => { next[k] = k in open ? open[k] : r; });
      Object.keys(open).forEach((k) => { if (!(k in next)) addBox(k, open[k], r - 1); });
      open = next;
    });
    Object.keys(open).forEach((k) => addBox(k, open[k], rows.length - 1));
  }

  buildBackdrop(worldW, worldH) {
    for (let x = -100; x < worldW; x += 420) {
      this.add.image(x, worldH - 60, 'bg-hill').setOrigin(0, 1).setScrollFactor(0.35, 1)
        .setScale(1 + ((x / 420) % 3) * 0.25);
    }
    for (let x = 80; x < worldW; x += 560) {
      this.add.image(x, 90 + ((x / 560) % 3) * 50, 'bg-cloud').setScrollFactor(0.15, 1);
    }
  }

  spawnTreasure(x, y, index) {
    const item = LEVELS[this.levelId].items[index];
    if (!item || state.hasTreasure(this.levelId, item.id)) return;
    const t = this.treasures.create(x, y, 'treasure');
    t.itemIndex = index;
    t.baseY = y;
    this.tweens.add({ targets: t, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  touchTreasure(t) {
    if (t.taken) return;
    t.taken = true;
    t.body.enable = false;
    this.player.setVelocity(0, Math.min(this.player.body.velocity.y, 0));
    startQuiz(this, this.levelId, t.itemIndex, (correct) => {
      this.tweens.killTweensOf(t);
      if (correct) {
        this.tweens.add({
          targets: t, y: t.y - 80, scale: 1.4, alpha: 0, duration: 450, ease: 'Cubic.Out',
          onComplete: () => t.destroy(),
        });
      } else {
        this.tweens.add({
          targets: t, alpha: 0, angle: 90, scale: 0.3, duration: 400,
          onComplete: () => t.destroy(),
        });
      }
      this.refreshHud();
    });
  }

  exit(kind) {
    if (this.done) return;
    this.done = true;
    this.player.body.enable = false;
    const msg = kind === 'secret' ? 'Secret exit found!' : 'Level clear!';
    this.add.text(MAP_W / 2, MAP_H / 2 - 40, msg, heading(64, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 12,
    })).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: this.player, y: this.player.y - 30, duration: 250, yoyo: true, repeat: 2 });
    this.time.delayedCall(1300, () => finishLevel(this, this.levelId, kind));
  }

  leave() {
    if (this.done) return;
    this.done = true;
    leaveLevel(this, this.levelId);
  }

  // Water droplets where the player hits the surface. A big drop is a cannonball.
  splash(x, surfaceY, speed) {
    if (speed < 150 || Number.isNaN(surfaceY)) return;
    const big = speed > 650;
    const n = big ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const drop = this.add.circle(x, surfaceY, Phaser.Math.Between(4, big ? 10 : 6), 0xffffff).setDepth(6);
      const angle = Phaser.Math.FloatBetween(-2.6, -0.5);
      const dist = Phaser.Math.Between(40, big ? 150 : 70);
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * dist,
        y: surfaceY + Math.sin(angle) * dist,
        alpha: 0,
        duration: Phaser.Math.Between(350, 650),
        ease: 'Cubic.Out',
        onComplete: () => drop.destroy(),
      });
    }
    if (big) {
      const t = this.add.text(x, surfaceY - 70, 'Cannonball!', heading(34, COLORS.yellowCss, {
        stroke: COLORS.inkCss, strokeThickness: 8,
      })).setOrigin(0.5).setDepth(7).setScale(0.5);
      this.tweens.add({ targets: t, scale: 1, y: t.y - 30, duration: 300, ease: 'Back.Out' });
      this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
      this.cameras.main.shake(160, 0.006);
    }
  }

  // ---------- HUD ----------

  buildHud(lvl) {
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(20, 25, 360, 64, 16);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(20, 20, 360, 64, 16);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(20, 20, 360, 64, 16);
    this.add.text(38, 52, lvl.name, heading(24)).setOrigin(0, 0.5).setScrollFactor(0);
    this.hudPips = this.add.graphics().setScrollFactor(0);
    this.refreshHud();

    const map = this.add.text(MAP_W - 24, 24, 'Map', text(20, COLORS.inkCss, {
      backgroundColor: COLORS.parchmentCss, padding: { x: 16, y: 8 },
    })).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    map.on('pointerup', () => this.leave());
  }

  refreshHud() {
    const g = this.hudPips;
    g.clear();
    LEVELS[this.levelId].items.forEach((it, i) => {
      const x = 300 + i * 26;
      const y = 52;
      const have = state.hasTreasure(this.levelId, it.id);
      g.fillStyle(COLORS.ink, 1);
      g.fillRoundedRect(x - 11, y - 11, 22, 22, 6);
      g.fillStyle(have ? 0xffc93c : 0xd8c49a, 1);
      g.fillRoundedRect(x - 8, y - 8, 16, 16, 4);
    });
  }

  // On-screen buttons for phones and tablets; they also work with a mouse.
  buildTouchControls() {
    const y = MAP_H - 80;
    const hold = (img, key) => {
      img.setScrollFactor(0).setAlpha(0.75).setInteractive();
      img.on('pointerdown', () => { this.touch[key] = true; img.setAlpha(1); if (key === 'jump') this.jumpPressedAt = this.time.now; });
      const up = () => { this.touch[key] = false; img.setAlpha(0.75); };
      img.on('pointerup', up);
      img.on('pointerout', up);
    };
    hold(this.add.image(80, y, 'btn-left'), 'left');
    hold(this.add.image(190, y, 'btn-right'), 'right');
    hold(this.add.image(MAP_W - 90, y - 8, 'btn-jump'), 'jump');
    this.input.addPointer(2);
  }

  // ---------- movement ----------

  update(time, delta) {
    if (this.done || !this.player.body.enable) return;
    const p = this.player;
    const k = this.keys;
    const onFloor = p.body.blocked.down || p.body.touching.down;

    const left = k.LEFT.isDown || k.A.isDown || this.touch.left;
    const right = k.RIGHT.isDown || k.D.isDown || this.touch.right;
    const jumpHeld = k.UP.isDown || k.W.isDown || k.SPACE.isDown || k.Z.isDown || this.touch.jump;
    const jumpPressed = [k.UP, k.W, k.SPACE, k.Z].some((key) => Phaser.Input.Keyboard.JustDown(key));

    if (left && !right) {
      p.setAccelerationX(-ACCEL);
      p.setFlipX(true);
    } else if (right && !left) {
      p.setAccelerationX(ACCEL);
      p.setFlipX(false);
    } else {
      p.setAccelerationX(0);
    }

    if (jumpPressed) this.jumpPressedAt = time;
    const wantsJump = time - this.jumpPressedAt <= JUMP_BUFFER_MS;

    const c = Math.floor(p.x / TILE);
    const r = Math.floor(p.y / TILE);
    const inCurrent = this.current.has(`${c},${r}`);
    const inWater = !inCurrent && this.water.has(`${c},${r}`);

    if (inCurrent) {
      // Riding the uphill waterfall.
      p.body.setGravityY(0);
      p.setVelocityY(Phaser.Math.Linear(p.body.velocity.y, -CURRENT_LIFT, 0.2));
      p.setMaxVelocity(RUN_SPEED, 1400);
      this.boostUntil = time + 450;
      this.wasInWater = false;
    } else if (inWater) {
      p.body.setGravityY(-this.physics.world.gravity.y * 0.8);
      p.setMaxVelocity(SWIM_SPEED, 1400);
      if (!this.wasInWater) this.splash(p.x, this.surfaceRow[c] * TILE, p.body.velocity.y);
      // Slow the plunge, then drift down gently.
      if (p.body.velocity.y > SWIM_SINK) p.setVelocityY(Math.max(SWIM_SINK, p.body.velocity.y * 0.88));
      if (wantsJump) {
        const nearSurface = this.surfaceRow[c] !== undefined && p.y - this.surfaceRow[c] * TILE < 44;
        p.setVelocityY(nearSurface ? -SWIM_HOP_OUT : -SWIM_STROKE);
        if (nearSurface) this.boostUntil = time + 400;
        this.jumpPressedAt = -1000;
      }
      this.wasInWater = true;
    } else {
      p.body.setGravityY(0);
      p.setMaxVelocity(RUN_SPEED, 1400);
      this.wasInWater = false;
    }

    if (onFloor) {
      this.lastGrounded = time;
      if (p.body.blocked.down && !inWater) this.safe = { x: p.x, y: p.y - 4 };
    }

    const canJump = !inWater && time - this.lastGrounded <= COYOTE_MS;
    if (canJump && wantsJump) {
      p.setVelocityY(-JUMP_SPEED);
      this.lastGrounded = -1000;
      this.jumpPressedAt = -1000;
    }
    // Let go early for a short hop (not while the current or a hop-out is lifting you).
    const boosted = time < (this.boostUntil || 0);
    if (!jumpHeld && !boosted && !inWater && p.body.velocity.y < -250) p.setVelocityY(p.body.velocity.y * 0.85);

    this.falls.forEach((f) => { f.tilePositionY += delta * 0.35; });

    // Picture: jump pose in the air, step between two leg poses while running.
    if (!onFloor) {
      p.setTexture('player-jump');
    } else if (Math.abs(p.body.velocity.x) > 30) {
      this.walkClock += delta;
      p.setTexture(Math.floor(this.walkClock / 120) % 2 ? 'player-walk' : 'player-idle');
    } else {
      this.walkClock = 0;
      p.setTexture('player-idle');
    }

    // Fell in a pit: pop back to the last solid ground. No lives to lose.
    if (p.y > this.worldH + 120) {
      p.setVelocity(0, 0);
      p.setAcceleration(0, 0);
      p.setPosition(this.safe.x - (p.flipX ? -40 : 40), this.safe.y - 20);
      this.cameras.main.flash(200, 255, 255, 255);
    }
  }
}
