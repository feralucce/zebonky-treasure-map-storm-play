// Game progress. Kept only in this browser (localStorage), never sent anywhere.
// Storage can be missing or blocked (private windows, previews), so every
// read and write is guarded and the game still runs without it.

import { LEVELS, PATHS, START_NODE, PLAY_BIOMES, biomeLevels } from './data/world.js?v=34131d3';
import { DEFAULT_DIFFICULTY, difficultyById } from './data/difficulty.js?v=34131d3';
import { DEFAULT_CHARACTER, characterById } from './data/characters.js?v=34131d3';
import { bankFor, questionKey } from './data/questions.js?v=34131d3';
import { BUILD } from './version.js?v=34131d3';

const KEY = 'zebonky-tms-save-v1';
// The save before the last one, kept in case the last one is damaged.
const BACKUP = `${KEY}-backup`;

// A stored save that reads back as a save, or null.
function readSave(raw) {
  try {
    const d = raw && JSON.parse(raw);
    return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
  } catch (e) {
    return null;
  }
}

function fresh() {
  return {
    at: START_NODE,
    cleared: {},    // levelId -> { normal: bool, secret: bool }
    treasure: {},   // levelId -> [itemId, ...]
    revealed: [],   // open paths already announced, so new ones can animate in
    walked: [],     // paths walked at least once: only these show paw prints
    tamed: {},      // levelId -> true once every wild Zebonky in it was tamed
    difficulty: DEFAULT_DIFFICULTY,  // the map's slider: junior, explorer or pioneer
    // What the player looks like: the character, and later the parts of the
    // look (data/characters.js LOOK_SLOTS); null = that character's own.
    look: { character: DEFAULT_CHARACTER, hair: null, hat: null, outfit: null, shoes: null },
    view: null,         // the biome the map is zoomed into, or null for the whole map
    biomeDone: {},      // biome -> true once its finish has been shown (zoomed out for)
    // Per difficulty (the user, 2026-10-25): every question answered right,
    // band -> biome -> [question keys]; and the companions it has earned,
    // band -> [biomes], with the one chosen, band -> biome. A companion is
    // earned by answering a biome's whole bank on that difficulty, and
    // travels with them only while they play that difficulty.
    answered: {},
    companionsBy: {},
    companionBy: {},
    // Currency (a placeholder name) and the level rewards that pay it, once
    // per level per difficulty: band -> levelId -> { letters, paid } (currency.js).
    currency: 0,
    rewardsBy: {},
  };
}

export const pathKey = (p) => `${p.from}>${p.to}`;

export const state = {
  data: fresh(),

  // A save that can't be read is copied aside (never overwritten) and the
  // backup is loaded instead (lesson REL-04, Louis's game-pipeline-kit; it
  // used to start a blank game and write over the damaged one).
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      let d = readSave(raw);
      if (raw && !d) {
        localStorage.setItem(`${KEY}-unreadable-${Date.now()}`, raw);
        d = readSave(localStorage.getItem(BACKUP));
      }
      this.data = d ? { ...fresh(), ...d } : fresh();
    } catch (e) {
      this.data = fresh();
    }
    this.migrate();
    // An old save can stand on a level that's no longer open (the start moved).
    if (!LEVELS[this.data.at] || !this.isNodeOpen(this.data.at)) this.data.at = START_NODE;
  },

  // Saves from before companions were per difficulty: theirs stay with the
  // difficulty the save was on.
  migrate() {
    const d = this.data;
    if (Array.isArray(d.companions) && d.companions.length && !Object.keys(d.companionsBy || {}).length) {
      const band = this.difficulty().id;
      d.companionsBy = { [band]: [...d.companions] };
      d.companionBy = { [band]: d.companion || d.companions[0] };
    }
    delete d.companions;
    delete d.companion;
  },

  // Set while the level designer is test-playing a drawing.
  noSave: false,

  // Inspection mode (index.html?inspect=1, the user, 2026-10-25): the whole
  // game as normal, every level open, without the explorer and without
  // touching the saved game.
  inspectAll: false,

  startInspection() {
    this.inspectAll = true;
    this.noSave = true;
    const keys = PATHS.map(pathKey);
    this.data = { ...fresh(), difficulty: this.data.difficulty, look: this.data.look, revealed: keys, walked: keys };
  },

  save() {
    if (this.noSave) return;
    try {
      // Which build wrote it (lesson REL-11).
      this.data.build = BUILD;
      const prev = localStorage.getItem(KEY);
      if (readSave(prev)) localStorage.setItem(BACKUP, prev);
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      // Storage unavailable: progress lasts for this visit only.
    }
  },

  // Progress goes; the difficulty and the look are settings, so they stay.
  reset() {
    const { difficulty, look } = this.data;
    this.data = { ...fresh(), difficulty, look };
    this.save();
  },

  // The player's look; a save from before looks existed gets the default.
  look() {
    return { ...fresh().look, ...(this.data.look || {}) };
  },

  // The chosen character: { id, name, manifest, ... } from data/characters.js.
  character() {
    return characterById(this.look().character);
  },

  setLook(part, value) {
    this.data.look = { ...this.look(), [part]: value };
    this.save();
  },

  // The slider's band: { id, name, maxEnergy, ... } from data/difficulty.js.
  difficulty() {
    return difficultyById(this.data.difficulty);
  },

  setDifficulty(id) {
    this.data.difficulty = difficultyById(id).id;
    this.save();
  },

  // Replace this device's progress with a loaded one (save code, file, link).
  replaceWith(data) {
    this.data = { ...fresh(), ...data };
    this.migrate();
    // A save code carries levels, treasure and answered questions, not biome
    // finishes: biomes finished on the other device count as finished, with
    // the companions their answered questions earned on each difficulty.
    PLAY_BIOMES.forEach((b) => {
      if (!this.biomeComplete(b)) return;
      this.data.biomeDone = { ...(this.data.biomeDone || {}), [b]: true };
      ['junior', 'explorer', 'pioneer'].forEach((band) => {
        if (this.questionsDone(b, band)) this.addCompanion(b, band);
      });
    });
    if (!LEVELS[this.data.at] || !this.isNodeOpen(this.data.at)) this.data.at = START_NODE;
    this.save();
  },

  // A fresh save, for building a loaded one on.
  blank() {
    return fresh();
  },

  hasSave() {
    const d = this.data;
    return Object.keys(d.cleared).length > 0 || Object.keys(d.treasure).length > 0;
  },

  // A normal path opens however the level was finished (a secret door
  // still counts as playing it); a secret path needs the secret.
  isPathOpen(p) {
    if (this.inspectAll) return true;
    const c = this.data.cleared[p.from];
    if (!c) return false;
    return p.exit === 'secret' ? !!c.secret : !!(c.normal || c.secret);
  },

  openPaths() {
    return PATHS.filter((p) => this.isPathOpen(p));
  },

  isNodeOpen(id) {
    return id === START_NODE || this.openPaths().some((p) => p.to === id);
  },

  // Paths that are open but have not been drawn yet. Marks them as drawn.
  takeNewPaths() {
    const fresh = this.openPaths().filter((p) => !this.data.revealed.includes(pathKey(p)));
    fresh.forEach((p) => this.data.revealed.push(pathKey(p)));
    if (fresh.length) this.save();
    return fresh;
  },

  // Paw prints show on a path once it has been walked, either way.
  hasWalked(p) {
    const w = this.data.walked || [];
    return w.includes(pathKey(p)) || w.includes(`${p.to}>${p.from}`);
  },

  markWalked(p) {
    if (this.hasWalked(p)) return;
    this.data.walked = [...(this.data.walked || []), pathKey(p)];
    this.save();
  },

  // The tamed star: every wild Zebonky in the level fed at least once.
  hasTamedAll(id) {
    return !!(this.data.tamed && this.data.tamed[id]);
  },

  markTamed(id) {
    if (this.hasTamedAll(id)) return;
    this.data.tamed = { ...(this.data.tamed || {}), [id]: true };
    this.save();
  },

  isCleared(id) {
    const c = this.data.cleared[id];
    return !!(c && (c.normal || c.secret));
  },

  foundSecret(id) {
    const c = this.data.cleared[id];
    return !!(c && c.secret);
  },

  treasureFor(id) {
    return this.data.treasure[id] || [];
  },

  hasTreasure(levelId, itemId) {
    return this.treasureFor(levelId).includes(itemId);
  },

  giveTreasure(levelId, itemId) {
    const list = this.treasureFor(levelId);
    if (!list.includes(itemId)) {
      this.data.treasure[levelId] = [...list, itemId];
      this.save();
    }
  },

  // A level earns its check mark when every quiz treasure in it is collected.
  isChecked(id) {
    return LEVELS[id].items.every((it) => this.hasTreasure(id, it.id));
  },

  // ---------- biomes and companions ----------

  // Every level in the biome played through.
  biomeComplete(b) {
    return biomeLevels(b).every((id) => this.isCleared(id));
  },

  // ---------- answered questions (per difficulty) ----------

  answeredIn(b, band = this.difficulty().id) {
    return ((this.data.answered || {})[band] || {})[b] || [];
  },

  markAnswered(b, q, band = this.difficulty().id) {
    const k = questionKey(q);
    const have = this.answeredIn(b, band);
    if (have.includes(k)) return;
    const a = this.data.answered || (this.data.answered = {});
    a[band] = { ...(a[band] || {}), [b]: [...have, k] };
    this.save();
  },

  // { done, total } for a biome's bank on a difficulty.
  questionProgress(b, band = this.difficulty().id) {
    const bank = bankFor(b, band);
    const have = new Set(this.answeredIn(b, band));
    return { done: bank.filter((q) => have.has(questionKey(q))).length, total: bank.length };
  },

  questionsDone(b, band = this.difficulty().id) {
    const p = this.questionProgress(b, band);
    return p.total > 0 && p.done >= p.total;
  },

  // Every question in the biome's bank answered, on the difficulty played now.
  biomeQuestionsDone(b) {
    return this.questionsDone(b);
  },

  // ---------- companions (per difficulty) ----------

  companions(band = this.difficulty().id) {
    return (this.data.companionsBy || {})[band] || [];
  },

  // The one travelling with them on this difficulty, or null.
  companion(band = this.difficulty().id) {
    const c = (this.data.companionBy || {})[band];
    return this.companions(band).includes(c) ? c : null;
  },

  addCompanion(b, band = this.difficulty().id) {
    const d = this.data;
    if (this.companions(band).includes(b)) return;
    d.companionsBy = { ...(d.companionsBy || {}), [band]: [...this.companions(band), b] };
    if (!this.companion(band)) d.companionBy = { ...(d.companionBy || {}), [band]: b };
  },

  // What the map should do on arriving back from a level in biome b:
  // 'reward' (its Zebonky joins), 'questions' (finished, but not every
  // question answered), or null (stay in the biome). Records it.
  biomeEvent(b) {
    const d = this.data;
    d.biomeDone = d.biomeDone || {};
    const has = this.companions().includes(b);
    let event = null;
    if (this.biomeComplete(b) && !d.biomeDone[b]) {
      d.biomeDone[b] = true;
      event = this.biomeQuestionsDone(b) && !has ? 'reward' : (has ? null : 'questions');
      if (!event) this.save();
    } else if (d.biomeDone[b] && this.biomeQuestionsDone(b) && !has) {
      event = 'reward';
    }
    if (event === 'reward') this.addCompanion(b);
    if (event) this.save();
    return event;
  },

  setView(b) {
    this.data.view = b;
    this.save();
  },

  setCompanion(b, band = this.difficulty().id) {
    this.data.companionBy = { ...(this.data.companionBy || {}), [band]: b };
    this.save();
  },

  // Called by a level when the player reaches an exit.
  // result: { exit: 'normal' | 'secret' }
  completeLevel(id, exit) {
    const c = this.data.cleared[id] || { normal: false, secret: false };
    c[exit] = true;
    this.data.cleared[id] = c;
    this.save();
  },

  totals() {
    const ids = Object.keys(LEVELS);
    let items = 0;
    let maxItems = 0;
    ids.forEach((id) => {
      items += this.treasureFor(id).length;
      maxItems += LEVELS[id].items.length;
    });
    return {
      checks: ids.filter((id) => this.isChecked(id)).length,
      levels: ids.length,
      items,
      maxItems,
    };
  },
};
