// The level's Zebonkies.
//
// Wild Zebonky (E in a layout): wanders near home. When the player comes
// close it charges at them. Bumping into it costs one Z-bolt of energy.
// The player can jump over it, or toss food: once a Zebonky has eaten it is
// happy for good (a latch, no timer) and lets the player walk by.
//
// Guide Zebonky (B): bigger and sparkly. It waits; when the player comes
// close it bounds off to the next waiting point, leading the way through the
// level. At the last waiting point it waits for the player once more and
// reveals the exit door.

import { TILE } from './data/levels.js';
import { texKey } from './data/artsets.js';

// Zebonky art comes from the level's art set, or this one when the level
// has none (the rainforest set is the only one with a Zebonky so far).
export const ACTOR_ARTSET = 'rainforest';

const WILD_SCALE = 0.55;        // about 70 px tall
const GUIDE_SCALE = 0.78;       // a size up: about 100 px tall
const NOTICE = TILE * 5;        // how close before a wild Zebonky reacts
const CHARGE_SPEED = 210;       // slower than the player, so it can be jumped
const WANDER_SPEED = 60;
const WANDER_RANGE = TILE * 2;
const STUN_MS = 900;            // pause after bumping the player
const FOOD_SMELL = TILE * 4;    // food landing this close gets eaten
const GUIDE_NEAR = TILE * 3.5;  // the guide moves on when the player is this close
const GUIDE_SPEED = 340;        // px per second while bounding ahead
const GUIDE_HOP = TILE * 3;     // longest single bound

const ANIM_RATES = { idle: 2, walk: 10, run: 14, jump: 10 };

export function zebonkyArt(scene, artName) {
  for (const name of [artName, ACTOR_ARTSET]) {
    const set = name && scene.cache.json.get(`artset:${name}`);
    if (set && set.zebonky) return { name, z: set.zebonky, food: set.food };
  }
  return null;
}

// Animations are shared by every scene, so they're made once.
export function ensureAnims(scene, art) {
  Object.entries(art.z.anims).forEach(([anim, a]) => {
    const key = `${art.name}-z-${anim}`;
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texKey(art.name, a.file), { start: 0, end: a.frames - 1 }),
      frameRate: ANIM_RATES[anim] || 10,
      repeat: -1,
    });
  });
}

const play = (sprite, art, anim) => {
  const key = `${art.name}-z-${anim}`;
  if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
};

// ---------- wild Zebonky ----------

export class WildZebonky {
  constructor(scene, art, x, feetY) {
    this.scene = scene;
    this.art = art;
    this.home = x;
    this.state = 'wander';
    this.dir = -1;
    this.stunnedUntil = 0;
    this.target = null;
    const idle = texKey(art.name, art.z.anims.idle.file);
    const s = scene.physics.add.sprite(x, feetY, idle).setOrigin(0.5, 1).setScale(WILD_SCALE).setDepth(4);
    // Body: the cub, not the empty edges of its frame.
    const fw = art.z.frameWidth;
    const fh = art.z.frameHeight;
    s.body.setSize(fw * 0.5, fh * 0.62).setOffset(fw * 0.25, fh * 0.38);
    s.setMaxVelocity(400, 1400);
    s.zebonky = this;
    this.sprite = s;
    play(s, art, 'idle');
  }

  get fed() { return this.state === 'fed'; }

  feed() {
    if (this.fed) return;
    this.state = 'fed';
    this.target = null;
    this.sprite.setVelocityX(0);
    play(this.sprite, this.art, 'idle');
    this.scene.floatText(this.sprite.x, this.sprite.y - 80, 'Yum!');
    // A little heart now and then, so it reads as friendly.
    this.heartTimer = this.scene.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => this.scene.floatText(this.sprite.x, this.sprite.y - 70, '♥', 26),
    });
  }

  // Head for food that landed nearby.
  smell(food) {
    if (this.fed || this.target) return false;
    const s = this.sprite;
    if (Math.abs(food.x - s.x) > FOOD_SMELL || Math.abs(food.y - s.y) > TILE * 2) return false;
    this.target = food;
    this.state = 'food';
    return true;
  }

  bumped(time) {
    this.stunnedUntil = time + STUN_MS;
  }

  // Is the floor still there one step ahead? Wild Zebonkies don't jump into pits.
  groundAhead(dir) {
    const s = this.sprite;
    const c = Math.floor((s.x + dir * 30) / TILE);
    const r = Math.floor((s.y + 4) / TILE);
    return this.scene.isFloor(r, c);
  }

  move(vx, anim) {
    const s = this.sprite;
    const dir = Math.sign(vx);
    if (dir && (!this.groundAhead(dir) || (dir < 0 ? s.body.blocked.left : s.body.blocked.right))) {
      s.setVelocityX(0);
      play(s, this.art, 'idle');
      return false;
    }
    s.setVelocityX(vx);
    if (dir) s.setFlipX(dir > 0);  // the art faces left
    play(s, this.art, vx ? anim : 'idle');
    return true;
  }

  update(time, player) {
    const s = this.sprite;
    if (!s.body.blocked.down && !s.body.touching.down) return;
    if (this.fed) {
      s.setVelocityX(0);
      return;
    }
    if (time < this.stunnedUntil) {
      this.move(0);
      return;
    }
    if (this.state === 'food') {
      const f = this.target;
      if (!f || !f.active) {
        this.target = null;
        this.state = 'wander';
      } else if (Math.abs(f.x - s.x) < 18) {
        this.scene.eatFood(f);
        this.feed();
        return;
      } else {
        this.move(Math.sign(f.x - s.x) * 150, 'walk');
        return;
      }
    }
    const dx = player.x - s.x;
    const close = Math.abs(dx) < NOTICE && Math.abs(player.y - s.y) < TILE * 2.5;
    if (close) {
      this.state = 'charge';
      this.move(Math.sign(dx) * CHARGE_SPEED, 'run');
      return;
    }
    this.state = 'wander';
    if (s.x < this.home - WANDER_RANGE) this.dir = 1;
    if (s.x > this.home + WANDER_RANGE) this.dir = -1;
    if (!this.move(this.dir * WANDER_SPEED, 'walk')) this.dir *= -1;
  }
}

// ---------- guide Zebonky ----------

export class GuideZebonky {
  // points: feet positions [{x, y}], the first is where it starts.
  constructor(scene, art, points, onLastStop) {
    this.scene = scene;
    this.art = art;
    this.points = points;
    this.index = 0;
    this.travelling = false;
    this.revealed = false;
    this.onLastStop = onLastStop;
    const idle = texKey(art.name, art.z.anims.idle.file);
    this.sprite = scene.add.sprite(points[0].x, points[0].y, idle).setOrigin(0.5, 1).setScale(GUIDE_SCALE).setDepth(4);
    play(this.sprite, art, 'idle');
    // Sparkles, for now, so the guide stands out from wild Zebonkies.
    scene.time.addEvent({ delay: 170, loop: true, callback: () => this.sparkle() });
  }

  sparkle() {
    const s = this.sprite;
    const x = s.x + Phaser.Math.Between(-46, 46);
    const y = s.y - Phaser.Math.Between(10, 96);
    const dot = this.scene.add.star(x, y, 4, 2, 7, Phaser.Math.RND.pick([0xfff6b0, 0xffffff, 0x9fe8ff])).setDepth(5);
    this.scene.tweens.add({
      targets: dot, y: y - 22, alpha: 0, angle: 90, scale: 0.4, duration: 650,
      onComplete: () => dot.destroy(),
    });
  }

  update(time, player) {
    if (this.travelling || this.revealed) return;
    const s = this.sprite;
    s.setFlipX(player.x > s.x);
    const near = Math.abs(player.x - s.x) < GUIDE_NEAR && Math.abs(player.y - s.y) < TILE * 5;
    if (!near) return;
    if (this.index < this.points.length - 1) this.travelTo(this.index + 1);
    else {
      this.revealed = true;
      this.onLastStop(this);
    }
  }

  travelTo(i) {
    this.travelling = true;
    const s = this.sprite;
    const to = this.points[i];
    // Bound along the floor where there is some; where there isn't (a gap,
    // a cliff to climb) the hops join up into one leap.
    const hops = [];
    const steps = Math.max(1, Math.ceil(Math.abs(to.x - s.x) / GUIDE_HOP));
    let { x, y } = s;
    for (let k = 1; k <= steps; k++) {
      const last = k === steps;
      const hx = Phaser.Math.Clamp(last ? to.x : s.x + ((to.x - s.x) * k) / steps, 40, this.scene.worldW - 40);
      const hy = last ? to.y : this.scene.floorNear(hx, s.y + ((to.y - s.y) * k) / steps);
      if (hy === null) continue;
      hops.push({ x0: x, y0: y, x1: hx, y1: hy });
      x = hx;
      y = hy;
    }
    s.setFlipX(to.x > s.x);
    play(s, this.art, 'run');
    const next = () => {
      const h = hops.shift();
      if (!h) {
        this.index = i;
        this.travelling = false;
        play(s, this.art, 'idle');
        return;
      }
      // Arc a little above the higher end of the hop, not the whole climb
      // again on top of it.
      const lift = 40 + Math.max(0, h.y0 - h.y1) / 2;
      const p = { t: 0 };
      this.scene.tweens.add({
        targets: p,
        t: 1,
        duration: Math.max(240, (Math.hypot(h.x1 - h.x0, h.y1 - h.y0) / GUIDE_SPEED) * 1000),
        onUpdate: () => {
          s.x = h.x0 + (h.x1 - h.x0) * p.t;
          s.y = h.y0 + (h.y1 - h.y0) * p.t - lift * 4 * p.t * (1 - p.t);
        },
        onComplete: next,
      });
    };
    next();
  }
}
