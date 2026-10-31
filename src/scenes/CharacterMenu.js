// The character selector, opened from the map (the Explorer button).
// Pick who you play as; the choice is saved on this device and used in
// every level. Tabs along the top are the parts of a look
// (data/characters.js LOOK_SLOTS): only the explorer herself can be chosen
// so far, the rest are ready for layered art (hair, hat, outfit, shoes) and
// say "Soon". The stand-ins carry a note that they are temporary.

import { MAP_W, MAP_H } from '../data/world.js?v=6a3303d';
import { state } from '../state.js?v=6a3303d';
import { COLORS, heading, text, makeButton } from '../theme.js?v=6a3303d';
import { CHARACTERS, LOOK_SLOTS } from '../data/characters.js?v=6a3303d';
import { audio } from '../audio.js?v=6a3303d';
import { companionGrid } from '../companionPicker.js?v=6a3303d';

const CARD_W = 980;
const CARD_H = 640;
const TILE_W = 120;
const TILE_H = 190;
const GAP = 12;
// The explorers are a carousel (the user, 2026-10-29: five had run off the
// card, "make them a carousel"): four tiles at a time between two arrows.
const SHOWN = 4;
const ARROW = 40;

export class CharacterMenuScene extends Phaser.Scene {
  constructor() {
    super('CharacterMenu');
  }

  create() {
    this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive();
    this.x0 = (MAP_W - CARD_W) / 2;
    this.y0 = (MAP_H - CARD_H) / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(this.x0 + 6, this.y0 + 8, CARD_W, CARD_H, 26);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(this.x0, this.y0, CARD_W, CARD_H, 26);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(this.x0, this.y0, CARD_W, CARD_H, 26);
    this.add.text(MAP_W / 2, this.y0 + 40, 'Your explorer', heading(34)).setOrigin(0.5);

    CHARACTERS.forEach((c) => {
      // The picker's own idle (front facing, from Chris's cards and the
      // user's heads, the user, 2026-10-30), where an explorer has one.
      const pa = ((this.cache.json.get(c.id) || {}).anims || {}).picker;
      if (pa && !this.anims.exists(`${c.id}-pick`)) {
        this.anims.create({ key: `${c.id}-pick`, frames: this.anims.generateFrameNumbers(`${c.id}-picker`), frameRate: pa.fps, repeat: -1 });
      }
      if (!this.anims.exists(`${c.id}-idle`)) {
        const ia = (this.cache.json.get(c.id) || {}).anims;
        const rate = (ia && ia.idle && ia.idle.fps) || 3;
        this.anims.create({ key: `${c.id}-idle`, frames: this.anims.generateFrameNumbers(`${c.id}-idle`), frameRate: rate, repeat: -1 });
      }
    });

    this.buildPreview();
    this.buildTabs();
    this.tabLayer = this.add.container(0, 0);
    this.showTab('character');

    makeButton(this, this.x0 + CARD_W - 120, this.y0 + CARD_H - 52, 'Done', () => this.close(), {
      width: 170, height: 52, size: 22,
    });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-ENTER', () => this.close());
  }

  // An explorer's picture here: the picker idle if she has one (taller
  // frames, so smaller scales), else her game idle.
  look(id) {
    return this.anims.exists(`${id}-pick`)
      ? { tex: `${id}-picker`, anim: `${id}-pick`, big: 1.25, small: 0.55 }
      : { tex: `${id}-idle`, anim: `${id}-idle`, big: 3, small: 1.25 };
  }

  // Left: the chosen explorer, big, playing her idle.
  buildPreview() {
    const px = this.x0 + 40;
    const py = this.y0 + 90;
    const pw = 260;
    const ph = 420;
    const g = this.add.graphics();
    g.fillStyle(0xe8cf98, 1);
    g.fillRoundedRect(px, py, pw, ph, 18);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(px, py, pw, ph, 18);
    g.fillStyle(COLORS.ink, 0.25);
    g.fillEllipse(px + pw / 2, py + ph - 70, 150, 26);
    this.preview = this.add.sprite(px + pw / 2, py + ph - 66, this.look(state.character().id).tex, 0)
      .setOrigin(0.5, 1).setScale(3);
    this.previewName = this.add.text(px + pw / 2, py + ph - 30, '', heading(22)).setOrigin(0.5);
    this.refreshPreview();
  }

  refreshPreview() {
    const c = state.character();
    const lk = this.look(c.id);
    this.preview.setTexture(lk.tex, 0).setScale(lk.big);
    this.preview.play(lk.anim);
    this.previewName.setText(c.name);
  }

  // Top: one tab per part of a look. Only the ready ones open.
  buildTabs() {
    const x = this.x0 + 330;
    const y = this.y0 + 92;
    this.tabs = {};
    LOOK_SLOTS.forEach((slot, i) => {
      const tx = x + i * 104;
      const t = this.add.container(tx, y);
      const bg = this.add.graphics();
      const label = this.add.text(49, 20, slot.name, text(15, slot.ready ? COLORS.inkCss : '#9c8462')).setOrigin(0.5);
      t.add([bg, label]);
      if (!slot.ready) t.add(this.add.text(49, 42, 'Soon', text(12, '#9c8462')).setOrigin(0.5));
      t.setSize(98, 50);
      t.draw = (on) => {
        bg.clear();
        bg.fillStyle(on ? COLORS.green : 0xe8cf98, slot.ready ? 1 : 0.6);
        bg.fillRoundedRect(0, 0, 98, 50, 12);
        bg.lineStyle(3, COLORS.ink, slot.ready ? 1 : 0.4);
        bg.strokeRoundedRect(0, 0, 98, 50, 12);
        label.setColor(on ? '#ffffff' : (slot.ready ? COLORS.inkCss : '#9c8462'));
      };
      if (slot.ready) {
        t.setInteractive(new Phaser.Geom.Rectangle(0, 0, 98, 50), Phaser.Geom.Rectangle.Contains);
        t.input.cursor = 'pointer';
        t.on('pointerup', () => this.showTab(slot.id));
      }
      this.tabs[slot.id] = t;
    });
  }

  showTab(id) {
    Object.entries(this.tabs).forEach(([k, t]) => t.draw(k === id));
    this.tabLayer.removeAll(true);
    this[`tab_${id}`]();
  }

  // The explorers: one tile each; the chosen one is outlined in green.
  tab_character() {
    const x = this.x0 + 330;
    const y = this.y0 + 170;
    const tx0 = x + ARROW + 8;                    // the first shown tile
    this.tiles = CHARACTERS.map((c, i) => {
      const t = this.add.container(tx0, y);
      const bg = this.add.graphics();
      const lk = this.look(c.id);
      const fig = this.add.sprite(TILE_W / 2, TILE_H - 44, lk.tex, 0).setOrigin(0.5, 1).setScale(lk.small);
      const name = this.add.text(TILE_W / 2, TILE_H - 22, c.name, text(16)).setOrigin(0.5);
      t.add([bg, fig, name]);
      t.draw = (on) => {
        bg.clear();
        bg.fillStyle(on ? 0xd6f0dc : 0xf8ecd0, 1);
        bg.fillRoundedRect(0, 0, TILE_W, TILE_H, 16);
        bg.lineStyle(on ? 5 : 3, on ? COLORS.green : COLORS.ink, 1);
        bg.strokeRoundedRect(0, 0, TILE_W, TILE_H, 16);
        if (on) fig.play(lk.anim);
        else fig.stop().setFrame(0);
      };
      t.setInteractive(new Phaser.Geom.Rectangle(0, 0, TILE_W, TILE_H), Phaser.Geom.Rectangle.Contains);
      t.input.cursor = 'pointer';
      t.on('pointerup', () => this.choose(c.id));
      this.tabLayer.add(t);
      return { id: c.id, t };
    });
    // The arrows, and which four are shown (the chosen one among them).
    const most = Math.max(0, CHARACTERS.length - SHOWN);
    const chosen = CHARACTERS.findIndex((c) => c.id === state.character().id);
    this.first = Phaser.Math.Clamp(chosen - SHOWN + 1, 0, most);
    const arrow = (ax, dir) => {
      const a = this.add.container(ax, y + TILE_H / 2);
      const g = this.add.graphics();
      const label = this.add.text(0, 0, dir < 0 ? '\u25C0' : '\u25B6', text(22, '#ffffff')).setOrigin(0.5);
      a.add([g, label]);
      a.draw = (live) => {
        g.clear();
        g.fillStyle(COLORS.ink, 1);
        g.fillCircle(0, 3, ARROW / 2);
        g.fillStyle(live ? COLORS.green : 0xb9a782, 1);
        g.fillCircle(0, 0, ARROW / 2);
      };
      a.setSize(ARROW, ARROW).setInteractive({ useHandCursor: true });
      a.on('pointerup', () => {
        const f = Phaser.Math.Clamp(this.first + dir, 0, most);
        if (f === this.first) return;
        this.first = f;
        audio.sfx(this, 'step');
        this.layoutTiles();
      });
      this.tabLayer.add(a);
      return a;
    };
    this.arrows = [arrow(x + ARROW / 2, -1), arrow(tx0 + SHOWN * (TILE_W + GAP) - GAP + 8 + ARROW / 2, 1)];
    this.layoutTiles();
    this.drawTiles();
  }

  // The companions: every biome's Zebonky, the unlocked ones to pick from,
  // the rest silhouettes (companionPicker.js).
  tab_companion() {
    const x = this.x0 + 330;
    const y = this.y0 + 170;
    const w = CARD_W - 370;
    this.tabLayer.add(companionGrid(this, x + w / 2, y, { tile: 108 }));
    const n = state.companions().length;
    this.tabLayer.add(this.add.text(x, y + 150, n
      ? `Tap a companion to have it travel with you. Answer every ${state.difficulty().name} question in an area to unlock its Zebonky on this difficulty.`
      : `Answer every ${state.difficulty().name} question in an area to unlock its Zebonky as a companion on this difficulty.`, text(17, '#6b4a2e', {
      wordWrap: { width: w },
    })));
  }

  // The carousel: the four from `first` in place, the rest hidden.
  layoutTiles() {
    const tx0 = this.x0 + 330 + ARROW + 8;
    this.tiles.forEach(({ t }, i) => {
      const k = i - this.first;
      t.setVisible(k >= 0 && k < SHOWN).setX(tx0 + k * (TILE_W + GAP));
      if (t.input) t.input.enabled = k >= 0 && k < SHOWN;
    });
    const most = Math.max(0, CHARACTERS.length - SHOWN);
    this.arrows[0].draw(this.first > 0);
    this.arrows[1].draw(this.first < most);
    // No arrows while every explorer fits.
    this.arrows.forEach((a) => a.setVisible(most > 0));
  }

  drawTiles() {
    const id = state.character().id;
    this.tiles.forEach(({ id: tid, t }) => t.draw(tid === id));
  }

  choose(id) {
    if (id === state.character().id) return;
    state.setLook('character', id);
    audio.sfx(this, 'step');
    this.drawTiles();
    this.refreshPreview();
  }

  close() {
    this.scene.stop();
    this.scene.resume('Overworld');
  }
}
