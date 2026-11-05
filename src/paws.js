// Z paw prints: what a level awards (the user, 2026-11-05, after the team
// meeting; they replace the placeholder currency). Kept in the save with the
// rest of the progress, per level per difficulty (Junior, Explorer and
// Pioneer keep their own).
//
// A level's paws:
//   time       bronze, silver or gold by the level's timer: 1, 2 or 3 paws
//              (bronze for finishing; gold and silver times in
//              data/levelTimes.js). A better time on a later play raises it.
//   letters    every letter of ZEBONKY found (letters stay found between
//              plays, so they can come back for the rest)
//   nodamage   through the level without taking damage
//   fed        every wild Zebonky in the level fed (feeding, not taming)
//   questions  every question in the level answered (all its crates opened)
//   bonus      the bonus level played through
// A bonus room has its own timer and score card: bronze, silver or gold,
// 1 to 3 paws (`bonusTime`, the room's `medalTimes` in data/bonusRooms.js).
//
// Paws are worked out from the record, never added up from play, so a
// replay can't farm them. The score cards are scenes/LevelEnd.js and
// BonusRoom.js endCard (pawCard below draws both).

import { state } from './state.js?v=f7f47c2';
import { COLORS, heading, text } from './theme.js?v=f7f47c2';
import { audio } from './audio.js?v=f7f47c2';

export const LETTERS = 'ZEBONKY';

export const TIERS = [
  { tier: 1, name: 'Bronze', color: 0xcd7f32 },
  { tier: 2, name: 'Silver', color: 0xc0c7cf },
  { tier: 3, name: 'Gold', color: 0xffc93c },
];

// The level's awards, in score card order. `max` paws each.
export const AWARDS = [
  { key: 'time', label: 'Time', max: 3 },
  { key: 'letters', label: 'Every letter of ZEBONKY', max: 1 },
  { key: 'nodamage', label: 'No damage taken', max: 1 },
  { key: 'fed', label: 'Every Zebonky fed', max: 1 },
  { key: 'questions', label: 'Every question answered', max: 1 },
  { key: 'bonus', label: 'Bonus level', max: 1 },
];
// Flags packed one bit each in save links (savecode.js), in this order.
export const FLAG_KEYS = ['letters', 'nodamage', 'fed', 'questions', 'bonus'];

function band() {
  return state.difficulty().id;
}

// Older saves: `tamed` is now `fed`, a coin-medal bonus is just played
// through, and the secret level (scratched) and currency are gone.
function tidy(r) {
  const p = r.paid;
  if (p.tamed) p.fed = true;
  delete p.tamed;
  if (p.bonus) p.bonus = true;
  delete p.secret;
  return r;
}

// This level's record on the current difficulty: { letters: [...], paid: {...} }.
function rec(levelId) {
  const all = (state.data.rewardsBy = state.data.rewardsBy || {});
  const b = (all[band()] = all[band()] || {});
  return tidy((b[levelId] = b[levelId] || { letters: [], paid: {} }));
}

export function lettersFound(levelId) {
  return rec(levelId).letters;
}

export function findLetter(levelId, ch) {
  const r = rec(levelId);
  if (!r.letters.includes(ch)) {
    r.letters.push(ch);
    state.save();
  }
}

export const allLetters = (levelId) => LETTERS.split('').every((ch) => lettersFound(levelId).includes(ch));

// Paws held for one award: 0 to its max (time and bonusTime are tiers).
export function held(levelId, key) {
  const v = rec(levelId).paid[key];
  return v === true ? 1 : v || 0;
}

// Earns an award: true for a flag, a tier (1-3) for a time. Keeps the best.
// Returns how many paws that added just now.
export function earn(levelId, key, value = true) {
  const r = rec(levelId);
  const had = held(levelId, key);
  const now = value === true ? 1 : value || 0;
  if (now <= had) return 0;
  r.paid[key] = value === true ? true : now;
  state.save();
  return now - had;
}

// Every paw on this difficulty, bonus rooms too (the map's count).
export function totalPaws() {
  const recs = (state.data.rewardsBy || {})[band()] || {};
  let n = 0;
  Object.values(recs).forEach((r) => {
    Object.entries(r.paid || {}).forEach(([k, v]) => {
      if (k === 'secret') return;
      n += v === true ? 1 : typeof v === 'number' ? (k === 'bonus' ? 1 : v) : 0;
    });
  });
  return n;
}

// A time's tier against { gold, silver } seconds: under gold is gold, under
// silver is silver, finishing at all is bronze.
export function timeTier(seconds, times) {
  const t = times || {};
  return seconds <= t.gold ? 3 : seconds <= t.silver ? 2 : 1;
}

export const tierInfo = (tier) => TIERS.find((m) => m.tier === tier);

// 83.4 -> "1:23.4"; a whole-second goal (45) -> "0:45"
export function clock(seconds) {
  const s = Math.max(0, seconds || 0);
  const m = Math.floor(s / 60);
  const whole = Number.isInteger(s);
  const rest = whole ? String(s - m * 60).padStart(2, '0') : (s - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${rest}`;
}

// The stand-in collectible in the bonus rooms (the user, 2026-11-05: "make
// a generic token", until the team decides what it is): a violet disc with a
// light ring and a dot. It pays nothing.
export function tokenIcon(scene) {
  const key = 'bonus-token';
  if (!scene.textures.exists(key)) {
    const D = 34;
    const tex = scene.textures.createCanvas(key, D, D);
    const ctx = tex.getContext();
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath(); ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9b7bd8';
    ctx.beginPath(); ctx.arc(D / 2, D / 2, D / 2 - 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e6dcff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(D / 2, D / 2, D / 2 - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e6dcff';
    ctx.beginPath(); ctx.arc(D / 2, D / 2, 3.5, 0, Math.PI * 2); ctx.fill();
    tex.refresh();
  }
  return key;
}

// The score card's paw rows: every paw the card can award drawn first as a
// shadow, then the earned ones pop into their shadows one at a time.
//   rows: [{ label, detail, max, got, fresh, none }]
//     got: paws held (filled), fresh: how many of them are new this play,
//     none: the level has nothing to earn here (greyed, no paw slots)
//   x, y, w: where the rows go; rowH: row height
//   onDone(total, possible) once the last paw has landed
// Returns { possible, total, height }.
export function pawCard(scene, rows, { x, y, w, rowH = 54, delay = 450, depth = 0, scroll = true, onDone } = {}) {
  const PAW = 38;
  const set = (o) => { if (depth) o.setDepth(depth); if (!scroll && o.setScrollFactor) o.setScrollFactor(0); return o; };
  const pops = [];
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    const box = set(scene.add.graphics());
    box.fillStyle(0xf8ecd0, 1);
    box.fillRoundedRect(x, ry - rowH / 2 + 4, w, rowH - 8, 12);
    box.lineStyle(2, COLORS.ink, r.none ? 0.3 : 1);
    box.strokeRoundedRect(x, ry - rowH / 2 + 4, w, rowH - 8, 12);
    set(scene.add.text(x + 20, ry, r.label, text(20, r.none ? '#a89670' : COLORS.inkCss)).setOrigin(0, 0.5));
    if (r.detail) set(scene.add.text(x + 20 + (r.detailAt || 250), ry, r.detail, heading(17, r.none ? '#a89670' : '#6b4a2e')).setOrigin(0, 0.5));
    if (r.none) {
      set(scene.add.text(x + w - 20, ry, 'None in this level', heading(16, '#a89670')).setOrigin(1, 0.5));
      return;
    }
    // Slots right to left from the edge, filled left to right.
    for (let k = 0; k < r.max; k++) {
      const px = x + w - 20 - PAW / 2 - (r.max - 1 - k) * (PAW + 6);
      set(scene.add.image(px, ry, 'zpaw').setDisplaySize(PAW, PAW * 1.2).setTint(0x2b1d12).setAlpha(0.22));
      if (k < r.got) pops.push({ px, ry, fresh: k >= r.got - (r.fresh || 0) });
    }
  });
  const possible = rows.reduce((n, r) => n + (r.none ? 0 : r.max), 0);
  pops.forEach((p, i) => {
    scene.time.delayedCall(delay + i * 260, () => {
      const paw = set(scene.add.image(p.px, p.ry, 'zpaw').setDisplaySize(PAW, PAW * 1.2));
      const sx = paw.scaleX;
      const sy = paw.scaleY;
      paw.setScale(0);
      scene.tweens.add({ targets: paw, scaleX: sx, scaleY: sy, duration: 260, ease: 'Back.Out' });
      if (p.fresh) {
        const ring = set(scene.add.circle(p.px, p.ry, PAW * 0.6, 0xffffff, 0).setStrokeStyle(4, 0xffc93c, 1));
        scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
      }
      audio.sfx(scene, p.fresh ? 'correct' : 'food');
      if (i === pops.length - 1 && onDone) onDone(pops.length, possible);
    });
  });
  if (!pops.length && onDone) scene.time.delayedCall(delay, () => onDone(0, possible));
  return { possible, total: pops.length, height: rows.length * rowH };
}
