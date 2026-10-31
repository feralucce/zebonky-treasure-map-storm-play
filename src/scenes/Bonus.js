// The bonus minigame behind a secret exit. A placeholder for now: a card
// saying so, and a button back to the map (a test run plays its level again).

import { MAP_W, MAP_H } from '../data/world.js?v=9df7102';
import { state } from '../state.js?v=9df7102';
import { COLORS, heading, text, makeButton } from '../theme.js?v=9df7102';

export class BonusScene extends Phaser.Scene {
  constructor() {
    super('Bonus');
  }

  init(data) {
    this.levelId = data.levelId;
    this.levelData = data.levelData; // set for a test run, to play it again
    this.run = data.run || {};       // what the level's play earned, for the ending screen
    this.leaving = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#2f6e50');
    const w = 760;
    const h = 380;
    const x = (MAP_W - w) / 2;
    const y = (MAP_H - h) / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(x + 6, y + 8, w, h, 28);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x, y, w, h, 28);
    g.lineStyle(5, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 28);

    this.add.text(MAP_W / 2, y + 70, 'Bonus level!', heading(48, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 10,
    })).setOrigin(0.5);
    this.add.text(MAP_W / 2, y + 170, 'The bonus level goes here', text(30, COLORS.inkCss)).setOrigin(0.5);

    const label = this.levelData ? 'Play again' : 'Back to map';
    makeButton(this, MAP_W / 2, y + h - 70, label, () => this.back(), { width: 260, height: 64, size: 26 });
    this.input.keyboard.once('keydown-ENTER', () => this.back());
    this.input.keyboard.once('keydown-SPACE', () => this.back());
    this.cameras.main.fadeIn(300, 43, 29, 18);
  }

  back() {
    if (this.leaving || !this.levelId) return;
    this.leaving = true;
    // The level ending screen comes after the bonus level (scenes/LevelEnd.js).
    if (!this.levelData) state.completeLevel(this.levelId, 'secret');
    this.scene.start('LevelEnd', { levelId: this.levelId, kind: 'bonus', run: this.run, levelData: this.levelData });
  }
}
