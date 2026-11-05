// Moving progress to another device without accounts: a QR code, or a
// save file emailed to a grown-up. Nothing is sent to us; the link, QR code
// or file carries the progress itself.
//
// Save link: the game's address with ?save=<about 40 letters>. The letters
// are the save packed into bytes: a version, one byte per level (cleared,
// bonus level door, which of the five crates, every Zebonky tamed), where
// the player stands, every question answered right (one bit per question of
// each biome's bank, for each difficulty), the Z paw prints (only the levels
// that have any: which ZEBONKY letters are found, which paws are earned and
// the best level and bonus room times, for each difficulty), and a check
// byte, so a damaged link is refused rather than loaded wrong. The QR code is
// this link.
//
// Save file: the whole save, exactly, as a small JSON file. Email sends it
// with the device's share sheet (file attached) where it can, or opens the
// email app with the save link in the message and downloads the file.
//
// Change VERSION whenever LEVELS changes (levels added, removed or
// reordered), or when more is packed in (the shop): old links then say so
// instead of loading the wrong levels.

import { LEVELS, PATHS, START_NODE, PLAY_BIOMES } from './data/world.js?v=f7f47c2';
import { state, pathKey } from './state.js?v=f7f47c2';
import { bankFor, questionKey } from './data/questions.js?v=f7f47c2';
import { LETTERS, FLAG_KEYS } from './paws.js?v=f7f47c2';

// 3 added the answered questions; 4 the currency and its level rewards
// (the user, 2026-10-30); 5 Z paw prints in their place (2026-11-05: no
// currency, two time tiers per level). Version 2 to 4 links still load
// (4's rewards as paws, its currency dropped).
const VERSION = 5;
// Version 4's reward bits, in its order.
const V4_KEYS = ['letters', 'nodamage', 'fed', 'questions', 'bonus', 'secret'];
const BANDS = ['junior', 'explorer', 'pioneer'];
const FILE_TAG = 'zebonky-treasure-map-storm';
const FILE_NAME = 'zebonky-treasure-map-save.json';
const ORDER = Object.keys(LEVELS);

// ---------- packing a save into a short link ----------

function levelByte(data, id) {
  const c = data.cleared[id] || {};
  const got = data.treasure[id] || [];
  let b = (c.normal ? 1 : 0) | (c.secret ? 2 : 0);
  LEVELS[id].items.forEach((it, i) => { if (got.includes(it.id)) b |= 4 << i; });
  if (data.tamed && data.tamed[id]) b |= 128;
  return b;
}

function check(bytes) {
  let c = 17;
  bytes.forEach((b, i) => { c = (c * 31 + b + i * 7) % 251; });
  return c;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toB64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    const k = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < k; j++) out += B64[(n >> (18 - 6 * j)) & 63];
  }
  return out;
}

function fromB64(s) {
  const vals = [...s].map((ch) => B64.indexOf(ch));
  if (vals.some((v) => v < 0)) return null;
  const bytes = [];
  for (let i = 0; i < vals.length; i += 4) {
    const chunk = vals.slice(i, i + 4);
    const n = chunk.reduce((acc, v, j) => acc | (v << (18 - 6 * j)), 0);
    const k = Math.floor((chunk.length * 6) / 8);
    for (let j = 0; j < k; j++) bytes.push((n >> (16 - 8 * j)) & 255);
  }
  return bytes;
}

// The byte for where she stands also carries the difficulty in its top two
// bits (0 is Explorer, so links made before the slider still load as
// Explorer). There are far fewer than 64 map nodes.
const DIFF_CODE = { explorer: 0, junior: 1, pioneer: 2 };
const DIFF_OF = ['explorer', 'junior', 'pioneer', 'explorer'];

// The answered questions as bits: each band, each playable biome, one bit per
// question of its bank in bank order.
function answeredBytes(data) {
  const bits = [];
  BANDS.forEach((band) => PLAY_BIOMES.forEach((b) => {
    const have = new Set(((data.answered || {})[band] || {})[b] || []);
    bankFor(b, band).forEach((q) => bits.push(have.has(questionKey(q)) ? 1 : 0));
  }));
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(bits.slice(i, i + 8).reduce((n, bit, j) => n | (bit << j), 0));
  }
  return bytes;
}

function readAnswered(bytes) {
  const answered = {};
  let i = 0;
  BANDS.forEach((band) => PLAY_BIOMES.forEach((b) => {
    const keys = bankFor(b, band).filter(() => {
      const on = (bytes[i >> 3] >> (i & 7)) & 1;
      i += 1;
      return on;
    }).map(questionKey);
    if (keys.length) answered[band] = { ...(answered[band] || {}), [b]: keys };
  }));
  return answered;
}

// For each difficulty, a count and then for each level with anything in
// it: its index, its letters (one bit each, in ZEBONKY order), its paw flags
// (one bit each, in FLAG_KEYS order) and its time tiers (level time in the
// low two bits, bonus room time in the next two).
function rewardBytes(data) {
  const out = [];
  BANDS.forEach((band) => {
    const recs = (data.rewardsBy || {})[band] || {};
    const rows = [];
    ORDER.forEach((id, i) => {
      const r = recs[id];
      if (!r) return;
      const paid = r.paid || {};
      let lb = 0;
      LETTERS.split('').forEach((ch, k) => { if ((r.letters || []).includes(ch)) lb |= 1 << k; });
      let fb = 0;
      FLAG_KEYS.forEach((key, k) => { if (paid[key] || (key === 'fed' && paid.tamed)) fb |= 1 << k; });
      const tb = (Math.min(3, paid.time || 0) & 3) | ((Math.min(3, paid.bonusTime || 0) & 3) << 2);
      if (lb || fb || tb) rows.push(i, lb, fb, tb);
    });
    out.push(rows.length / 4, ...rows);
  });
  return out;
}

// Reads rewardBytes back from bytes[at]; returns { rewardsBy, end } or null.
// A version 4 link has the currency first (skipped) and three bytes a row.
function readRewards(bytes, at, version) {
  let i = at;
  const take = () => (i < bytes.length ? bytes[i++] : -1);
  if (version === 4 && (take() < 0 || take() < 0)) return null;
  const rewardsBy = {};
  for (const band of BANDS) {
    const n = take();
    if (n < 0) return null;
    for (let k = 0; k < n; k++) {
      const li = take();
      const lb = take();
      const fb = take();
      const tb = version === 4 ? 0 : take();
      if (fb < 0 || tb < 0 || !ORDER[li]) return null;
      const letters = LETTERS.split('').filter((ch, j) => lb & (1 << j));
      const paid = {};
      (version === 4 ? V4_KEYS : FLAG_KEYS).forEach((key, j) => { if (fb & (1 << j) && key !== 'secret') paid[key] = true; });
      if (tb & 3) paid.time = tb & 3;
      if ((tb >> 2) & 3) paid.bonusTime = (tb >> 2) & 3;
      rewardsBy[band] = { ...(rewardsBy[band] || {}), [ORDER[li]]: { letters, paid } };
    }
  }
  return { rewardsBy, end: i };
}

export function packSave(data = state.data) {
  const at = Math.max(0, ORDER.indexOf(data.at)) | ((DIFF_CODE[data.difficulty] || 0) << 6);
  const bytes = [VERSION, ...ORDER.map((id) => levelByte(data, id)), at, ...answeredBytes(data), ...rewardBytes(data)];
  bytes.push(check(bytes));
  return toB64(bytes);
}

// Letters -> { ok: true, data } or { ok: false, reason }.
export function unpackSave(letters) {
  const bytes = letters && fromB64(String(letters));
  if (!bytes || bytes.length < 2) return { ok: false, reason: "That save link doesn't work." };
  if (![2, 3, 4, VERSION].includes(bytes[0])) return { ok: false, reason: 'That save is from another version of the game.' };
  const tally = bytes[0] === 2 ? 0 : answeredBytes(state.blank()).length;
  const cut = { ok: false, reason: "That save link doesn't work. It may have been cut short." };
  if (check(bytes.slice(0, -1)) !== bytes[bytes.length - 1]) return cut;
  let rewards = null;
  if (bytes[0] >= 4) {
    rewards = readRewards(bytes, 2 + ORDER.length + tally, bytes[0]);
    if (!rewards || rewards.end !== bytes.length - 1) return cut;
  } else if (bytes.length !== ORDER.length + 3 + tally) return cut;
  const data = state.blank();
  ORDER.forEach((id, i) => {
    const b = bytes[1 + i];
    if (b & 3) data.cleared[id] = { normal: !!(b & 1), secret: !!(b & 2) };
    const got = LEVELS[id].items.filter((it, k) => b & (4 << k)).map((it) => it.id);
    if (got.length) data.treasure[id] = got;
    if (b & 128) data.tamed[id] = true;
  });
  // Every path that's open has been seen and walked.
  const open = PATHS.filter((p) => {
    const c = data.cleared[p.from];
    return c && (p.exit === 'secret' ? c.secret : (c.normal || c.secret));
  }).map(pathKey);
  data.revealed = open;
  data.walked = open;
  data.at = ORDER[bytes[1 + ORDER.length] & 63] || START_NODE;
  data.difficulty = DIFF_OF[bytes[1 + ORDER.length] >> 6];
  if (tally) data.answered = readAnswered(bytes.slice(2 + ORDER.length, 2 + ORDER.length + tally));
  if (rewards) data.rewardsBy = rewards.rewardsBy;
  return { ok: true, data };
}

export function saveLink() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('save', packSave());
  return url.toString();
}

// A save link opened this page: unpack it, and take it out of the address
// so a reload doesn't load it again. The map asks before using it.
export function takeLinkSave() {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('save');
    if (!code) return null;
    url.searchParams.delete('save');
    window.history.replaceState(null, '', url.toString());
    return unpackSave(code);
  } catch (e) {
    return null;
  }
}

// ---------- QR code (vendor/qrcode.min.js) ----------

// The save link as a grid of dark (true) and light squares.
export function qrModules(link = saveLink()) {
  if (typeof window.qrcode !== 'function') return null;
  const qr = window.qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

// ---------- save file and email ----------

function saveFile() {
  const body = JSON.stringify({ game: FILE_TAG, version: 1, saved: new Date().toISOString(), data: state.data }, null, 1);
  return new File([body], FILE_NAME, { type: 'application/json' });
}

function download(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const EMAIL_SUBJECT = 'Treasure Map Storm save';
const emailBody = (link) => 'To carry on playing on another device, open this link there:\n'
  + `${link}\n\nOr open the game, tap Save, then Load a save file, and pick the attached file.\n`;

// Email the save to a grown-up. Returns 'shared', 'email' or 'cancelled'.
// Call straight from a tap: share sheets only open from one.
export async function emailSave() {
  const file = saveFile();
  const link = saveLink();
  const shareable = { files: [file], title: EMAIL_SUBJECT, text: emailBody(link) };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share(shareable);
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // Otherwise fall back to the email app.
    }
  }
  download(file);
  window.location.href = `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(emailBody(link))}`;
  return 'email';
}

// Opens the file picker; calls back with { ok, data } or { ok: false, reason }.
export function pickSaveFile(onLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    input.remove();
    if (!f) return;
    f.text().then((body) => {
      try {
        const saved = JSON.parse(body);
        const d = saved && saved.game === FILE_TAG && saved.data;
        if (!d || typeof d.cleared !== 'object' || typeof d.treasure !== 'object') throw new Error('shape');
        onLoaded({ ok: true, data: d });
      } catch (e) {
        onLoaded({ ok: false, reason: "That file isn't a Treasure Map Storm save." });
      }
    });
  });
  document.body.appendChild(input);
  input.click();
}
