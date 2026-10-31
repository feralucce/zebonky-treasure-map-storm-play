// The level ending screen (the user, 2026-10-29): after a level's normal
// exit, after the bonus level, and after the secret level (when there is
// one). It lists the level's rewards and pays the currency for each one
// earned now (src/currency.js), then goes back to the map (a test run plays
// its level again).
//
// Data: { levelId, kind: 'normal' | 'bonus' | 'secret', run, levelData }
//   run: what this play did: { nodamage, tamed, questions, hasWild, hasCrates }
//   levelData: set for a test run, to play it again

import { MAP_W, MAP_H, LEVELS } from '../data/world.js?v=6deb8ef';
import { state } from '../state.js?v=6deb8ef';
import { COLORS, heading, text, makeButton } from '../theme.js?v=6deb8ef';
import { LETTERS, REWARDS, REWARD_EACH, award, paid, lettersFound, allLetters, currency } from '../currency.js?v=6deb8ef';
import { audio } from '../audio.js?v=6deb8ef';

export class LevelEndScene extends Phaser.Scene {
  constructor() {
    super('LevelEnd');
  }

  init(data) {
    this.levelId = data.levelId;
    this.kind = data.kind || 'normal';
    this.run = data.run || {};
    this.levelData = data.levelData || null;
    this.leaving = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#2f6e50');
    const id = this.levelId;
    const run = this.run;
    const before = currency();

    // What this play earned, by reward; null where the level has none to earn.
    const earnedNow = {
      letters: allLetters(id),
      nodamage: !!run.nodamage,
      tamed: run.hasWild === false ? null : !!run.tamed,
      questions: run.hasCrates === false ? null : !!run.questions,
      bonus: this.kind === 'bonus',
      secret: this.kind === 'secret',
    };
    const rows = REWARDS.filter((r) => r.key !== 'secret' || this.kind === 'secret' || paid(id, 'secret'))
      .map((r) => {
        const had = paid(id, r.key);
        const now = earnedNow[r.key];
        const fresh = now === true && award(id, r.key);
        return { ...r, status: now === null ? 'none' : fresh ? 'new' : had ? 'had' : 'no' };
      });
    const gained = currency() - before;

    const w = 820;
    const h = 120 + rows.length * 56 + 150;
    const x = (MAP_W - w) / 2;
    const y = (MAP_H - h) / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(x + 6, y + 8, w, h, 28);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x, y, w, h, 28);
    g.lineStyle(5, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 28);

    const title = { normal: 'Level complete!', bonus: 'Bonus level complete!', secret: 'Secret level complete!' }[this.kind];
    this.add.text(MAP_W / 2, y + 52, title, heading(44, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 10,
    })).setOrigin(0.5);
    const lvl = LEVELS[id];
    if (lvl) this.add.text(MAP_W / 2, y + 98, lvl.name, text(20, '#6b4a2e')).setOrigin(0.5);

    rows.forEach((r, i) => {
      const ry = y + 140 + i * 56;
      const on = r.status === 'new' || r.status === 'had';
      const box = this.add.graphics();
      box.fillStyle(r.status === 'new' ? 0xd6f0dc : 0xf8ecd0, 1);
      box.fillRoundedRect(x + 40, ry - 22, w - 80, 46, 12);
      box.lineStyle(2, COLORS.ink, r.status === 'none' ? 0.3 : 1);
      box.strokeRoundedRect(x + 40, ry - 22, w - 80, 46, 12);
      // A tick, or an empty ring.
      box.lineStyle(4, on ? COLORS.green : 0xb9a782, 1);
      if (on) box.strokePoints([{ x: x + 62, y: ry }, { x: x + 72, y: ry + 10 }, { x: x + 90, y: ry - 10 }]);
      else box.strokeCircle(x + 76, ry, 11);
      this.add.text(x + 108, ry, r.label, text(20, r.status === 'none' ? '#a89670' : COLORS.inkCss)).setOrigin(0, 0.5);
      // The letters found so far, on the letters row.
      if (r.key === 'letters') {
        const found = lettersFound(id);
        LETTERS.split('').forEach((ch, k) => {
          this.add.text(x + 420 + k * 26, ry, ch, heading(22, found.includes(ch) ? COLORS.yellowCss : '#d8c49a', {
            stroke: COLORS.inkCss, strokeThickness: found.includes(ch) ? 5 : 0,
          })).setOrigin(0.5);
        });
      }
      const right = { new: `+${REWARD_EACH} currency`, had: 'Earned before', no: 'Not yet', none: 'None in this level' }[r.status];
      this.add.text(x + w - 60, ry, right, heading(18, r.status === 'new' ? '#2f6e50' : '#8a7550')).setOrigin(1, 0.5);
    });

    // The total, counting up through what was just earned.
    const ty = y + 140 + rows.length * 56 + 22;
    const total = this.add.text(MAP_W / 2, ty, '', heading(30, COLORS.inkCss)).setOrigin(0.5);
    const show = (n) => total.setText(`Currency: ${n}${gained ? `   (+${gained})` : ''}`);
    show(before);
    if (gained) {
      this.tweens.addCounter({
        from: before, to: before + gained, duration: 600 + gained * 250, delay: 500,
        onUpdate: (tw) => show(Math.round(tw.getValue())),
        onComplete: () => audio.sfx(this, 'food'),
      });
    }

    const label = this.levelData ? 'Play again' : 'Back to map';
    makeButton(this, MAP_W / 2, y + h - 50, label, () => this.back(), { width: 260, height: 60, size: 24 });
    this.time.delayedCall(500, () => {
      this.input.keyboard.once('keydown-ENTER', () => this.back());
      this.input.keyboard.once('keydown-SPACE', () => this.back());
    });
    this.cameras.main.fadeIn(300, 43, 29, 18);
  }

  back() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 43, 29, 18);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.levelData) {
        this.scene.start('Level', this.levelData);
        return;
      }
      state.data.at = this.levelId;
      state.save();
      this.scene.start('Overworld');
    });
  }
}
