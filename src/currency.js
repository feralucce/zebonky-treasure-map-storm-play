// Currency (a placeholder name, the user, 2026-10-29) and the level rewards
// that pay it. Kept in the save with the rest of the progress (and in save
// files; not yet in save links, see savecode.js).
//
// Each reward pays once per level per difficulty (Junior, Explorer and
// Pioneer keep their own), one currency each for now:
//   letters    every letter of ZEBONKY found in the level (letters stay found
//              between plays, so they can come back for the rest)
//   nodamage   through the level without taking damage
//   tamed      every wild Zebonky in the level tamed
//   questions  every question in the level answered (all its crates opened)
//   bonus      the bonus level played through
//   secret     the secret level played through (ready for when it exists)
// The level ending screen (scenes/LevelEnd.js) pays them.

import { state } from './state.js?v=f6eb36b';

export const LETTERS = 'ZEBONKY';
export const REWARD_EACH = 1;

export const REWARDS = [
  { key: 'letters', label: 'Every letter of ZEBONKY' },
  { key: 'nodamage', label: 'No damage taken' },
  { key: 'tamed', label: 'Every Zebonky tamed' },
  { key: 'questions', label: 'Every question answered' },
  { key: 'bonus', label: 'Bonus level' },
  { key: 'secret', label: 'Secret level' },
];

function band() {
  return state.difficulty().id;
}

// This level's record on the current difficulty: { letters: [...], paid: {...} }.
function rec(levelId) {
  const all = (state.data.rewardsBy = state.data.rewardsBy || {});
  const b = (all[band()] = all[band()] || {});
  return (b[levelId] = b[levelId] || { letters: [], paid: {} });
}

export function currency() {
  return state.data.currency || 0;
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

export function paid(levelId, key) {
  return !!rec(levelId).paid[key];
}

// The placeholder coin: a gold disc with a C, drawn once.
export function currencyIcon(scene) {
  const key = 'currency-coin';
  if (!scene.textures.exists(key)) {
    const D = 34;
    const tex = scene.textures.createCanvas(key, D, D);
    const ctx = tex.getContext();
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath(); ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath(); ctx.arc(D / 2, D / 2, D / 2 - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.font = '800 20px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', D / 2, D / 2 + 1);
    tex.refresh();
  }
  return key;
}

// Pays a reward if it hasn't been paid on this level and difficulty yet.
// True when it was paid just now.
export function award(levelId, key) {
  const r = rec(levelId);
  if (r.paid[key]) return false;
  r.paid[key] = true;
  state.data.currency = currency() + REWARD_EACH;
  state.save();
  return true;
}
