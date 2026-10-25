// The companion Zebonky in a level: the biome Zebonky the player earned
// (state.data.companion). FOR NOW it's the Zebonky's picture, small,
// rolling along behind her; its own animation strips come later.
// A new companion sparkles and fades in beside her; one she already has is
// simply there when the level starts.

import { BIOMES } from './data/world.js?v=6506ff3';

const TILE = 64;
const SIZE = 64;           // px tall on screen
const BEHIND = 76;         // how far behind her it keeps
const SPEED = 330;         // a little faster than she runs, to keep up
const HOP = 720;           // its jump, for steps and ledges
const TOO_FAR = TILE * 7;  // further than this (or fallen out): it pops back

export class Companion {
  constructor(scene, biome, arrive = false) {
    this.scene = scene;
    const z = BIOMES[biome] && BIOMES[biome].zebonky;
    const p = scene.player;
    const x = p.x - (p.flipX ? -BEHIND : BEHIND);
    const s = scene.physics.add.sprite(x, p.y - 20, `zebonky-${z.id}`);
    s.setScale(SIZE / s.height);
    // A round body, so it rolls over the ground.
    const r = (s.width * 0.42);
    s.body.setCircle(r, s.width / 2 - r, s.height - 2 * r);
    s.setDepth(-0.5);
    scene.physics.add.collider(s, scene.solids);
    scene.physics.add.collider(s, scene.platforms);
    this.sprite = s;
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
      const star = scene.add.star(s.x, s.y, 4, 3, 8, i % 2 ? 0xfff2a8 : 0xffffff).setDepth(9);
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
        s.setPosition(p.x - (p.flipX ? -BEHIND : BEHIND), p.y - 20).setVelocity(0, 0);
        this.sparkleIn();
      }
      return;
    }
    const target = p.x - (p.flipX ? -BEHIND : BEHIND);
    const dx = target - s.x;
    const vx = Math.abs(dx) < 10 ? 0 : Math.sign(dx) * Math.min(SPEED, Math.abs(dx) * 4);
    s.setVelocityX(vx);
    // The picture faces left: turned round to face the way she's going.
    if (Math.abs(p.body.velocity.x) > 20) s.setFlipX(p.body.velocity.x > 0);
    else if (vx) s.setFlipX(vx > 0);
    // In water it floats up and paddles across, hopping out at the bank.
    if (this.scene.isWaterAt(s.x, s.y)) {
      s.setVelocityY(Math.max(s.body.velocity.y - 40, -260));
      if ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right)) s.setVelocityY(-HOP);
      s.rotation += (s.body.velocity.x / 60) / (s.displayHeight / 2);
      return;
    }
    const onFloor = s.body.blocked.down || s.body.touching.down;
    // A step in the way, or she's well above it: hop.
    if (onFloor && ((vx < 0 && s.body.blocked.left) || (vx > 0 && s.body.blocked.right) || p.y < s.y - TILE * 1.2)) {
      s.setVelocityY(-HOP);
    }
    // Rolling: it turns as far as it travels.
    s.rotation += (s.body.velocity.x / 60) / (s.displayHeight / 2);
  }
}
