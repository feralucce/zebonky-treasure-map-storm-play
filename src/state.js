// Game progress. Kept only in this browser (localStorage), never sent anywhere.
// Storage can be missing or blocked (private windows, previews), so every
// read and write is guarded and the game still runs without it.

import { LEVELS, PATHS, START_NODE, PLAY_BIOMES, biomeLevels } from './data/world.js?v=6506ff3';
import { DEFAULT_DIFFICULTY, difficultyById } from './data/difficulty.js?v=6506ff3';
import { DEFAULT_CHARACTER, characterById } from './data/characters.js?v=6506ff3';

const KEY = 'zebonky-tms-save-v1';

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
    companions: [],     // biomes whose Zebonky has joined (every question answered)
    companion: null,    // the biome whose Zebonky travels with them
  };
}

export const pathKey = (p) => `${p.from}>${p.to}`;

export const state = {
  data: fresh(),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch (e) {
      this.data = fresh();
    }
    // An old save can stand on a level that's no longer open (the start moved).
    if (!LEVELS[this.data.at] || !this.isNodeOpen(this.data.at)) this.data.at = START_NODE;
  },

  // Set while the level designer is test-playing a drawing.
  noSave: false,

  save() {
    if (this.noSave) return;
    try {
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
    // A save code carries levels and treasure, not biome finishes: biomes
    // finished on the other device count as finished, with their companions.
    PLAY_BIOMES.forEach((b) => {
      if (!this.biomeComplete(b)) return;
      this.data.biomeDone = { ...(this.data.biomeDone || {}), [b]: true };
      if (this.biomeQuestionsDone(b) && !(this.data.companions || []).includes(b)) {
        this.data.companions = [...(this.data.companions || []), b];
        if (!this.data.companion) this.data.companion = b;
      }
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

  // Every question in the biome answered (every crate's treasure in).
  biomeQuestionsDone(b) {
    return biomeLevels(b).every((id) => this.isChecked(id));
  },

  // What the map should do on arriving back from a level in biome b:
  // 'reward' (its Zebonky joins), 'questions' (finished, but not every
  // question answered), or null (stay in the biome). Records it.
  biomeEvent(b) {
    const d = this.data;
    d.biomeDone = d.biomeDone || {};
    d.companions = d.companions || [];
    let event = null;
    if (this.biomeComplete(b) && !d.biomeDone[b]) {
      d.biomeDone[b] = true;
      event = this.biomeQuestionsDone(b) ? 'reward' : 'questions';
    } else if (d.biomeDone[b] && this.biomeQuestionsDone(b) && !d.companions.includes(b)) {
      event = 'reward';
    }
    if (event === 'reward') {
      d.companions = [...d.companions, b];
      if (!d.companion) d.companion = b;
    }
    if (event) this.save();
    return event;
  },

  setView(b) {
    this.data.view = b;
    this.save();
  },

  setCompanion(b) {
    this.data.companion = b;
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
