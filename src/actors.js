// The level's Zebonkies.
//
// Wild Zebonky (E in a layout): wanders near home. When the player comes
// close it charges at them. Bumping into it costs one Z-bolt of energy.
// Jump over it and it carries on the way it was going, leaping gaps. Land on
// it and it's dazed for a moment, no harm done. Or toss food: once a Zebonky
// has eaten it is friendly for good (a latch, no timer) and tags along
// behind the player.
//
// Guide Zebonky (B): bigger and sparkly. It waits; when the player comes
// close it heads off to the next waiting point by a route the player could
// take too (walking, jumping, dropping, swimming, doors), leading the way. At the last waiting point it waits for the player once more and
// reveals the exit door.

import { TILE } from './data/levels.js?v=8a35cc4';
import { texKey } from './data/artsets.js?v=8a35cc4';

// Zebonky art comes from the level's art set, or this one when the level
// has none (the rainforest set is the only one with a Zebonky so far).
export const ACTOR_ARTSET = 'rainforest';

export const WILD_SCALE = 0.55;        // about 70 px tall
const GUIDE_SCALE = 0.78;       // a size up: about 100 px tall
const NOTICE = TILE * 5;        // how close before a wild Zebonky reacts
export const CHARGE_SPEED = 210;       // slower than the player, so it can be jumped
export const WANDER_SPEED = 60;
const WANDER_RANGE = TILE * 2;
const STUN_MS = 900;            // pause after bumping the player
const FOOD_SMELL = NOTICE;      // food this close gets charged at and eaten
const FOOD_CHARGE = 250;        // a bit faster than charging the player
const GUIDE_NEAR = TILE * 3.5;  // the guide moves on when the player is within this radius
const GUIDE_SPEED = 340;        // px per second while bounding ahead

// Chris's frames (tools/zebonky_sheet.py): idle breathes at a few frames a second.
const ANIM_RATES = { idle: 5, walk: 10, run: 14, jump: 10 };

export function zebonkyArt(scene, artName) {
  for (const name of [artName, ACTOR_ARTSET]) {
    const set = name && scene.cache.json.get(`artset:${name}`);
    if (set && set.zebonky) return { name, z: set.zebonky, food: set.food };
  }
  return null;
}

// The code below flips a Zebonky as if its art faces left. Art that faces
// right (`faces: 'right'` in the manifest: a sheet Chris drew facing right,
// tools/zebonky_sheet.py) gets the opposite flip, so it still looks the
// way it's going.
// Feet are drawn on this row of a Zebonky frame (tools/zebonky_sheet.py
// GROUND), not on its bottom edge: a Zebonky stands with this row on the
// ground (the user, 2026-10-26: "not touching the ground").
export const FEET_ROW = 122;
// How far feet sink into the ground's grass: the tile's top line is under
// the grass Chris drew above it, so standing exactly on it looked like
// hovering (the user, 2026-10-30). The picture sits this much below the body.
export const GRASS_SINK = 6;

// Layers (the user, 2026-10-30: a Zebonky on a bank was behind its grass):
// on land a character draws over every piece of ground, the banks' grass
// included (6.5); in water, under the water (5) so it swims in it. Tunnel
// blocks (8) stay in front, to hide whoever is inside.
export const LAND_DEPTH = 7;
export const WATER_DEPTH = 4;
export function layerFor(sprite, scene, depthOffset = 0) {
  const wet = scene.isWaterAt && scene.isWaterAt(sprite.x, sprite.y - 30);
  sprite.setDepth((wet ? WATER_DEPTH : LAND_DEPTH) + depthOffset);
}

// A Zebonky sprite's anchor at its feet, and (with a body) its body from
// the cub's middle down to its feet, not the empty edges of its frame.
export function standOnFeet(sprite, art) {
  const fw = art.z.frameWidth;
  const fh = art.z.frameHeight;
  sprite.setOrigin(0.5, FEET_ROW / fh);
  // the sink is in game px: the body is sized in the frame's own pixels,
  // which the sprite's scale shrinks (Zebonkies are drawn at about half);
  // and his feet end a pixel or two above FEET_ROW
  const sink = GRASS_SINK / (Math.abs(sprite.scaleY) || 1) + 2;
  if (sprite.body) sprite.body.setSize(fw * 0.5, FEET_ROW - fh * 0.38 - sink).setOffset(fw * 0.25, fh * 0.38);
  return sprite;
}

export function faceArt(sprite, art) {
  if (art.z.faces !== 'right') return sprite;
  const flip = sprite.setFlipX.bind(sprite);
  sprite.setFlipX = (v) => flip(!v);
  sprite.setFlipX(false);
  return sprite;
}

// Animations are shared by every scene, so they're made once.
// An animation with phases (`start`, `loop`, `end` in the manifest, frame
// ranges; Shaan's roll: curl up once, roll, uncurl when he stops) is made
// as three: <key>-start and <key>-end play once, <key> loops.
export function ensureAnims(scene, art) {
  Object.entries(art.z.anims).forEach(([anim, a]) => {
    const key = `${art.name}-z-${anim}`;
    if (scene.anims.exists(key)) return;
    const tex = texKey(art.name, a.file);
    // A range can run backwards ([last, first]): played in reverse.
    const make = (k, [from, to], repeat) => scene.anims.create({
      key: k,
      frames: scene.anims.generateFrameNumbers(tex, {
        frames: Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * Math.sign(to - from || 1)),
      }),
      frameRate: a.fps || ANIM_RATES[anim] || 10,
      repeat,
    });
    make(key, a.loop || [0, a.frames - 1], -1);
    if (a.start) make(`${key}-start`, a.start, 0);
    if (a.end) make(`${key}-end`, a.end, 0);
    // Other phases (the dive's `tip` and `level`) play once, when the
    // Zebonky's own code calls them (companion.js).
    if (a.tip) make(`${key}-tip`, a.tip, 0);
    if (a.level) make(`${key}-level`, a.level, 0);
  });
}

// How long a Zebonky crouches on the ground before it leaps, ms: its jump's
// `ground` frames (Sofia, the user, 2026-10-27: "hold her on the ground for
// the crouch frames in the game too, then leap"). 0 when it has none.
export const crouchTime = (art) => {
  const a = art && art.z.anims.jump;
  return a && a.ground ? ((a.ground[1] - a.ground[0] + 1) / (a.fps || ANIM_RATES.jump || 10)) * 1000 : 0;
};

// Plays anim on a Zebonky: the last one's end first if it has one, then
// this one's start if it has one, then its loop.
export const play = (sprite, art, anim) => {
  if (sprite.zAnim === anim) return;
  const was = sprite.zAnim && art.z.anims[sprite.zAnim];
  const a = art.z.anims[anim] || {};
  const key = `${art.name}-z-${anim}`;
  const seq = [];
  if (was && was.end) seq.push(`${art.name}-z-${sprite.zAnim}-end`);
  if (a.start) seq.push(`${key}-start`);
  seq.push(key);
  sprite.zAnim = anim;
  sprite.anims.chain();
  sprite.play(seq[0]);
  seq.slice(1).forEach((k) => sprite.anims.chain(k));
};

// ---------- wild Zebonky ----------

export const LEAP_SPEED = 720;         // a Zebonky's jump: about 2 tiles high
const LEAP_REACH = 420;         // fastest sideways speed in a leap (about 5 tiles' reach)
const OVERSHOOT_MS = 4000;      // keeps running this long after being jumped over (about 13 tiles)
const DAZE_MS = 1500;           // confused after being landed on
const FOLLOW_NEAR = TILE * 2.5; // a fed Zebonky stops this close behind you
const FOLLOW_FAR = TILE * 4;    // and starts walking again past this
const FOLLOW_LOST = TILE * 16;  // further than this it catches up in a blink
const FOLLOW_STUCK_MS = 1500;   // no closer to the player for this long: catch up
export const SWIM_SPEED = 120;         // paddling along the surface
export const FLOAT_RISE = 170;         // water carries a Zebonky up at this speed
// A Zebonky that flies (`flies` in its art: Ricky) keeps its feet this far
// above the water instead of floating in it (the user, 2026-10-27).
export const FLY_ABOVE = 40;

export class WildZebonky {
  constructor(scene, art, x, feetY) {
    this.scene = scene;
    this.art = art;
    this.home = { x, y: feetY };
    this.state = 'wander';
    this.isFed = false;
    this.dir = -1;
    this.stunnedUntil = 0;
    this.dazedUntil = 0;
    this.overshootUntil = 0;
    this.chaseSide = 0;
    this.walking = false;
    this.target = null;
    this.safe = { x, y: feetY };    // last spot with floor under its middle
    const idle = texKey(art.name, art.z.anims.idle.file);
    const s = faceArt(standOnFeet(scene.physics.add.sprite(x, feetY, idle).setScale(WILD_SCALE).setDepth(4), art), art);
    s.setMaxVelocity(LEAP_REACH, 1400);
    s.zebonky = this;
    this.sprite = s;
    play(s, art, 'idle');
  }

  get fed() { return this.isFed; }

  // Harmless right now: fed for good, or still seeing stars.
  get harmless() { return this.isFed || this.scene.time.now < this.dazedUntil; }

  // Fed: a burst of hearts, then it dashes off to the right and is gone.
  // (The biome's companion is the Zebonky that travels with her; a trail
  // of followers was dropped, the user, 2026-10-24.)
  feed() {
    if (this.isFed) return;
    this.isFed = true;
    this.state = 'leave';
    this.target = null;
    this.sprite.setVelocityX(0);
    this.sprite.setAngle(0);
    play(this.sprite, this.art, 'idle');
    this.scene.floatText(this.sprite.x, this.sprite.y - 80, 'Yum!');
    this.hearts(9);
    this.leaveAt = this.scene.time.now + 1100;
    if (this.scene.onZebonkyFed) this.scene.onZebonkyFed(this);
  }

  // Off it goes, running right and leaping gaps, until it's out of sight.
  leave(time) {
    const s = this.sprite;
    if (time < this.leaveAt) {
      this.move(0);
      return;
    }
    // On to the right the safe way: it leaps only gaps it can land across
    // and ledges it can reach, and never runs into a pit or water (the
    // user, 2026-10-24). Where it can't go on, it fades away in hearts.
    if (!this.move(CHARGE_SPEED * 1.4, 'run', true)) {
      this.goAway(true);
      return;
    }
    // Out of sight, or not getting anywhere: gone.
    const view = this.scene.cameras.main.worldView;
    if (s.x > view.right + 150 || time > this.leaveAt + 8000) {
      this.goAway();
      return;
    }
    if (!this.leftFrom || time - this.leftFrom.t > 900) {
      if (this.leftFrom && s.x - this.leftFrom.x < 30) this.goAway(true);
      this.leftFrom = { x: s.x, t: time };
    }
  }

  goAway(fade = false) {
    this.gone = true;
    const s = this.sprite;
    s.setVelocity(0, 0);
    s.body.enable = false;
    if (!fade) {
      s.setVisible(false);
      return;
    }
    this.hearts(5);
    this.scene.tweens.add({ targets: s, alpha: 0, duration: 450, onComplete: () => s.setVisible(false) });
  }

  // A rising stream of red and pink hearts, staggered and drifting.
  hearts(count) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * 90, () => {
        const s = this.sprite;
        if (!s.active) return;
        const x = s.x + Phaser.Math.Between(-18, 18);
        const y = s.y - 56;
        const h = scene.add.text(x, y, '\u2665', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Phaser.Math.Between(20, 32)}px`,
          color: Phaser.Math.RND.pick(['#e8264b', '#ff4f7a', '#ff86a8', '#d81b60', '#ffb3c8']),
          stroke: '#5a1020',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(9).setScale(0.4);
        const drift = Phaser.Math.Between(-30, 30);
        scene.tweens.add({ targets: h, scale: 1, duration: 220, ease: 'Back.Out' });
        scene.tweens.add({
          targets: h,
          y: y - Phaser.Math.Between(70, 120),
          x: x + drift,
          alpha: 0,
          duration: Phaser.Math.Between(900, 1300),
          ease: 'Sine.Out',
          onComplete: () => h.destroy(),
        });
        scene.tweens.add({ targets: h, angle: { from: -12, to: 12 }, duration: 300, yoyo: true, repeat: 2 });
      });
    }
  }

  // Head for food that landed nearby.
  smell(food) {
    if (this.isFed || this.target) return false;
    const s = this.sprite;
    if (Math.abs(food.x - s.x) > FOOD_SMELL || Math.abs(food.y - s.y) > TILE * 2) return false;
    this.target = food;
    this.state = 'food';
    return true;
  }

  bumped(time) {
    this.stunnedUntil = time + STUN_MS;
  }

  // Landed on: no harm done, but it's dizzy for a moment.
  daze(time) {
    this.dazedUntil = time + DAZE_MS;
    this.state = 'wander';
    this.chaseSide = 0;
    this.sprite.setVelocityX(0);
    play(this.sprite, this.art, 'idle');
    this.scene.floatText(this.sprite.x, this.sprite.y - 76, '?', 34);
    this.scene.tweens.add({
      targets: this.sprite, angle: { from: -12, to: 12 }, duration: 160, yoyo: true, repeat: 4,
      onComplete: () => this.sprite.setAngle(0),
    });
  }

  // ---- reading the ground ----

  feetCell() {
    const s = this.sprite;
    return { c: Math.floor(s.x / TILE), r: Math.floor((s.y + 4) / TILE) };
  }

  groundAhead(dir) {
    const s = this.sprite;
    return this.scene.isFloor(Math.floor((s.y + 4) / TILE), Math.floor((s.x + dir * 30) / TILE));
  }

  // Somewhere to land a few tiles ahead (a gap it can clear)? Returns the
  // middle of the first tile it could land on, or null.
  landingAhead(dir) {
    const { c, r } = this.feetCell();
    for (let d = 1; d <= 4; d++) {
      for (let rr = r - 2; rr <= r + 3; rr++) {
        const col = c + dir * d;
        if (this.scene.isFloor(rr, col) && !this.scene.isFloor(rr - 1, col)) return col * TILE + TILE / 2;
      }
    }
    return null;
  }

  // A wall ahead low enough to hop up (two tiles or less)?
  ledgeAhead(dir) {
    const { c, r } = this.feetCell();
    const col = c + dir;
    for (let up = 1; up <= 2; up++) {
      if (this.scene.isFloor(r - up, col) && !this.scene.isFloor(r - up - 1, col)) return true;
    }
    return false;
  }

  // Crouches first if its jump has crouch frames, standing still, then
  // leaps with the speed it had.
  leap() {
    const s = this.sprite;
    play(s, this.art, 'jump');
    const wait = crouchTime(this.art);
    if (!wait) {
      s.setVelocityY(-LEAP_SPEED);
      return;
    }
    const vx = s.body.velocity.x;
    s.setVelocityX(0);
    this.crouchUntil = this.scene.time.now + wait;
    this.scene.time.delayedCall(wait, () => { if (s.active) s.setVelocity(vx, -LEAP_SPEED); });
  }

  // Walk or run one way. `canLeap` lets it jump gaps and low ledges; without
  // it, it stops at edges and walls. Returns false when it had to stop.
  move(vx, anim, canLeap = false) {
    const s = this.sprite;
    const dir = Math.sign(vx);
    if (dir) {
      s.setFlipX(dir > 0);  // the art faces left
      const wall = dir < 0 ? s.body.blocked.left : s.body.blocked.right;
      if (wall || !this.groundAhead(dir)) {
        const land = wall ? null : this.landingAhead(dir);
        if (canLeap && (wall ? this.ledgeAhead(dir) : land !== null)) {
          // Across a gap, go fast enough to reach the far side.
          const air = (2 * LEAP_SPEED) / this.scene.physics.world.gravity.y;
          const need = land === null ? 0 : (Math.abs(land - s.x) + 12) / air;
          s.setVelocityX(dir * Math.min(LEAP_REACH, Math.max(Math.abs(vx), need)));
          this.leap();
          return true;
        }
        s.setVelocityX(0);
        play(s, this.art, 'idle');
        return false;
      }
    }
    s.setVelocityX(vx);
    play(s, this.art, vx ? anim : 'idle');
    return true;
  }

  update(time, player) {
    const s = this.sprite;
    if (this.gone) return;
    layerFor(s, this.scene, -0.2);
    // A tamed Zebonky never falls into a pit and disappears (the user,
    // 2026-10-30: "it is traumatic to kids"): falling with no ground
    // anywhere below it, it pops back, in hearts, onto the last ground it
    // stood on, and goes on from there.
    // (only once it has dropped well below that ground: a leap across a gap
    // is over open air for a moment too)
    if (this.isFed && s.body.velocity.y > 0 && !s.body.blocked.down
        && s.y > this.safe.y + TILE * 1.5 && this.overPit()) {
      this.reappear(this.safe.x, this.safe.y);
      this.hearts(3);
      return;
    }
    // Fell out of the level: back on the edge it fell from (or, when fed,
    // back beside the player), like the explorer.
    if (s.y > this.scene.pitBottom(s.x) + 200) {
      if (!this.isFed) this.reappear(this.safe.x, this.safe.y);
      else this.goAway();
      return;
    }
    // Leaping out of the water: keep pushing toward the bank (touching the
    // bank stops it sideways) until it's up and over.
    if (time < (this.leapingUntil || 0)) {
      s.setVelocityX(this.dir * 180);
      return;
    }
    // Crouching before a leap: still until it springs.
    if (time < (this.crouchUntil || 0)) {
      s.setVelocityX(0);
      return;
    }
    // In water: float up and paddle for the shore.
    const flying = this.art.z.flies && !s.body.blocked.down && this.scene.isWaterAt(s.x, s.y + FLY_ABOVE + 20);
    if (this.scene.isWaterAt(s.x, s.y - 30) || flying) {
      if (this.isFed && time > this.leaveAt) this.goAway(true);   // leaving: it slips away
      else this.swim(player);
      return;
    }
    s.body.setGravityY(0);
    if (!s.body.blocked.down && !s.body.touching.down) return;  // mid-leap: keep going
    if (this.scene.floorUnder(s.x, s.y)) this.safe = { x: s.x, y: s.y };

    if (this.isFed) {
      this.leave(time);
      return;
    }
    if (time < this.dazedUntil || time < this.stunnedUntil) {
      this.move(0);
      return;
    }
    // Jumped over: it carries on the way it was going, leaping gaps.
    if (time < this.overshootUntil) {
      if (!this.move(this.dir * CHARGE_SPEED, 'run', true)) this.overshootUntil = 0;
      return;
    }
    // Food on the ground nearby.
    if (!this.target) {
      const f = this.scene.foodNear(s.x, s.y, FOOD_SMELL);
      if (f) {
        this.target = f;
        this.state = 'food';
      }
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
        // Food! It charges, leaping gaps to get there.
        this.move(Math.sign(f.x - s.x) * FOOD_CHARGE, 'run', true);
        return;
      }
    }
    const dx = player.x - s.x;
    const airborne = !player.body.blocked.down && !player.body.touching.down;
    // A player in mid-jump is still being chased, so a jump over the top
    // is noticed rather than forgotten.
    const reach = this.state === 'charge' && airborne ? TILE * 4.5 : TILE * 2.5;
    const close = Math.abs(dx) < NOTICE && Math.abs(player.y - s.y) < reach;
    if (close) {
      const side = Math.sign(dx) || this.dir;
      if (this.state === 'charge' && this.chaseSide && side !== this.chaseSide && airborne) {
        // The player sailed over it.
        this.dir = this.chaseSide;
        this.overshootUntil = time + OVERSHOOT_MS;
        this.chaseSide = 0;
        this.state = 'wander';
        this.move(this.dir * CHARGE_SPEED, 'run', true);
        return;
      }
      this.state = 'charge';
      this.chaseSide = side;
      this.dir = side;
      this.move(side * CHARGE_SPEED, 'run');
      return;
    }
    this.state = 'wander';
    this.chaseSide = 0;
    if (s.x < this.home.x - WANDER_RANGE) this.dir = 1;
    if (s.x > this.home.x + WANDER_RANGE) this.dir = -1;
    if (!this.move(this.dir * WANDER_SPEED, 'walk')) this.dir *= -1;
  }

  // Fed: tags along a little way behind the player.
  follow(player) {
    const s = this.sprite;
    const now = this.scene.time.now;
    const dx = player.x - s.x;
    const far = Math.abs(dx);
    const rise = Math.abs(player.body.bottom - s.y);
    const standing = player.body.blocked.down || player.body.touching.down;
    // Can't keep up (a climb too high for it, a door, a long way back)?
    // Once the player is standing somewhere, pop up beside them.
    const behind = far > FOLLOW_FAR || rise > TILE * 1.5;
    const gap = Math.hypot(far, rise);
    if (!behind) {
      this.stuckSince = 0;
    } else if (!this.stuckSince || gap < this.bestGap - 16) {
      this.stuckSince = now;
      this.bestGap = gap;
    }
    const stuck = behind && this.stuckSince && now - this.stuckSince > FOLLOW_STUCK_MS;
    if (standing && (far > FOLLOW_LOST || stuck)) {
      this.catchUp(player);
      return;
    }
    // Each tamed Zebonky keeps its own distance, so several trail in a line.
    const spread = Math.max(0, this.scene.wild.filter((z) => z.fed).indexOf(this)) * 48;
    if (far > FOLLOW_FAR + spread || (this.walking && far > FOLLOW_NEAR + spread)) {
      const fast = far > TILE * 6;
      this.walking = this.move(Math.sign(dx) * (fast ? 280 : 170), fast ? 'run' : 'walk', true);
    } else {
      this.walking = false;
      s.setVelocityX(0);
      s.setFlipX(dx > 0);
      play(s, this.art, 'idle');
    }
  }

  // Water holds a Zebonky up too: it rises to the surface and paddles. Fed,
  // it heads for the player; otherwise it keeps going the way it faces. At
  // the bank it leaps out.
  swim(player) {
    const s = this.sprite;
    const scene = this.scene;
    s.body.setGravityY(-scene.physics.world.gravity.y);
    const c = Math.floor(s.x / TILE);
    const surface = scene.surfaceRow[c] !== undefined ? scene.surfaceRow[c] * TILE : null;
    const floatFeet = surface === null ? s.y : surface + (this.art.z.flies ? -FLY_ABOVE : 30);
    const vy = s.body.velocity.y;
    s.setVelocityY(s.y > floatFeet + 4 ? Phaser.Math.Linear(vy, -FLOAT_RISE, 0.1) : Phaser.Math.Linear(vy, (floatFeet - s.y) * 4, 0.25));
    if (this.isFed || this.state === 'charge') this.dir = Math.sign(player.x - s.x) || this.dir;
    const atBank = this.dir < 0 ? s.body.blocked.left : s.body.blocked.right;
    if (atBank) {
      if (surface !== null && s.y <= floatFeet + 10) {
        s.body.setGravityY(0);
        s.setVelocity(this.dir * 180, -LEAP_SPEED - 80);
        this.leapingUntil = scene.time.now + 700;
        play(s, this.art, 'jump');
      } else {
        this.dir = -this.dir;            // can't get out here: try the other bank
      }
      return;
    }
    s.setVelocityX(this.dir * SWIM_SPEED);
    s.setFlipX(this.dir > 0);
    // Its own swim strip if it has one (Axel), else it paddles with its walk.
    play(s, this.art, this.art.z.anims.swim ? 'swim' : 'walk');
  }

  // Pop back into view at a spot, after a fall.
  // Nothing to land on in this column, all the way down (a pit), and no
  // water to fall into.
  overPit() {
    const sc = this.scene;
    const s = this.sprite;
    const c = Math.floor(s.x / TILE);
    for (let r = Math.max(0, Math.floor(s.y / TILE)); r < sc.rows.length; r++) {
      if (sc.isFloor(r, c) || sc.water.has(`${c},${r}`)) return false;
    }
    return true;
  }

  reappear(x, feetY) {
    const s = this.sprite;
    s.setPosition(x, feetY - 2);
    s.body.reset(s.x, s.y);          // move the body with it, not just the picture
    s.body.setGravityY(0);
    this.overshootUntil = 0;
    this.scene.tweens.killTweensOf(s);
    s.setAngle(0);
    s.setAlpha(0.2);
    this.scene.tweens.add({ targets: s, alpha: 1, duration: 300 });
  }

  // Left far behind (a door, a long fall): pop up just behind the player,
  // on floor. If there's none behind, in front; failing that, where the
  // player last stood safely.
  catchUp(player) {
    this.catchUpAt(player.x, player.body.bottom, player.flipX);
  }

  // Pop up on floor beside a spot (feet at feetY): behind if there's floor
  // there, else in front, else right at the spot.
  catchUpAt(x0, feetY, facingLeft) {
    if (this.gone || this.isFed) return;
    const scene = this.scene;
    const back = facingLeft ? 1 : -1;
    this.stuckSince = 0;
    // Several tamed Zebonkies line up rather than stack in one spot.
    const spread = Math.max(0, scene.wild.filter((z) => z.fed).indexOf(this)) * 40;
    const near = FOLLOW_NEAR + spread;
    for (const x of [x0 + back * near, x0 - back * near, x0 + back * TILE, x0]) {
      const y = scene.floorNear(x, feetY);
      if (y !== null && scene.floorUnder(x, y)) {
        this.reappear(x, y);
        return;
      }
    }
    this.reappear(x0, feetY);
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
    this.sprite = faceArt(standOnFeet(scene.add.sprite(points[0].x, points[0].y, idle).setScale(GUIDE_SCALE).setDepth(4), art), art);
    play(this.sprite, art, 'idle');
    // Sparkles, for now, so the guide stands out from wild Zebonkies.
    // Sparkles, so the guide stands out from wild Zebonkies: a soft golden
    // glow behind it and twinkling stars around it.
    this.glow = scene.add.ellipse(this.sprite.x, this.sprite.y - 48, 150, 130, 0xffe27a, 0.28).setDepth(3);
    scene.tweens.add({ targets: this.glow, scale: 1.18, alpha: 0.14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.time.addEvent({ delay: 90, loop: true, callback: () => this.sparkle() });
  }

  sparkle() {
    const s = this.sprite;
    const x = s.x + Phaser.Math.Between(-62, 62);
    const y = s.y - Phaser.Math.Between(4, 118);
    const big = Phaser.Math.Between(9, 15);
    // Chris's "good vibe" sparkle in the biome food's colours, if the level has it.
    const tex = this.scene.sparkTex;
    const star = tex
      ? this.scene.add.image(x, y, tex).setDepth(5).setScale(0.2)
      : this.scene.add.star(x, y, 4, big * 0.32, big, Phaser.Math.RND.pick([0xfff3a0, 0xffffff, 0xffd84a, 0xaef0ff]))
        .setStrokeStyle(2, 0x6b4a10).setDepth(5).setScale(0.2).setAngle(Phaser.Math.Between(0, 45));
    const full = tex ? big / 14 : 1;
    // Twinkle: pop in, then shrink away as it drifts up.
    this.scene.tweens.add({ targets: star, scale: full, duration: 180, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: star, y: y - 30, alpha: 0, angle: tex ? 0 : star.angle + 90, scale: 0.3 * full, delay: 180, duration: 650,
      onComplete: () => star.destroy(),
    });
  }

  update(time, player) {
    layerFor(this.sprite, this.scene, -0.2);
    if (this.glow) this.glow.setPosition(this.sprite.x, this.sprite.y - 48);
    if (this.travelling || this.revealed) return;
    const s = this.sprite;
    s.setFlipX(player.x > s.x);
    // A circle around it: close in any direction (beside, above, below).
    const near = Math.hypot(player.x - s.x, player.body.bottom - s.y) < GUIDE_NEAR;
    if (!near) return;
    if (this.index < this.points.length - 1) {
      // Every time it sets off: "This way!" (the user, 2026-10-24).
      // It fades over a few seconds, so it can be read (the user, 2026-10-25).
      this.scene.floatText(s.x, s.y - 120, 'This way!', 30, 3000);
      this.travelTo(this.index + 1);
    } else {
      this.revealed = true;
      this.onLastStop(this);
    }
  }

  // Head for waiting point i along a route the player could take: running
  // along floors, jumping, dropping, swimming, using doors (src/pathing.js).
  travelTo(i) {
    this.travelling = true;
    const s = this.sprite;
    const to = this.points[i];
    // If the waiting point can't be reached on foot (the designer warns about
    // that), it goes as far toward it as the player could and waits there.
    const route = this.scene.routeBetween(s.x, s.y, to.x, to.y, true);
    const hops = route ? this.hopsAlong(route) : [];
    const next = () => {
      const h = hops.shift();
      if (!h) {
        this.index = i;
        this.travelling = false;
        play(s, this.art, 'idle');
        return;
      }
      if (h.x1 !== h.x0) s.setFlipX(h.x1 > h.x0);
      if (h.type === 'door') {
        this.scene.tweens.add({
          targets: s, alpha: 0, duration: 180,
          onComplete: () => {
            s.setPosition(h.x1, h.y1);
            this.scene.tweens.add({ targets: s, alpha: 1, duration: 180, onComplete: next });
          },
        });
        return;
      }
      play(s, this.art, h.type === 'run' ? 'run' : h.type === 'swim' ? (this.art.z.anims.swim ? 'swim' : 'walk') : 'jump');
      const p = { t: 0 };
      // A jump starts with its crouch, on the spot.
      const crouch = h.type === 'jump' ? crouchTime(this.art) : 0;
      // swimming is slower; the uphill waterfall carries it up fast
      const speed = h.type === 'swim' ? GUIDE_SPEED * 0.55 : h.type === 'ride' ? 640 : GUIDE_SPEED;
      this.scene.tweens.add({
        targets: p,
        t: 1,
        delay: crouch,
        duration: Math.max(h.lift ? 260 : 120, (Math.hypot(h.x1 - h.x0, h.y1 - h.y0) / speed) * 1000),
        onUpdate: () => {
          s.x = h.x0 + (h.x1 - h.x0) * p.t;
          s.y = h.y0 + (h.y1 - h.y0) * p.t - h.lift * 4 * p.t * (1 - p.t);
        },
        onComplete: next,
      });
    };
    next();
  }

  // Turn a route of tile steps into moves: runs along level ground (and
  // swims along the surface) joined into one stretch; jumps and drops as arcs.
  hopsAlong(route) {
    const hops = [];
    for (let k = 1; k < route.length; k++) {
      const a = route[k - 1];
      const b = route[k];
      const type = b.type === 'walk' ? 'run' : b.type;
      const last = hops[hops.length - 1];
      if ((type === 'run' || type === 'swim') && last && last.type === type && last.y1 === b.y) {
        last.x1 = b.x;
        continue;
      }
      let lift = 0;
      if (type === 'current') {
        // Step into the waterfall, ride it up past the landing, hop out onto it.
        const scene = this.scene;
        const r = Math.floor((a.y - 4) / TILE);
        const c = Math.floor(a.x / TILE);
        const up = (ch) => ch === 'W' || ch === 'V';
        const side = up(scene.cellAt(r, c - 1)) || up(scene.cellAt(r - 1, c - 1)) ? -1 : 1;
        const inX = (c + side) * TILE + TILE / 2;
        const topY = b.y - TILE * 0.6;
        hops.push({ type: 'swim', x0: a.x, y0: a.y, x1: inX, y1: a.y, lift: 0 });
        hops.push({ type: 'ride', x0: inX, y0: a.y, x1: inX, y1: topY, lift: 0 });
        hops.push({ type: 'jump', x0: inX, y0: topY, x1: b.x, y1: b.y, lift: 24 });
        continue;
      }
      if (type === 'jump') {
        const up = b.y < a.y;
        const peak = Math.min(a.y, b.y) - (up ? 0.55 : 0.35) * TILE;
        lift = (a.y + b.y) / 2 - peak;
      } else if (type === 'drop') {
        lift = 16;
      }
      hops.push({ type, x0: a.x, y0: a.y, x1: b.x, y1: b.y, lift });
    }
    return hops;
  }


}
