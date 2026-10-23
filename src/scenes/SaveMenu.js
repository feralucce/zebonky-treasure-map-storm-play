// Save and load, opened from the map (the Save button), or by a save link.
// Shows a QR code of this device's save link (scan it with the other
// device's camera), emails the save file to a grown-up, and loads a save
// file. Nothing goes online: the link, QR code or file carries the progress.
//
// Modes: 'main' (QR code and buttons), 'gate' (a grown-up answers a sum
// before anything opens an email app), 'confirm' (load this save? it
// replaces progress on this device), 'note' (a message and OK).

import { MAP_W, MAP_H } from '../data/world.js';
import { state } from '../state.js';
import { COLORS, heading, text, makeButton } from '../theme.js';
import { qrModules, emailSave, pickSaveFile } from '../savecode.js';

const CARD_W = 900;
const CARD_H = 600;
const QR_SIZE = 300;

export class SaveMenuScene extends Phaser.Scene {
  constructor() {
    super('SaveMenu');
  }

  init(data) {
    this.mode = data.mode || 'main';
    this.loadData = data.loadData || null;   // for 'confirm'
    this.note = data.note || '';             // for 'note'
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
    this.layer = this.add.container(0, 0);
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.show(this.mode);
  }

  show(mode) {
    this.mode = mode;
    this.layer.removeAll(true);
    this[`build_${mode}`]();
  }

  add_(obj) {
    this.layer.add(obj);
    return obj;
  }

  title(t, sub) {
    this.add_(this.add.text(MAP_W / 2, this.y0 + 46, t, heading(34)).setOrigin(0.5));
    if (sub) this.add_(this.add.text(MAP_W / 2, this.y0 + 94, sub, text(18, '#6b4a2e', { align: 'center', wordWrap: { width: CARD_W - 80 } })).setOrigin(0.5));
  }

  button(x, y, label, onClick, opts = {}) {
    return this.add_(makeButton(this, x, y, label, onClick, { width: 280, height: 56, size: 22, ...opts }));
  }

  plainButton(x, y, label, onClick, opts = {}) {
    return this.button(x, y, label, onClick, { fill: COLORS.parchment, textColor: COLORS.inkCss, ...opts });
  }

  // ---------- modes ----------

  build_main() {
    this.title('Play on another device');
    // The QR code of this device's save link, on a white square.
    const qx = this.x0 + 70;
    const qy = this.y0 + 130;
    const modules = qrModules();
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(qx - 16, qy - 16, QR_SIZE + 32, QR_SIZE + 32, 14);
    if (modules) {
      const n = modules.length;
      const cell = QR_SIZE / n;
      g.fillStyle(0x000000, 1);
      modules.forEach((row, r) => row.forEach((dark, c) => {
        if (dark) g.fillRect(qx + c * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
      }));
    }
    this.add_(g);
    this.add_(this.add.text(qx + QR_SIZE / 2, qy + QR_SIZE + 40,
      'Scan with the other\ndevice\'s camera', text(18, COLORS.inkCss, { align: 'center' })).setOrigin(0.5, 0));

    const bx = this.x0 + CARD_W - 230;
    this.add_(this.add.text(bx, this.y0 + 150, 'Or send it to a grown-up:', text(18, '#6b4a2e')).setOrigin(0.5));
    this.button(bx, this.y0 + 200, 'Email my save', () => this.show('gate'));
    this.add_(this.add.text(bx, this.y0 + 290, 'Got a save file?', text(18, '#6b4a2e')).setOrigin(0.5));
    this.plainButton(bx, this.y0 + 340, 'Load a save file', () => pickSaveFile((res) => this.loaded(res)));
    this.plainButton(bx, this.y0 + CARD_H - 70, 'Close', () => this.close(), { width: 180 });
  }

  // A grown-up check before anything opens an email app: a sum with four
  // answers to tap.
  build_gate() {
    const a = Phaser.Math.Between(6, 9);
    const b = Phaser.Math.Between(4, 9);
    const right = a + b;
    const answers = Phaser.Utils.Array.Shuffle([right, right + 1, right - 2, right + 3]);
    this.title('Ask a grown-up', 'Grown-ups: answer this to email the save to yourself.');
    this.add_(this.add.text(MAP_W / 2, this.y0 + 210, `What is ${a} + ${b}?`, heading(40)).setOrigin(0.5));
    answers.forEach((n, i) => {
      this.button(MAP_W / 2 - 300 + i * 200, this.y0 + 330, String(n), () => {
        if (n === right) this.sendEmail();
        else this.show('main');
      }, { width: 150, height: 70, size: 32 });
    });
    this.plainButton(MAP_W / 2, this.y0 + CARD_H - 70, 'Back', () => this.show('main'), { width: 180 });
  }

  build_confirm() {
    const d = this.loadData;
    const cleared = Object.values(d.cleared || {}).filter((c) => c && (c.normal || c.secret)).length;
    const bonus = Object.values(d.cleared || {}).filter((c) => c && c.secret).length;
    this.title('Load this saved game?', 'It replaces the progress on this device.');
    this.add_(this.add.text(MAP_W / 2, MAP_H / 2 - 10,
      `Levels cleared: ${cleared}\nBonus level doors found: ${bonus}`, text(26, COLORS.inkCss, { align: 'center' })).setOrigin(0.5));
    const by = this.y0 + CARD_H - 100;
    this.button(MAP_W / 2 - 160, by, 'Yes, load it', () => this.loadSave(d), { width: 260 });
    this.plainButton(MAP_W / 2 + 160, by, 'No', () => this.close(), { width: 200 });
  }

  build_note() {
    this.title('Play on another device');
    this.add_(this.add.text(MAP_W / 2, MAP_H / 2 - 20, this.note, text(24, COLORS.inkCss, { align: 'center', wordWrap: { width: CARD_W - 120 } })).setOrigin(0.5));
    this.button(MAP_W / 2, this.y0 + CARD_H - 100, 'OK', () => this.show('main'), { width: 160 });
  }

  // ---------- actions ----------

  sendEmail() {
    emailSave().then((how) => {
      if (how === 'cancelled') { this.show('main'); return; }
      this.note = how === 'shared'
        ? 'Sent! On the other device, open the email and tap the link, or load the attached file.'
        : 'Your email app should open with a link in the message. The save file was also downloaded, in case you want to attach it.';
      this.show('note');
    });
  }

  loaded(res) {
    if (!res.ok) {
      this.note = res.reason;
      this.show('note');
      return;
    }
    this.loadData = res.data;
    this.show('confirm');
  }

  // (Not "load": Phaser scenes already have a `load`, the file loader.)
  loadSave(data) {
    state.replaceWith(data);
    this.scene.stop();
    this.scene.get('Overworld').scene.restart();
  }

  close() {
    this.scene.stop();
    this.scene.resume('Overworld');
  }
}
