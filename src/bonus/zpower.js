// A Z meter room (`zmeter: '<name>'` in data/bonusRooms.js; Surf and Slope
// first, the user, 2026-11-17). Everything the meter adds to BonusRoom.js
// lives here; the scene calls in at a few hooks (build, buildHud, collide,
// step, update, medal, respawn).
//
// The rules (decided by the user, docs/bonus-level-ideas.md):
// - Food (the area's fruit, grubberries for Shaan) charges the meter, one
//   segment per BERRIES_PER_SEGMENT, and scores 1 each. No coins.
// - Rock blockers stand across the path on land. Wrecking Ball is automatic:
//   hitting a cracked blocker with a full segment smashes it and spends that
//   segment. Short of a segment he bounces off, and a little trail of
//   grubberries pops out behind him so nobody gets stuck.
// - Reinforced blockers (and the massive wall at the end) only break to the
//   big blast: with a full meter, hold X, K or F (or the touch button) and he
//   spins up in place, Sonic style; let go and he blasts forward. It always
//   fires; a full charge goes farther and faster, shakes harder and adds +1
//   Z-bolt for each reinforced blocker it breaks (provisional size).
// - Z-bolts wait inside the blockers and score 10 each.
// - Score = grubberries + 10 x Z-bolts. Gold at 90% of the room's most,
//   silver at 60%, bronze for finishing. Time isn't scored.
// - Fall through a gap and he's put back on the last ground he stood on.

import { ZMeter, SEGMENTS } from '../zmeter.js?v=7b2df1b';
import { texKey } from '../data/artsets.js?v=7b2df1b';
import { MAP_W, MAP_H } from '../data/world.js?v=7b2df1b';
import { tierInfo } from '../paws.js?v=7b2df1b';
import { audio } from '../audio.js?v=7b2df1b';
import { COLORS, heading, text } from '../theme.js?v=7b2df1b';
import { TOUCH_ONLY } from '../touch.js?v=7b2df1b';

export const BERRIES_PER_SEGMENT = 8;     // provisional (the user didn't change it)
const CHARGE_MS = 1200;                   // hold this long for a full charge
const BLAST_SPEED = 22;                   // px a step, plus up to BLAST_EXTRA at full charge
const BLAST_EXTRA = 8;
const BLAST_MS = 350;                     // plus up to BLAST_EXTRA_MS at full charge
const BLAST_EXTRA_MS = 850;
const FULL_BONUS = 1;                     // Z-bolts added per reinforced blocker a full charge breaks
const KINDS = {
  cracked: { w: 96, h: 300, shade: 0 },
  reinforced: { w: 128, h: 360, shade: 0.25 },
  wall: { w: 210, h: 780, shade: 0.3 },
};
const Matter = () => Phaser.Physics.Matter.Matter;

// (The same as BonusRoom.js's: the top curve's height at x.)
function surfaceY(curve, x) {
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i];
    const [x1, y1] = curve[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return curve[curve.length - 1][1];
}

export function reset(scene) {
  scene.zp = {
    berries: [], bolts: [], blockers: [],
    berriesGot: 0, boltsGot: 0, bonusBolts: 0,
    berryTotal: 0, boltTotal: 0,
    charging: false, chargeAt: 0, charge: 0,
    blastUntil: 0, blastDir: 1, blastSpeed: 0, fullBlast: false,
    facing: 1, holdBlast: false, toldAt: 0, lastIsl: null, sparkAt: 0, trailAt: 0,
  };
}

const food = (scene, set) => {
  const k = set.food && texKey(scene.room.artset, set.food);
  return k && scene.textures.exists(k) ? k : 'zpaw';
};

// The room's pieces: grubberries, blockers (with their Z-bolts), the dark
// pools' shade and the currents' streaks, the optional geysers' hints.
export function build(scene, set) {
  const zp = scene.zp;
  const room = scene.room;
  const islandY = (on, x) => surfaceY(scene.islands[on].curve, x);
  zp.foodKey = food(scene, set);
  // Grubberries, laid out like coins (`along`, `line`, `arc`, `points`).
  const spots = [];
  (room.berries || []).forEach((c) => {
    if (c.points) { c.points.forEach((p) => spots.push(p.slice())); return; }
    for (let i = 0; i < c.n; i++) {
      const t = c.n === 1 ? 0.5 : i / (c.n - 1);
      if (c.arc) {
        const [ax, ay, bx, by] = c.arc;
        spots.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(Math.PI * t) * c.peak]);
      } else if (c.line) {
        const [ax, ay, bx, by] = c.line;
        spots.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      } else {
        const x = c.from + (c.to - c.from) * t;
        spots.push([x, islandY(c.along, x) - 70]);
      }
    }
  });
  zp.berries = spots.map(([x, y], i) => berry(scene, x, y, i));
  zp.berryTotal = zp.berries.length;
  // Blockers.
  zp.blockers = (room.blockers || []).map((bd, i) => blocker(scene, set, bd, i, islandY(bd.on, bd.x)));
  zp.boltTotal = zp.blockers.reduce((n, b) => n + b.bolts.length, 0);
  // Pools: the deep one darker; currents streak.
  (scene.pools || []).forEach((p) => {
    if (p.dark) scene.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x04182c, 0.45).setDepth(1.55);
    if (p.current) {
      for (let k = 0; k < Math.floor(p.w / 160); k++) {
        const y = p.y + 50 + ((k * 97) % Math.max(60, p.h - 100));
        const s = scene.add.rectangle(p.x + 40 + ((k * 211) % (p.w - 80)), y, 46, 4, 0xe9fbff, 0.55).setDepth(1.7);
        scene.tweens.add({ targets: s, x: s.x + 160, alpha: 0, duration: 900, repeat: -1, delay: (k * 130) % 900 });
      }
    }
  });
  // Optional geysers: an up arrow over each (jump on it to ride it up).
  (scene.geysers || []).filter((g) => g.optional).forEach((g) => {
    const t = scene.add.text(g.x, g.y - 110, '↑', heading(44, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 9 }))
      .setOrigin(0.5).setDepth(8);
    scene.tweens.add({ targets: t, y: t.y - 16, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  });
}

function berry(scene, x, y, i, extra = false) {
  const s = scene.add.image(x, y, scene.zp.foodKey).setDepth(4).setScale(1.2);
  s.bob = scene.tweens.add({ targets: s, y: y - 8, duration: 600, yoyo: true, repeat: -1, delay: (i % 7) * 80, ease: 'Sine.InOut' });
  s.extra = extra;
  return s;
}

function blocker(scene, set, bd, i, groundY) {
  const kind = KINDS[bd.kind] || KINDS.cracked;
  const { w, h } = kind;
  const key = `zp-block-${scene.levelId}-${i}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w + 12, h + 12);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const r = Math.min(26, w / 3);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(6 + r, 6); ctx.lineTo(6 + w - r, 6); ctx.quadraticCurveTo(6 + w, 6, 6 + w, 6 + r);
    ctx.lineTo(6 + w, 6 + h); ctx.lineTo(6, 6 + h); ctx.lineTo(6, 6 + r); ctx.quadraticCurveTo(6, 6, 6 + r, 6);
    ctx.closePath();
  };
  const skin = set.skin || {};
  const rk = texKey(scene.room.artset, skin.rock || 'sk_rock.png');
  shape();
  if (scene.textures.exists(rk)) {
    const pat = ctx.createPattern(scene.textures.get(rk).getSourceImage(), 'repeat');
    pat.setTransform(new DOMMatrix().translate(i * 61, i * 37));
    ctx.fillStyle = pat;
  } else ctx.fillStyle = '#8a7a63';
  ctx.fill();
  ctx.fillStyle = `rgba(30,18,10,${0.2 + kind.shade})`;
  ctx.fill();
  ctx.strokeStyle = '#1b120b';
  ctx.lineJoin = 'round';
  if (bd.kind === 'cracked' || bd.kind === 'wall') {
    // cracks: jagged lines down the face
    ctx.lineWidth = 4;
    for (let k = 0; k < (bd.kind === 'wall' ? 7 : 3); k++) {
      let x = 6 + w * (0.2 + 0.6 * ((k * 0.37) % 1)), y = 6 + h * (0.1 + 0.12 * k) % h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += (s % 2 ? 14 : -14); y += h * 0.07; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  if (bd.kind !== 'cracked') {
    // reinforced: bands of dark stone, studded (a stand-in until Chris draws it)
    const bands = bd.kind === 'wall' ? 6 : 3;
    for (let k = 0; k < bands; k++) {
      const y = 6 + h * ((k + 0.6) / (bands + 0.4));
      ctx.fillStyle = '#3a2a1e';
      ctx.fillRect(6, y - 10, w, 20);
      ctx.fillStyle = '#c9a46a';
      for (let x = 18; x < w; x += 28) ctx.fillRect(6 + x - 3, y - 3, 6, 6);
    }
  }
  shape();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgb(44,38,56)';
  ctx.stroke();
  tex.refresh();
  const x = bd.x;
  const y = groundY + 14 - h / 2;
  const sprite = scene.add.image(x, y, key).setDepth(3.2);
  const body = scene.matter.add.rectangle(x, y, w, h, { isStatic: true, friction: 0.3, label: 'blocker' });
  const b = { ...bd, w, h, y, sprite, body, broken: false, bolts: [], popped: [] };
  body.blocker = b;
  // Its Z-bolts: hidden inside until it breaks, then out along the ground ahead.
  const isl = scene.islands[bd.on];
  for (let k = 0; k < (bd.bolts || 0); k++) {
    const tx = x + w / 2 + 200 + k * 80;
    const ti = tx <= isl.right ? isl : scene.islandAt(tx, groundY) || isl;
    const ty = surfaceY(ti.curve, Math.min(tx, ti.right)) - 80;
    const bolt = scene.add.image(x, y, 'zbolt').setDepth(4.1).setScale(1.6).setVisible(false);
    bolt.hidden = true;
    bolt.to = [tx, ty];
    b.bolts.push(bolt);
    scene.zp.bolts.push(bolt);
  }
  // A label over the reinforced ones: what they need.
  if (bd.kind !== 'cracked') {
    b.tag = scene.add.text(x, y - h / 2 - 34, bd.kind === 'wall' ? 'Hold X to blast!' : 'Big blast!', heading(22, '#ffffff', {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0.5).setDepth(8);
  }
  return b;
}

export function buildHud(scene) {
  const zp = scene.zp;
  zp.meter = new ZMeter(scene, 8, 4, scene.room.zmeter);
  // Counters, top right: grubberries, Z-bolts, the score.
  const row = (y, key, w) => scene.add.image(MAP_W - 230, y, key).setScrollFactor(0).setDepth(21).setDisplaySize(w, w * 1.0);
  scene.add.image(MAP_W - 230, 36, zp.foodKey).setScrollFactor(0).setDepth(21).setScale(1.3);
  zp.berryText = scene.add.text(MAP_W - 200, 36, '0', heading(26, '#ffffff', { stroke: COLORS.inkCss, strokeThickness: 6 }))
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
  row(80, 'zbolt', 36).setScale(1.1);
  zp.boltText = scene.add.text(MAP_W - 200, 80, '0', heading(26, '#ffffff', { stroke: COLORS.inkCss, strokeThickness: 6 }))
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
  zp.scoreText = scene.add.text(MAP_W - 130, 58, 'Score 0', heading(24, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 6 }))
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
  // The big blast's touch button (hold it), beside the jump button with the
  // other rooms' power buttons (2026-11-20; it was under the meter's right
  // end, too far from a thumb on a phone).
  const btn = scene.add.image(MAP_W - 210, MAP_H - 80, 'btn-power').setScale(0.8).setTint(0xffc93c)
    .setScrollFactor(0).setDepth(21).setAlpha(0.65).setInteractive();
  btn.on('pointerdown', () => { scene.touch.blast = true; });
  const up = () => { scene.touch.blast = false; };
  btn.on('pointerup', up);
  btn.on('pointerout', up);
  zp.btn = btn;
  zp.btnLabel = scene.add.text(MAP_W - 210, MAP_H - 30, 'Hold X · K · F', text(15, '#ffffff', {
    backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
  })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21).setAlpha(0.4).setVisible(!TOUCH_ONLY);
}

function score(zp) {
  return zp.berriesGot + 10 * (zp.boltsGot + zp.bonusBolts);
}
export function maxScore(zp) {
  return zp.berryTotal + 10 * zp.boltTotal;
}
function refresh(zp) {
  zp.berryText.setText(String(zp.berriesGot));
  zp.boltText.setText(String(zp.boltsGot + zp.bonusBolts));
  zp.scoreText.setText(`Score ${score(zp)}`);
}

// A contact between him and a blocker. True if it was one (handled).
export function collide(scene, pair) {
  const bl = pair.bodyA.blocker || pair.bodyB.blocker;
  const ball = pair.bodyA === scene.ball || pair.bodyB === scene.ball;
  if (!bl || !ball) return !!bl;
  if (bl.broken) { pair.isActive = false; return true; }
  const zp = scene.zp;
  const m = zp.meter;
  const blasting = scene.time.now < zp.blastUntil;
  if (blasting) {
    pair.isActive = false;
    smash(scene, bl, zp.fullBlast);
    return true;
  }
  if (bl.kind === 'cracked' && m.fill >= 1 - 1e-6) {
    pair.isActive = false;
    m.fill = Math.max(0, m.fill - 1);
    smash(scene, bl, false);
    scene.floatText(bl.x, bl.y - bl.h / 2 - 30, 'Wrecking Ball!');
    return true;
  }
  // Not enough: bounce off, and (on the main line) a trail of grubberries
  // pops out behind him, enough to charge what it needs.
  const need = bl.kind === 'cracked' ? 1 : SEGMENTS;
  const now = scene.time.now;
  if (now > zp.toldAt + 900) {
    zp.toldAt = now;
    scene.floatText(bl.x, bl.y - bl.h / 2 - 30, bl.kind === 'cracked' ? 'Fill a segment!' : m.full ? 'Hold X to blast!' : 'Fill the Z meter!');
  }
  const live = bl.popped.filter((s) => !s.got).length;
  const short = Math.ceil((need - m.fill) * BERRIES_PER_SEGMENT - 1e-6);
  const main = bl.kind !== 'reinforced';
  if (main && short > 0 && live < short) popBerries(scene, bl, short - live);
  return true;
}

function popBerries(scene, bl, n) {
  const zp = scene.zp;
  const isl = scene.islands[bl.on];
  for (let k = 0; k < n; k++) {
    const tx = Math.max(isl.left + 40, bl.x - bl.w / 2 - 260 - k * 64);
    const ty = surfaceY(isl.curve, tx) - 70;
    const s = berry(scene, bl.x - bl.w / 2, bl.y, k, true);
    s.bob.stop();
    scene.tweens.add({
      targets: s, x: tx, y: ty, duration: 420, delay: k * 50, ease: 'Back.Out',
      onComplete: () => { if (!s.got) s.bob = scene.tweens.add({ targets: s, y: ty - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); },
    });
    zp.berries.push(s);
    bl.popped.push(s);
  }
}

function smash(scene, bl, full) {
  bl.broken = true;
  bl.body.isSensor = true;
  scene.time.delayedCall(0, () => scene.matter.world.remove(bl.body));
  bl.sprite.setVisible(false);
  if (bl.tag) bl.tag.destroy();
  audio.sfx(scene, 'crate');
  const big = bl.kind !== 'cracked';
  scene.cameras.main.shake(big ? (full ? 420 : 260) : 140, big ? (full ? 0.02 : 0.012) : 0.006);
  for (let k = 0; k < (big ? 18 : 10); k++) {
    const a = -Math.PI * (0.05 + 0.9 * Math.random());
    const chunk = scene.add.circle(bl.x, bl.y + (Math.random() - 0.5) * bl.h * 0.7, 8 + Math.random() * (big ? 18 : 10), 0x8a7a63)
      .setStrokeStyle(3, COLORS.ink).setDepth(4);
    const d = (big ? 260 : 160) * (1 + Math.random());
    scene.tweens.add({
      targets: chunk, x: chunk.x + Math.cos(a) * d * 2, y: chunk.y + Math.sin(a) * d + 300, alpha: 0, angle: 360,
      duration: 700 + Math.random() * 400, ease: 'Quad.In', onComplete: () => chunk.destroy(),
    });
  }
  bl.bolts.forEach((bolt, k) => {
    bolt.setVisible(true);
    bolt.hidden = false;
    scene.tweens.add({ targets: bolt, x: bolt.to[0], y: bolt.to[1], duration: 300, delay: k * 50, ease: 'Back.Out' });
  });
  if (full && big) {
    scene.zp.bonusBolts += FULL_BONUS;
    refresh(scene.zp);
    scene.floatText(bl.x, bl.y - bl.h / 2 - 70, `+${FULL_BONUS} Z-bolt!`);
  }
}

// Once a physics step. True if it moved him (the scene's own rolling is skipped).
export function step(scene, time, dir, grounded) {
  const zp = scene.zp;
  const M = Matter();
  const b = scene.ball;
  const m = zp.meter;
  if (dir) zp.facing = dir;
  if (grounded) {
    const isl = scene.islandAt(b.position.x, b.position.y);
    if (isl) zp.lastIsl = isl;
  }
  // The blast: along the ground at blast speed the way he was facing.
  if (time < zp.blastUntil) {
    const a = grounded ? scene.slopeAt(b.position.x, b.position.y + 38) : null;
    const v = zp.blastSpeed;
    if (a !== null && Math.abs(a) < 0.9) M.Body.setVelocity(b, { x: zp.blastDir * v * Math.cos(a), y: zp.blastDir * v * Math.sin(a) });
    else M.Body.setVelocity(b, { x: zp.blastDir * v, y: Math.min(b.velocity.y, 24) });
    M.Body.setAngularVelocity(b, zp.blastDir * 0.6);
    return true;
  }
  // Charging: held still, spinning up (it fires on release, however short).
  if (zp.holdBlast && m.full && grounded && !zp.charging) {
    zp.charging = true;
    zp.chargeAt = time;
    audio.sfx(scene, 'toss');
  }
  if (zp.charging) {
    zp.charge = Math.min(1, (time - zp.chargeAt) / CHARGE_MS);
    m.charge = zp.charge;
    M.Body.setVelocity(b, { x: b.velocity.x * 0.7, y: b.velocity.y });
    M.Body.setAngularVelocity(b, zp.facing * (0.3 + 0.6 * zp.charge));
    if (zp.charge >= 1 && !zp.maxSaid) { zp.maxSaid = true; scene.floatText(b.position.x, b.position.y - 90, 'MAX!'); audio.sfx(scene, 'correct'); }
    if (!zp.holdBlast) {
      // Let go: blast.
      zp.charging = false;
      zp.maxSaid = false;
      zp.fullBlast = zp.charge >= 1;
      zp.blastDir = zp.facing;
      zp.blastSpeed = BLAST_SPEED + BLAST_EXTRA * zp.charge;
      zp.blastUntil = time + BLAST_MS + BLAST_EXTRA_MS * zp.charge;
      m.fill = 0;
      m.charge = 0;
      scene.cameras.main.shake(zp.fullBlast ? 300 : 160, zp.fullBlast ? 0.012 : 0.006);
      scene.floatText(b.position.x, b.position.y - 90, zp.fullBlast ? 'Super Wrecking Ball!' : 'Wrecking Ball!');
      audio.sfx(scene, 'splash');
    }
    return true;
  }
  return false;
}

// Every frame: the blast key, pickups, the meter, the effects.
export function update(scene, time, delta) {
  const zp = scene.zp;
  const k = scene.keys;
  const b = scene.ball;
  const m = zp.meter;
  zp.holdBlast = k.X.isDown || k.K.isDown || k.F.isDown || !!scene.touch.blast;
  if (zp.holdBlast && !m.full && !zp.charging && time > zp.toldAt + 1200 && (Phaser.Input.Keyboard.JustDown(k.X) || Phaser.Input.Keyboard.JustDown(k.K) || Phaser.Input.Keyboard.JustDown(k.F))) {
    zp.toldAt = time;
    scene.floatText(b.position.x, b.position.y - 90, 'Fill the Z meter first!');
  }
  // Pickups.
  const near = (s, r) => !s.got && !s.hidden && Math.abs(s.x - b.position.x) < r && Math.abs(s.y - b.position.y) < r;
  zp.berries.forEach((s) => {
    if (!near(s, 38 + 26)) return;
    s.got = true;
    zp.berriesGot += 1;
    m.fill = Math.min(SEGMENTS, m.fill + 1 / BERRIES_PER_SEGMENT);
    audio.sfx(scene, 'food');
    scene.tweens.killTweensOf(s);
    scene.tweens.add({ targets: s, y: s.y - 40, alpha: 0, scale: 1.8, duration: 260, onComplete: () => s.destroy() });
    refresh(zp);
  });
  zp.bolts.forEach((s) => {
    if (!near(s, 38 + 30)) return;
    s.got = true;
    zp.boltsGot += 1;
    audio.sfx(scene, 'correct');
    scene.tweens.killTweensOf(s);
    scene.tweens.add({ targets: s, y: s.y - 60, alpha: 0, duration: 340, onComplete: () => s.destroy() });
    scene.floatText(s.x, s.y - 40, '+10');
    refresh(zp);
  });
  m.update(time);
  zp.btn.setAlpha(m.full ? 1 : 0.65);
  zp.btnLabel.setAlpha(m.full ? 1 : 0.4);
  // Charging: he spins fast in place, sparks round him. Blasting: a trail.
  const s = scene.shaan;
  if (zp.charging) {
    s.anims.timeScale = 2 + 3 * zp.charge;
    if (time - zp.sparkAt > 50) {
      zp.sparkAt = time;
      const a = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 20;
      const sp = scene.add.star(b.position.x + Math.cos(a) * r, b.position.y + Math.sin(a) * r, 4, 3, 9,
        zp.charge >= 1 ? 0xffffff : 0xffe600).setStrokeStyle(2, COLORS.ink).setDepth(6);
      scene.tweens.add({ targets: sp, x: b.position.x, y: b.position.y, scale: 0.2, duration: 260, onComplete: () => sp.destroy() });
    }
  }
  if (time < zp.blastUntil && time - zp.trailAt > 40) {
    zp.trailAt = time;
    const ghost = scene.add.sprite(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setDepth(s.depth - 0.1).setAlpha(0.6)
      .setTint(zp.fullBlast ? 0xfff27a : 0x9be2ff);
    scene.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
  }
}

// Through the door: the medal by score (gold 90% of the most, silver 60%).
export function medal(scene) {
  const zp = scene.zp;
  const max = maxScore(zp);
  const sc = score(zp);
  const tier = sc >= 0.9 * max ? 3 : sc >= 0.6 * max ? 2 : 1;
  return { ...tierInfo(tier), score: sc, max };
}

export function scoreLine(scene) {
  const zp = scene.zp;
  return `Grubberries ${zp.berriesGot}   ·   Z-bolts ${zp.boltsGot + zp.bonusBolts}`;
}

export function scoreRow(scene, med) {
  const max = maxScore(scene.zp);
  return {
    label: `Score ${med.score}`,
    detail: `${med.name}   (gold ${Math.ceil(0.9 * max)}, silver ${Math.ceil(0.6 * max)})`,
  };
}

// Fell through a gap: back on the last ground he stood on, near its end
// and clear of blockers; nothing lost.
export function respawn(scene) {
  const zp = scene.zp;
  const M = Matter();
  const b = scene.ball;
  const isl = zp.lastIsl || scene.islands[0];
  let nx = Math.max(isl.left + 80, isl.right - 600);
  zp.blockers.forEach((bl) => {
    if (!bl.broken && bl.on === scene.islands.indexOf(isl) && Math.abs(bl.x - nx) < 260) nx = Math.max(isl.left + 80, bl.x - bl.w / 2 - 300);
  });
  const y = surfaceY(isl.curve, nx) - 38 - 6;
  M.Body.setPosition(b, { x: nx, y });
  M.Body.setVelocity(b, { x: 0, y: 0 });
  zp.blastUntil = 0;
  zp.charging = false;
  scene.jumping = false;
  scene.cameras.main.flash(250, 255, 255, 255);
  scene.floatText(nx, y - 120, 'Whoops! Go again!');
  audio.sfx(scene, 'splash');
}
