// The level ending screen: the level's score card (the user, 2026-11-05).
// Every Z paw print the level can award is drawn as a shadow first, then the
// ones earned (this play or before) pop into them one at a time, new ones
// with a ring, and the tally counts up (src/paws.js has the awards). Then
// back to the map (a test run plays its level again).
//
// Data: { levelId, kind: 'normal' | 'bonus' (a placeholder bonus level), run, levelData }
//   run: what this play did: { time, nodamage, fed, hasWild, hasLetters,
//        questions, hasCrates, bonus, hasBonus }
//   levelData: set for a test run, to play it again

import { MAP_W, MAP_H, LEVELS } from '../data/world.js?v=f7f47c2';
import { timesFor } from '../data/levelTimes.js?v=f7f47c2';
import { state } from '../state.js?v=f7f47c2';
import { COLORS, heading, text, makeButton } from '../theme.js?v=f7f47c2';
import { LETTERS, AWARDS, earn, held, lettersFound, allLetters, timeTier, tierInfo, clock, pawCard } from '../paws.js?v=f7f47c2';
import { audio } from '../audio.js?v=f7f47c2';

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
    const times = timesFor(id);
    const tier = timeTier(run.time || 0, times);
    // Out through a placeholder bonus level (scenes/Bonus.js), not the exit:
    // no time for this play.
    const viaBonus = this.kind === 'bonus';

    // What this play earned, by award; null where the level has none.
    const earnedNow = {
      time: viaBonus ? 0 : tier,
      letters: run.hasLetters === false ? null : allLetters(id),
      nodamage: !!run.nodamage,
      fed: run.hasWild === false ? null : !!run.fed,
      questions: run.hasCrates === false ? null : !!run.questions,
      bonus: run.hasBonus === false ? null : !!run.bonus,
    };
    const rows = AWARDS.map((a) => {
      const now = earnedNow[a.key];
      if (now === null) return { label: a.label, max: a.max, none: true };
      const fresh = now ? earn(id, a.key, a.key === 'time' ? now : true) : 0;
      const row = { label: a.label, max: a.max, got: held(id, a.key), fresh };
      if (a.key === 'time' && viaBonus) {
        row.label = 'Time';
        row.detail = 'Reach the exit for a time';
        row.detailAt = 150;
      } else if (a.key === 'time') {
        const best = tierInfo(held(id, 'time'));
        row.label = `Time ${clock(run.time)}`;
        row.detail = `${tierInfo(tier).name}   (gold ${clock(times.gold)}, silver ${clock(times.silver)})`;
        row.detailAt = 150;
        if (best && best.tier > tier) row.detail = `${tierInfo(tier).name}, best ${best.name}`;
      }
      if (a.key === 'letters') row.letters = true;
      return row;
    });

    const w = 860;
    const rowH = 56;
    const h = 130 + rows.length * rowH + 140;
    const x = (MAP_W - w) / 2;
    const y = (MAP_H - h) / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(x + 6, y + 8, w, h, 28);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x, y, w, h, 28);
    g.lineStyle(5, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 28);

    this.add.text(MAP_W / 2, y + 52, viaBonus ? 'Bonus level complete!' : 'Level complete!', heading(44, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 10,
    })).setOrigin(0.5);
    const lvl = LEVELS[id];
    if (lvl) this.add.text(MAP_W / 2, y + 98, lvl.name, text(20, '#6b4a2e')).setOrigin(0.5);

    const top = y + 150;
    const tally = this.add.text(MAP_W / 2, top + rows.length * rowH + 6, '', heading(30, COLORS.inkCss)).setOrigin(0.5);
    const card = pawCard(this, rows, {
      x: x + 40, y: top, w: w - 80, rowH,
      onDone: (n, of) => { tally.setText(`Z paw prints: ${n} / ${of}`); audio.sfx(this, 'level-end'); },
    });
    tally.setText(`Z paw prints: 0 / ${card.possible}`);
    // Count up as each paw lands.
    let n = 0;
    for (let i = 0; i < card.total; i++) {
      this.time.delayedCall(450 + i * 260, () => { n += 1; tally.setText(`Z paw prints: ${n} / ${card.possible}`); });
    }

    // The letters found so far, on the letters row.
    const li = rows.findIndex((r) => r.letters && !r.none);
    if (li >= 0) {
      const found = lettersFound(id);
      LETTERS.split('').forEach((ch, k) => {
        this.add.text(x + 380 + k * 26, top + li * rowH, ch, heading(22, found.includes(ch) ? COLORS.yellowCss : '#d8c49a', {
          stroke: COLORS.inkCss, strokeThickness: found.includes(ch) ? 5 : 0,
        })).setOrigin(0.5);
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
