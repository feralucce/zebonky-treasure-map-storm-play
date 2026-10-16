// Quiz card overlay. Opened over a paused level by startQuiz() in levelApi.js.
// Right answer: the treasure is saved. Wrong answer: it slips away this visit.

import { LEVELS, MAP_W, MAP_H } from '../data/world.js';
import { QUESTIONS } from '../data/questions.js';
import { state } from '../state.js';
import { COLORS, heading, text, makeButton } from '../theme.js';

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
    this.answered = false;
    this.closing = false; // the scene object is reused for every quiz
  }

  create() {
    const lvl = LEVELS[this.levelId];
    const item = lvl.items[this.itemIndex];
    const bank = QUESTIONS[this.levelId] || [];
    const q = bank[this.itemIndex % bank.length];
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

    card.add(this.add.text(x + 40, y + 30, `${lvl.guide} asks:`, text(20, '#6b3a1a')));
    card.add(this.add.text(x + 40, y + 62, q.q, heading(32, COLORS.inkCss, {
      wordWrap: { width: w - 80 },
      lineSpacing: 6,
    })));

    // Answer buttons, 2 x 2
    this.answerBtns = this.choices.map((choice, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = x + 40 + col * ((w - 100) / 2 + 20) + (w - 100) / 4;
      const by = y + 270 + row * 92;
      const btn = this.makeAnswer(bx, by, (w - 100) / 2, `${LETTERS[i]}.  ${choice}`, () => this.pick(i));
      card.add(btn);
      return btn;
    });

    this.result = this.add.text(MAP_W / 2, y + 448, '', text(22, COLORS.inkCss, {
      align: 'center', wordWrap: { width: w - 80 },
    })).setOrigin(0.5);
    card.add(this.result);

    // Read-aloud for early readers, using the browser's built-in voice.
    if ('speechSynthesis' in window) {
      const read = makeButton(this, x + w - 100, y + h - 36, 'Read to me', () => this.speak(), {
        width: 160, height: 44, size: 18, fill: COLORS.parchment, textColor: COLORS.inkCss,
      });
      card.add(read);
      this.readBtn = read;
    }

    // Keyboard: 1-4 or A-D
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pick(i)));
    LETTERS.forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pick(i)));

    card.setScale(0.85).setAlpha(0);
    card.setPosition(MAP_W * 0.075, MAP_H * 0.075);
    this.tweens.add({ targets: card, scale: 1, x: 0, y: 0, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.card = card;
  }

  makeAnswer(cx, cy, w, label, onClick) {
    const h = 70;
    const c = this.add.container(cx, cy);
    const g = this.add.graphics();
    const t = this.add.text(-w / 2 + 22, 0, label, text(24, COLORS.inkCss, {
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
    if (this.answered || i >= this.choices.length) return;
    this.answered = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const right = this.choices[i] === this.correct;
    const rightIndex = this.choices.indexOf(this.correct);

    this.answerBtns.forEach((b, j) => {
      b.disableInteractive();
      if (j === rightIndex) b.draw(0x8fd19e);
      else if (j === i) b.draw(0xf08a7a);
      else b.setAlpha(0.5);
    });

    if (right) {
      state.giveTreasure(this.levelId, this.item.id);
      this.result.setText(`You got it! The ${this.item.name} is yours.\n${this.q.fact}`);
      this.cameras.main.flash(250, 255, 236, 150);
    } else {
      this.result.setText(`Not quite. It's "${this.correct}".\nThe ${this.item.name} slipped away. Come back and try again!`);
      this.cameras.main.shake(220, 0.006);
    }
    if (this.readBtn) this.readBtn.setVisible(false);

    this.time.delayedCall(500, () => {
      const cont = makeButton(this, MAP_W / 2 + 330, (MAP_H + 560) / 2 - 36, 'Continue', () => this.close(right), {
        width: 170, height: 48, size: 20,
      });
      this.card.add(cont);
      this.input.keyboard.once('keydown-ENTER', () => this.close(right));
      this.input.keyboard.once('keydown-SPACE', () => this.close(right));
    });
  }

  speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const lines = [this.q.q, ...this.choices.map((c, i) => `${LETTERS[i]}. ${c}`)];
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
