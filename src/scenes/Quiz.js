// Quiz card overlay. Opened over a paused level by startQuiz() in levelApi.js.
// A wrong answer fades out and pops up the hint, and the child tries again
// until they find it. The right answer saves the treasure.

import { LEVELS, MAP_W, MAP_H } from '../data/world.js?v=8239659';
import { drawQuestion } from '../data/questions.js?v=8239659';
import { state } from '../state.js?v=8239659';
import { COLORS, heading, text, makeButton } from '../theme.js?v=8239659';
import { audio } from '../audio.js?v=8239659';
import { showCompanionCard } from '../companionCard.js?v=8239659';

const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ragged parchment outline, like the torn card in the mockup.
function tornCard(g, x, y, w, h, fill) {
  const pts = [];
  const jag = () => (Math.random() - 0.5) * 7;
  for (let px = x; px <= x + w; px += 24) pts.push({ x: px, y: y + jag() });
  for (let py = y; py <= y + h; py += 24) pts.push({ x: x + w + jag(), y: py });
  for (let px = x + w; px >= x; px -= 24) pts.push({ x: px, y: y + h + jag() });
  for (let py = y + h; py >= y; py -= 24) pts.push({ x: x + jag(), y: py });
  g.fillStyle(COLORS.ink, 1);
  g.fillPoints(pts.map((p) => ({ x: p.x + 4, y: p.y + 7 })), true);
  g.fillStyle(fill, 1);
  g.fillPoints(pts, true);
  g.lineStyle(4, COLORS.ink, 1);
  g.strokePoints(pts, true);
}

export class QuizScene extends Phaser.Scene {
  constructor() {
    super('Quiz');
  }

  init(data) {
    this.levelId = data.levelId;
    this.itemIndex = data.itemIndex;
    this.onDone = data.onDone;
    this.parentKey = data.parentKey;
    this.setQuestion = data.question; // a given question (layout checks)
    this.missCharged = false;  // Pioneer: this question's Z-bolt already taken
    this.answered = false;
    this.tried = new Set(); // wrong answers already picked
    this.closing = false; // the scene object is reused for every quiz
  }

  create() {
    const lvl = LEVELS[this.levelId];
    const item = lvl.items[this.itemIndex];
    this.band = state.difficulty();
    this.hintsLeft = this.band.hints;
    const biome = LEVELS[this.levelId] && LEVELS[this.levelId].biome;
    const q = this.setQuestion || drawQuestion(this.levelId, this.band.id, biome ? state.answeredIn(biome) : []);
    audio.sfx(this, 'crate');
    this.item = item;
    this.q = q;
    this.correct = q.answers[0];
    this.choices = shuffle(q.answers);

    this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive();

    const w = 860;
    const h = 560;
    const x = (MAP_W - w) / 2;
    const y = (MAP_H - h) / 2;
    const card = this.add.container(0, 0);
    const g = this.add.graphics();
    tornCard(g, x, y, w, h, COLORS.card);
    card.add(g);

    card.add(this.add.text(x + 40, y + 30, 'Mystery crate', text(20, '#6b3a1a')));
    // Junior and Pioneer banks are still copies of the Explorer questions,
    // except in biomes whose real banks are in (their questions have an id).
    if (this.band.testingNote && !q.id) {
      card.add(this.add.text(x + w - 40, y + 32, this.band.testingNote, text(14, '#6b3a1a', {
        fontStyle: 'italic', align: 'right', wordWrap: { width: 420 },
      })).setOrigin(1, 0));
    }
    // Long questions and answers (the Pioneer banks) fit by measuring: the
    // answers start under the question's real height, each row of buttons
    // is as tall as its longest answer, and if it still won't fit above the
    // Hint and Read buttons, everything steps down a font size and tries again.
    const bw = (w - 100) / 2;
    const room = y + h - 70;
    let qText;
    let layout;
    for (const [qs, as] of [[32, 24], [28, 21], [24, 18]]) {
      if (qText) qText.destroy();
      qText = this.add.text(x + 40, y + 62, q.q, heading(qs, COLORS.inkCss, { wordWrap: { width: w - 80 }, lineSpacing: 6 }));
      const heights = this.choices.map((choice, i) => {
        const t = this.add.text(0, 0, `${LETTERS[i]}.  ${choice}`, text(as, COLORS.inkCss, { wordWrap: { width: bw - 40 } }));
        const th = t.height;
        t.destroy();
        return Math.max(70, th + 22);
      });
      const rowH = [Math.max(heights[0], heights[1] || 0), Math.max(heights[2] || 0, heights[3] || 0)];
      const top = Math.max(y + 270 - 35, y + 62 + qText.height + 24);
      const bottom = top + rowH[0] + 22 + rowH[1];
      layout = { as, rowH, top, bottom };
      if (bottom + 84 <= room) break;           // room for the result's lines
    }
    card.add(qText);

    // Answer buttons, 2 x 2
    this.answerBtns = this.choices.map((choice, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = x + 40 + col * (bw + 20) + bw / 2;
      const rh = layout.rowH[row];
      const by = layout.top + (row ? layout.rowH[0] + 22 : 0) + rh / 2;
      const btn = this.makeAnswer(bx, by, bw, `${LETTERS[i]}.  ${choice}`, () => this.pick(i), rh, layout.as);
      card.add(btn);
      return btn;
    });

    this.result = this.add.text(MAP_W / 2, layout.bottom + 14, '', text(22, COLORS.inkCss, {
      align: 'center', wordWrap: { width: w - 80 },
    })).setOrigin(0.5, 0);
    card.add(this.result);

    // Read-aloud for early readers, using the browser's built-in voice.
    if ('speechSynthesis' in window) {
      const read = makeButton(this, x + w - 100, y + h - 36, 'Read to me', () => this.speak(), {
        width: 160, height: 44, size: 18, fill: COLORS.parchment, textColor: COLORS.inkCss,
      });
      card.add(read);
      this.readBtn = read;
    }

    // Hint: a note that pops up over the card. Tap it to put it away; the
    // button stays so it can be read again.
    this.hintPop = null;
    if (q.hint) {
      this.hintBtn = makeButton(this, x + 100, y + h - 36, 'Hint', () => this.showHint(), {
        width: 120, height: 44, size: 18, fill: COLORS.parchment, textColor: COLORS.inkCss,
      });
      card.add(this.hintBtn);
      this.input.keyboard.on('keydown-H', () => (this.hintPop ? this.closeHint() : this.showHint()));
      ['ENTER', 'SPACE', 'ESC'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.closeHint()));
    }

    // Keyboard: 1-4 or A-D
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pick(i)));
    LETTERS.forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pick(i)));

    card.setScale(0.85).setAlpha(0);
    card.setPosition(MAP_W * 0.075, MAP_H * 0.075);
    this.tweens.add({ targets: card, scale: 1, x: 0, y: 0, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.card = card;
  }

  makeAnswer(cx, cy, w, label, onClick, h = 70, size = 24) {
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    const t = this.add.text(-w / 2 + 22, 0, label, text(size, COLORS.inkCss, {
      wordWrap: { width: w - 40 },
    })).setOrigin(0, 0.5);
    c.add([g, t]);
    c.draw = (fill, hover = false) => {
      g.clear();
      g.fillStyle(COLORS.ink, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-w / 2, -h / 2 - (hover ? 2 : 0), w, h, 14);
      g.lineStyle(3, COLORS.ink, 1);
      g.strokeRoundedRect(-w / 2, -h / 2 - (hover ? 2 : 0), w, h, 14);
    };
    c.draw(0xfff4dc);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => !this.answered && c.draw(0xffffff, true));
    c.on('pointerout', () => !this.answered && c.draw(0xfff4dc));
    c.on('pointerup', onClick);
    return c;
  }

  pick(i) {
    if (this.hintPop) { this.closeHint(); return; }
    if (this.answered || i >= this.choices.length || this.tried.has(i)) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const btn = this.answerBtns[i];

    if (this.choices[i] !== this.correct) {
      // A gentle "not that one": a small wobble, the answer fades out of
      // play, and the hint appears so they can try again.
      this.tried.add(i);
      btn.disableInteractive();
      btn.draw(0xece3d2);
      this.tweens.add({ targets: btn, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 1,
        onComplete: () => { btn.angle = 0; } });
      this.tweens.add({ targets: btn, alpha: 0.4, duration: 400, delay: 200 });
      const cheer = this.tried.size === 1 ? 'Good try!' : 'So close!';
      // Pioneer: getting a question wrong costs one Z-bolt, once per
      // question, whether or not the hint was looked at.
      let lost = false;
      if (this.band.missCostsEnergy && !this.missCharged) {
        this.missCharged = true;
        lost = this.missCost();
      }
      const lead = lost ? `${cheer} That cost a Z-bolt.` : cheer;
      if (this.q.hint && this.hintsLeft > 0) this.time.delayedCall(350, () => this.showHint(lead));
      else this.result.setText(`${lead} Try another one.`);
      return;
    }

    this.answered = true;
    this.answerBtns.forEach((b, j) => {
      b.disableInteractive();
      if (j === i) b.draw(0x8fd19e);
      else if (!this.tried.has(j)) b.setAlpha(0.5);
    });
    this.tweens.add({ targets: btn, scale: 1.06, duration: 140, yoyo: true, ease: 'Sine.Out' });
    state.giveTreasure(this.levelId, this.item.id);
    // The tally for this difficulty: answered right, it counts toward the
    // biome's companion.
    const qb = LEVELS[this.levelId] && LEVELS[this.levelId].biome;
    if (qb) state.markAnswered(qb, this.q);
    audio.sfx(this, 'correct');
    this.result.setText(`You got it! The ${this.item.name} is yours.
${this.q.fact}`);
    this.cameras.main.flash(250, 255, 236, 150);
    if (this.readBtn) this.readBtn.setVisible(false);
    if (this.hintBtn) this.hintBtn.setVisible(false);

    // The last question of a biome finished before: its Zebonky joins now.
    const b = LEVELS[this.levelId] && LEVELS[this.levelId].biome;
    if (b && state.data.biomeDone && state.data.biomeDone[b] && state.biomeEvent(b) === 'reward') {
      state.data.joinedIn = b;
      state.save();
      this.time.delayedCall(900, () => showCompanionCard(this, b, 'reward', () => this.close(true)));
      return;
    }

    this.time.delayedCall(500, () => {
      const cont = makeButton(this, MAP_W / 2 + 330, (MAP_H + 560) / 2 - 36, 'Continue', () => this.close(true), {
        width: 170, height: 48, size: 20,
      });
      this.card.add(cont);
      this.input.keyboard.once('keydown-ENTER', () => this.close(true));
      this.input.keyboard.once('keydown-SPACE', () => this.close(true));
    });
  }

  // The level takes a Z-bolt, if it can spare one. True if it did.
  missCost() {
    const level = this.parentKey && this.scene.get(this.parentKey);
    return !!(level && level.questionMiss && level.questionMiss());
  }

  showHint(lead = '') {
    if (this.answered || this.hintPop || !this.q.hint || this.hintsLeft <= 0) return;
    // Pioneer gets one look at the hint; then the button goes.
    this.hintsLeft -= 1;
    if (this.hintsLeft <= 0 && this.hintBtn) this.hintBtn.setVisible(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    audio.sfx(this, 'hint');
    const cx = MAP_W / 2;
    const cy = MAP_H / 2 + 20;
    const w = 640;
    const h = 280;
    const pop = this.add.container(0, 0).setDepth(10);
    const shade = this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.35).setOrigin(0);
    const note = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 26);
    g.fillStyle(0xfff6c8, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.lineStyle(5, COLORS.ink, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 26);
    const title = this.add.text(0, -h / 2 + 42, lead ? `${lead} Here's a hint` : 'Hint', heading(30, COLORS.inkCss))
      .setOrigin(0.5);
    const body = this.add.text(0, 8, this.q.hint, text(30, COLORS.inkCss, {
      align: 'center', wordWrap: { width: w - 80 }, lineSpacing: 6,
    })).setOrigin(0.5);
    const tap = this.add.text(0, h / 2 - 32, 'Tap to close', text(18, '#7a5a2a')).setOrigin(0.5);
    note.add([g, title, body, tap]);
    note.setAngle(-1.5).setScale(0.6).setAlpha(0);
    pop.add([shade, note]);
    this.tweens.add({ targets: note, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });

    // Tap anywhere to close; the shade covers the whole screen.
    shade.setInteractive({ useHandCursor: true });
    shade.on('pointerup', () => this.closeHint());
    this.hintPop = pop;
    this.hintOpenedAt = this.time.now;
  }

  closeHint() {
    const pop = this.hintPop;
    // Ignore the same tap that opened it.
    if (!pop || this.time.now - this.hintOpenedAt < 250) return;
    this.hintPop = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.tweens.add({ targets: pop, alpha: 0, duration: 160, onComplete: () => pop.destroy() });
  }

  speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const lines = [this.q.q, ...this.choices.map((c, i) => `${LETTERS[i]}. ${c}`)];
    if (this.hintPop) lines.splice(0, lines.length, `Hint. ${this.q.hint}`);
    synth.speak(new SpeechSynthesisUtterance(lines.join('. ')));
  }

  close(right) {
    if (this.closing) return;
    this.closing = true;
    const done = this.onDone;
    this.scene.stop();
    done && done(right);
  }
}
