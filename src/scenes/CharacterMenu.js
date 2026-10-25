// The character selector, opened from the map (the Explorer button).
// Pick who you play as; the choice is saved on this device and used in
// every level. Tabs along the top are the parts of a look
// (data/characters.js LOOK_SLOTS): only the explorer herself can be chosen
// so far, the rest are ready for layered art (hair, hat, outfit, shoes) and
// say "Soon". The stand-ins carry a note that they are temporary.

import { MAP_W, MAP_H } from '../data/world.js?v=9565416';
import { state } from '../state.js?v=9565416';
import { COLORS, heading, text, makeButton } from '../theme.js?v=9565416';
import { CHARACTERS, LOOK_SLOTS, STANDIN_NOTE } from '../data/characters.js?v=9565416';
import { audio } from '../audio.js?v=9565416';

const CARD_W = 980;
const CARD_H = 640;
const TILE_W = 150;
const TILE_H = 190;

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
      if (!this.anims.exists(`${c.id}-idle`)) {
        this.anims.create({ key: `${c.id}-idle`, frames: this.anims.generateFrameNumbers(`${c.id}-idle`), frameRate: 3, repeat: -1 });
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
    this.preview = this.add.sprite(px + pw / 2, py + ph - 66, `${state.character().id}-idle`, 0)
      .setOrigin(0.5, 1).setScale(3);
    this.previewName = this.add.text(px + pw / 2, py + ph - 30, '', heading(22)).setOrigin(0.5);
    this.refreshPreview();
  }

  refreshPreview() {
    const c = state.character();
    this.preview.play(`${c.id}-idle`);
    this.previewName.setText(c.name);
  }

  // Top: one tab per part of a look. Only the ready ones open.
  buildTabs() {
    const x = this.x0 + 330;
    const y = this.y0 + 92;
    this.tabs = {};
    LOOK_SLOTS.forEach((slot, i) => {
      const tx = x + i * 126;
      const t = this.add.container(tx, y);
      const bg = this.add.graphics();
      const label = this.add.text(56, 20, slot.name, text(17, slot.ready ? COLORS.inkCss : '#9c8462')).setOrigin(0.5);
      t.add([bg, label]);
      if (!slot.ready) t.add(this.add.text(56, 42, 'Soon', text(12, '#9c8462')).setOrigin(0.5));
      t.setSize(112, 50);
      t.draw = (on) => {
        bg.clear();
        bg.fillStyle(on ? COLORS.green : 0xe8cf98, slot.ready ? 1 : 0.6);
        bg.fillRoundedRect(0, 0, 112, 50, 12);
        bg.lineStyle(3, COLORS.ink, slot.ready ? 1 : 0.4);
        bg.strokeRoundedRect(0, 0, 112, 50, 12);
        label.setColor(on ? '#ffffff' : (slot.ready ? COLORS.inkCss : '#9c8462'));
      };
      if (slot.ready) {
        t.setInteractive(new Phaser.Geom.Rectangle(0, 0, 112, 50), Phaser.Geom.Rectangle.Contains);
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
    this.tiles = CHARACTERS.map((c, i) => {
      const tx = x + i * (TILE_W + 12);
      const t = this.add.container(tx, y);
      const bg = this.add.graphics();
      const fig = this.add.sprite(TILE_W / 2, TILE_H - 44, `${c.id}-idle`, 0).setOrigin(0.5, 1).setScale(1.25);
      const name = this.add.text(TILE_W / 2, TILE_H - 22, c.name, text(16)).setOrigin(0.5);
      t.add([bg, fig, name]);
      if (c.standin) {
        t.add(this.add.text(TILE_W - 8, 8, 'Stand-in', text(11, '#ffffff', {
          backgroundColor: '#9c6b3c', padding: { x: 5, y: 2 },
        })).setOrigin(1, 0));
      }
      t.draw = (on) => {
        bg.clear();
        bg.fillStyle(on ? 0xd6f0dc : 0xf8ecd0, 1);
        bg.fillRoundedRect(0, 0, TILE_W, TILE_H, 16);
        bg.lineStyle(on ? 5 : 3, on ? COLORS.green : COLORS.ink, 1);
        bg.strokeRoundedRect(0, 0, TILE_W, TILE_H, 16);
        if (on) fig.play(`${c.id}-idle`);
        else fig.stop().setFrame(0);
      };
      t.setInteractive(new Phaser.Geom.Rectangle(0, 0, TILE_W, TILE_H), Phaser.Geom.Rectangle.Contains);
      t.input.cursor = 'pointer';
      t.on('pointerup', () => this.choose(c.id));
      this.tabLayer.add(t);
      return { id: c.id, t };
    });
    this.drawTiles();
    if (CHARACTERS.some((c) => c.standin)) {
      this.tabLayer.add(this.add.text(x, y + TILE_H + 26, STANDIN_NOTE, text(16, '#6b4a2e', {
        wordWrap: { width: CARD_W - 370 },
      })));
    }
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
