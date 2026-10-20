// Game progress. Kept only in this browser (localStorage), never sent anywhere.
// Storage can be missing or blocked (private windows, previews), so every
// read and write is guarded and the game still runs without it.

import { LEVELS, PATHS, START_NODE } from './data/world.js';

const KEY = 'zebonky-tms-save-v1';

function fresh() {
  return {
    at: START_NODE,
    cleared: {},    // levelId -> { normal: bool, secret: bool }
    treasure: {},   // levelId -> [itemId, ...]
    revealed: [],   // path keys already drawn, so new ones can animate in
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
    if (!LEVELS[this.data.at]) this.data.at = START_NODE;
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

  reset() {
    this.data = fresh();
    this.save();
  },

  hasSave() {
    const d = this.data;
    return Object.keys(d.cleared).length > 0 || Object.keys(d.treasure).length > 0;
  },

  isPathOpen(p) {
    const c = this.data.cleared[p.from];
    return !!(c && c[p.exit]);
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
