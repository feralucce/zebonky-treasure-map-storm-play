// The companion Zebonky in a level: the biome Zebonky the player earned
// (state.companion(), per difficulty). It plays its own animation strips
// (the user, 2026-10-26: "animate the companion with Shaan's strips"):
// idle when she stops, its run (Shaan's roll) rolling along behind her,
// its jump over steps, and its dive into water: tipping nose down as
// it reaches the surface, then levelling out under it before it paddles. A Zebonky with no strips yet is its
// picture, small, rolling along behind her.
// A new companion sparkles and fades in beside her; one she already has is
// simply there when the level starts.

import { BIOMES } from './data/world.js?v=3637605';
import { ARTSETS, texKey } from './data/artsets.js?v=3637605';
import { zebonkyArt, ensureAnims, faceArt, play, standOnFeet, crouchTime, FLY_ABOVE } from './actors.js?v=3637605';

const TILE = 64;
const SIZE = 64;           // px tall on screen (the picture)
const SCALE = 0.55;        // the strips, as big as the wild ones (actors.js)
const BEHIND = 76;         // how far behind her it keeps
const SPEED = 330;         // a little faster than she runs, to keep up
const HOP = 720;           // its jump, for steps and ledges
const DIVE_HOP = 0.6;      // its dive off a bank: this much of a hop
const DIVE_DEEP = 84;      // how far under the surface its feet go in a dive
const UNCURL_AFTER = 300; // ms stopped before it uncurls from its roll
const TOO_FAR = TILE * 7;  // further than this (or fallen out): it pops back

// The art set whose Zebonky this biome's is (by name), or null.
function artFor(scene, biome) {
  const z = BIOMES[biome] && BIOMES[biome].zebonky;
  if (!z) return null;
  for (const name of ARTSETS) {
    const set = scene.cache.json.get(`artset:${name}`);
    const own = set && set.zebonky;
    if (own && own.name.replace(' (stand-in)', '') === z.name) return zebonkyArt(scene, name);
  }
  return null;
}

export class Companion {
  constructor(scene, biome, arrive = false) {
    this.scene = scene;
    const p = scene.player;
    const x = p.x - (p.flipX ? -BEHIND : BEHIND);
    this.art = artFor(scene, biome);
    let s;
    if (this.art) {
      ensureAnims(scene, this.art);
      s = faceArt(standOnFeet(scene.physics.add.sprite(x, p.body.bottom, texKey(this.art.name, this.art.z.anims.idle.file))
        .setScale(SCALE), this.art), this.art);
      play(s, this.art, 'idle');
    } else {
      const z = BIOMES[biome] && BIOMES[biome].zebonky;
      s = scene.physics.add.sprite(x, p.y - 20, `zebonky-${z.id}`);
      s.setScale(SIZE / s.height);
      // A round body, so it rolls over the ground.
      const r = (s.width * 0.42);
      s.body.setCircle(r, s.width / 2 - r, s.height - 2 * r);
    }
    s.setDepth(-0.5);
    scene.physics.add.collider(s, scene.solids);
    scene.physics.add.collider(s, scene.platforms);
    this.sprite = s;
    this.dive = null;               // diving: 'air', 'tip' or 'level'
    if (arrive) this.sparkleIn();
  }

  // A ring of sparkles and a fade in, with a little pop.
  sparkleIn() {
    const s = this.sprite;
    const scene = this.scene;
    const full = s.scale;
    s.setAlpha(0).setScale(full * 0.4);
    scene.tweens.add({ targets: s, alpha: 1, scale: full, duration: 650, ease: 'Back.Out' });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const star = scene.add.star(s.x, s.y - (this.art ? 30 : 0), 4, 3, 8, i % 2 ? 0xfff2a8 : 0xffffff).setDepth(9);
      scene.tweens.add({
        targets: star,
        x: s.x + Math.cos(a) * 70,
        y: s.y + Math.sin(a) * 70 - 20,
        alpha: 0,
        angle: 180,
        duration: 700 + (i % 4) * 90,
        ease: 'Cubic.Out',
        onComplete: () => star.destroy(),
      });
    }
  }

  update() {
    const s = this.sprite;
    const p = this.scene.player;
    if (!s.active) return;
    // Lost (fallen out, or left far behind): back beside her.
    if (Math.abs(s.x - p.x) > TOO_FAR || s.y > this.scene.worldH + 100 || Math.abs(s.y - p.y) > TILE * 5) {
      if (p.body.blocked.down) {
        s.setPosition(p.x - (p.flipX ? -BEHIND : BEHIND), this.art ? p.body.bottom : p.y - 20).setVelocity(0, 0);
        this.dive = null;
        this.sparkleIn();
      }
      return;
    }
    const target = p.x - (p.flipX ? -BEHIND : BEHIND);
    const dx = target - s.x;
    const vx = Math.abs(dx) < 10 ? 0 : Math.sign(dx) * Math.min(SPEED, Math.abs(dx) * 4);
    s.setVelocityX(vx);
    // The art faces left: turned round to face the way she's going.
    if (Math.abs(p.body.velocity.x) > 20) s.setFlipX(p.body.velocity.x > 0);
    else if (vx) s.setFlipX(vx > 0);
    if (this.art) this.animated(s, p, vx);
    else this.rolling(s, p, vx);
  }

  // The picture: rolls along, floats in water.
  rolling(s, p, vx) {
    if (this.scene.isWaterAt(s.x, s.y)) {
      s.setVelocityY(Math.max(s.body.velocity.y - 40, -260));
      if ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right)) s.setVelocityY(-HOP);
      s.rotation += (s.body.velocity.x / 60) / (s.displayHeight / 2);
      return;
    }
    const onFloor = s.body.blocked.down || s.body.touching.down;
    if (onFloor && ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right) || p.y < s.y - TILE * 1.2)) {
      s.setVelocityY(-HOP);
    }
    s.rotation += (s.body.velocity.x / 60) / (s.displayHeight / 2);
  }

  // The strips (feet at the sprite's origin).
  animated(s, p, vx) {
    const scene = this.scene;
    const art = this.art;
    const mid = s.y - 20;           // a point in its middle
    const onFloor = s.body.blocked.down || s.body.touching.down;
    // A Zebonky that flies (Ricky, `flies` in its art; the user,
    // 2026-10-27: "flight over water") counts as over the water while there
    // is water just under where it flies, and isn't standing on anything.
    const inWater = scene.isWaterAt(s.x, mid)
      || (art.z.flies && !onFloor && scene.isWaterAt(s.x, s.y + FLY_ABOVE + 20));
    const dir = Math.sign(vx);
    const vy = s.body.velocity.y;
    const surface = this.surfaceAt(s.x);
    // Water holds it up, like the wild ones (actors.js swim).
    s.body.setGravityY(inWater ? -scene.physics.world.gravity.y : 0);
    if (!this.dive) s.anims.timeScale = 1;
    if (inWater) {
      if (this.dive) {
        // Under the water: it tips the rest of the way if it hadn't, goes
        // down about its own height, and levels out (the user,
        // 2026-10-26: "the dive tip forward should be at the level of the
        // water... then it levels out"); then it floats up and paddles.
        if (this.dive === 'air') this.phase('tip');
        const deep = surface === null || s.y > surface + DIVE_DEEP;
        if (this.dive === 'tip' && this.played()) this.phase('level');
        if (this.dive === 'level' && this.played()) {
          this.dive = null;
        } else {
          s.setVelocityY(deep ? Phaser.Math.Linear(vy, 0, 0.3) : Math.max(vy * 0.9, 120));
          return;
        }
      }
      // Floating: its feet a little under the surface; a flier keeps its
      // feet FLY_ABOVE over it.
      const ride = art.z.flies ? -FLY_ABOVE : 30;
      if (surface === null) s.setVelocityY(Math.max(vy - 40, -260));
      else s.setVelocityY(s.y > surface + ride + 4 ? Phaser.Math.Linear(vy, -260, 0.1) : Phaser.Math.Linear(vy, (surface + ride - s.y) * 4, 0.25));
      if ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right)) {
        s.setVelocityY(-HOP);
        play(s, art, 'jump');
        return;
      }
      // In water: its own swim strip if it has one (Axel), all the time
      // it floats; else it paddles with its walk.
      play(s, art, art.z.anims.swim ? 'swim' : vx ? 'walk' : 'idle');
      return;
    }
    if (onFloor) {
      this.dive = null;
      // Crouching before a hop: still until it springs.
      if (scene.time.now < (this.crouchUntil || 0)) {
        s.setVelocityX(0);
        return;
      }
      // Water just ahead, off this bank: a little leap, diving in.
      if (dir && art.z.anims.dive && scene.isWaterAt(s.x + dir * TILE * 0.7, s.y + 8)
        && !scene.isWaterAt(s.x, s.y + 8)) {
        s.setVelocityY(-HOP * DIVE_HOP);
        this.dive = 'air';
        play(s, art, 'dive');
        // Its launch played out by the top of the hop.
        s.anims.timeScale = Phaser.Math.Clamp(this.phaseTime('start') / (HOP * DIVE_HOP / scene.physics.world.gravity.y), 0.5, 4);
        return;
      }
      // A step in the way, or she's well above it: hop.
      if ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right) || p.y < s.y - TILE * 1.2) {
        play(s, art, 'jump');
        // Its crouch on the ground first (Sofia), then the hop.
        const wait = crouchTime(art);
        if (!wait) {
          s.setVelocityY(-HOP);
          return;
        }
        s.setVelocityX(0);
        this.crouchUntil = scene.time.now + wait;
        scene.time.delayedCall(wait, () => { if (s.active) s.setVelocity(vx, -HOP); });
        return;
      }
      // Following her it rolls (the user, 2026-10-26: "My shaan should be
      // rolling behind me"): curled up while it moves, uncurling only once
      // it has stopped a moment (so a pause in her step doesn't uncurl it).
      if (vx) this.movedAt = scene.time.now;
      const rolling = vx || scene.time.now - (this.movedAt || 0) < UNCURL_AFTER;
      play(s, art, !rolling ? 'idle' : art.z.anims.run ? 'run' : 'walk');
      return;
    }
    // In the air: falling toward water dives in; otherwise it's a jump.
    if (!this.dive && art.z.anims.dive && vy > 0 && scene.isWaterAt(s.x, s.y + TILE)) {
      this.dive = 'air';
      play(s, art, 'dive');
    }
    if (!this.dive) {
      play(s, art, 'jump');
      return;
    }
    // Diving: once it's coming down over the water it tips nose down,
    // paced so the tip is done just as its feet reach the surface.
    if (this.dive === 'air' && vy > 0 && surface !== null && surface > s.y) {
      const g = scene.physics.world.gravity.y;
      const fall = (-vy + Math.sqrt(vy * vy + 2 * g * (surface - s.y))) / g;
      this.phase('tip', fall);
    }
  }

  // How long a dive phase takes at its own speed, seconds.
  phaseTime(name) {
    const a = this.art.z.anims.dive;
    const r = name === 'start' ? a.start : a[name];
    return r ? (Math.abs(r[1] - r[0]) + 1) / (a.fps || 17) : 0;
  }

  // The water's surface under x, or null.
  surfaceAt(x) {
    const rows = this.scene.surfaceRow;
    const c = Math.floor(x / TILE);
    return rows && rows[c] !== undefined ? rows[c] * TILE : null;
  }

  // One of the dive's own phases (`tip`, `level`), played once; in `time`
  // seconds if given (sped up or slowed to fit), else at its own speed.
  phase(name, time) {
    const s = this.sprite;
    this.dive = name;
    s.zAnim = `dive-${name}`;
    s.anims.chain();
    s.play(`${this.art.name}-z-dive-${name}`);
    s.anims.timeScale = time ? Phaser.Math.Clamp(this.phaseTime(name) / time, 0.5, 4) : 1;
  }

  // The phase playing has played out.
  played() {
    const s = this.sprite;
    return !s.anims.isPlaying || s.anims.getProgress() >= 1;
  }
}
