// The Difficulty screen, opened by the map's Difficulty button (the user,
// 2026-10-25): one card per band, clicked through with the arrows (or the
// Left and Right keys), each listing what makes it different
// (data/difficulty.js `about`). "Play this way" chooses it; Done or Escape
// closes the screen.

import { MAP_W, MAP_H } from './data/world.js?v=97eab88';
import { DIFFICULTIES } from './data/difficulty.js?v=97eab88';
import { state } from './state.js?v=97eab88';
import { COLORS, heading, text, makeButton } from './theme.js?v=97eab88';
import { audio } from './audio.js?v=97eab88';

export function showDifficultyMenu(scene, onClose) {
  const layer = scene.add.container(0, 0).setDepth(60);
  layer.add(scene.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive());
  const W = 760;
  const H = 580;
  const x0 = (MAP_W - W) / 2;
  const y0 = (MAP_H - H) / 2;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 1);
  g.fillRoundedRect(x0 + 6, y0 + 8, W, H, 26);
  g.fillStyle(COLORS.parchment, 1);
  g.fillRoundedRect(x0, y0, W, H, 26);
  g.lineStyle(4, COLORS.ink, 1);
  g.strokeRoundedRect(x0, y0, W, H, 26);
  layer.add(g);
  layer.add(scene.add.text(MAP_W / 2, y0 + 42, 'Difficulty', heading(34)).setOrigin(0.5));

  // The card in the middle: the band shown now.
  const card = scene.add.container(0, 0);
  layer.add(card);
  const cw = W - 220;
  const cx = (MAP_W - cw) / 2;
  const cy = y0 + 82;
  const ch = 370;
  let at = Math.max(0, DIFFICULTIES.findIndex((d) => d.id === state.difficulty().id));

  const dots = DIFFICULTIES.map((_, i) => {
    const d = scene.add.circle(MAP_W / 2 + (i - (DIFFICULTIES.length - 1) / 2) * 26, cy + ch + 22, 7, COLORS.ink);
    layer.add(d);
    return d;
  });

  const choose = () => {
    const d = DIFFICULTIES[at];
    if (d.id !== state.difficulty().id) {
      state.setDifficulty(d.id);
      audio.sfx(scene, 'step');
    }
    draw();
  };

  const draw = () => {
    card.removeAll(true);
    const d = DIFFICULTIES[at];
    const chosen = d.id === state.difficulty().id;
    const cg = scene.add.graphics();
    cg.fillStyle(chosen ? 0xd6f0dc : 0xf8ecd0, 1);
    cg.fillRoundedRect(cx, cy, cw, ch, 18);
    cg.lineStyle(chosen ? 5 : 3, chosen ? COLORS.green : COLORS.ink, 1);
    cg.strokeRoundedRect(cx, cy, cw, ch, 18);
    card.add(cg);
    card.add(scene.add.text(MAP_W / 2, cy + 36, d.name, heading(30)).setOrigin(0.5));
    card.add(scene.add.text(MAP_W / 2, cy + 74, d.blurb || '', text(18, '#6b4a2e')).setOrigin(0.5));
    // Each line under the real height of the one before, so a line that
    // wraps (wider fonts on some screens) never runs into the next.
    let ly = cy + 106;
    d.about.forEach((line) => {
      card.add(scene.add.text(cx + 40, ly, '•', text(19, COLORS.inkCss)));
      const t = scene.add.text(cx + 62, ly, line, text(19, COLORS.inkCss, { wordWrap: { width: cw - 102 } }));
      card.add(t);
      ly += t.height + 10;
    });
    if (chosen) {
      card.add(scene.add.text(MAP_W / 2, cy + ch - 34, 'Playing this way', heading(20, COLORS.greenCss)).setOrigin(0.5));
    } else {
      card.add(makeButton(scene, MAP_W / 2, cy + ch - 36, 'Play this way', choose, { width: 220, height: 48, size: 20 }));
    }
    dots.forEach((dot, i) => dot.setFillStyle(i === at ? COLORS.green : COLORS.ink, i === at ? 1 : 0.35));
  };

  const step = (by) => {
    at = (at + by + DIFFICULTIES.length) % DIFFICULTIES.length;
    audio.sfx(scene, 'step');
    draw();
  };
  const arrow = (x, label, by) => {
    const b = makeButton(scene, x, cy + ch / 2, label, () => step(by), { width: 64, height: 64, size: 30 });
    layer.add(b);
  };
  arrow(x0 + 56, '<', -1);
  arrow(x0 + W - 56, '>', 1);

  const kb = scene.input.keyboard;
  const left = () => step(-1);
  const right = () => step(1);
  const close = () => {
    kb.off('keydown-LEFT', left);
    kb.off('keydown-RIGHT', right);
    kb.off('keydown-ESC', close);
    layer.destroy();
    if (onClose) onClose();
  };
  kb.on('keydown-LEFT', left);
  kb.on('keydown-RIGHT', right);
  kb.on('keydown-ESC', close);
  layer.add(makeButton(scene, MAP_W / 2, y0 + H - 44, 'Done', close, { width: 160, height: 50, size: 22 }));
  draw();
  return layer;
}
