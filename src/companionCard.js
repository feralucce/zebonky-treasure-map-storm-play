// The card for a finished biome, shown by the map (scenes/Overworld.js) or
// by a level the moment its last question is answered (scenes/Quiz.js).
//   event 'reward':    the biome's Zebonky joins as a companion; with more
//                      than one, they choose who travels with them.
//   event 'questions': the biome is done, but not every question was
//                      answered; doing that earns its Zebonky.
// onClose runs when the card's button is pressed.

import { MAP_W, MAP_H, BIOMES } from './data/world.js?v=3d1500f';
import { state } from './state.js?v=3d1500f';
import { COLORS, heading, text, makeButton } from './theme.js?v=3d1500f';
import { audio } from './audio.js?v=3d1500f';

export function showCompanionCard(scene, b, event, onClose) {
  const info = BIOMES[b];
  const z = info.zebonky;
  const companions = state.data.companions || [];
  const layer = scene.add.container(0, 0).setDepth(50);
  layer.add(scene.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive());
  const W = 760;
  const H = event === 'reward' && companions.length > 1 ? 600 : 500;
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
  const close = () => {
    layer.destroy();
    if (onClose) onClose();
  };

  if (event === 'questions') {
    layer.add(scene.add.text(MAP_W / 2, y0 + 50, `${info.name} explored!`, heading(34)).setOrigin(0.5));
    layer.add(scene.add.image(MAP_W / 2, y0 + 210, `zebonky-${z.id}`).setScale(0.6).setTint(0x2b1d12).setAlpha(0.55));
    layer.add(scene.add.text(MAP_W / 2, y0 + 340,
      `Answer every question in ${info.name} and the ${z.name} will join you as a companion!`,
      text(22, COLORS.inkCss, { align: 'center', wordWrap: { width: W - 90 } })).setOrigin(0.5, 0));
    layer.add(makeButton(scene, MAP_W / 2, y0 + H - 50, 'OK', close, { width: 160, height: 52, size: 22 }));
    return layer;
  }

  // A Zebonky joins.
  layer.add(scene.add.text(MAP_W / 2, y0 + 50, `The ${z.name} joins you!`, heading(34)).setOrigin(0.5));
  const pic = scene.add.image(MAP_W / 2, y0 + 220, `zebonky-${z.id}`).setScale(0.2);
  layer.add(pic);
  audio.sfx(scene, 'right');
  if (companions.length < 2) {
    scene.tweens.add({ targets: pic, scale: 0.6, duration: 500, ease: 'Back.Out' });
    layer.add(scene.add.text(MAP_W / 2, y0 + 360, `Every question in ${info.name} answered. Your new companion travels with you.`,
      text(20, COLORS.inkCss, { align: 'center', wordWrap: { width: W - 90 } })).setOrigin(0.5, 0));
    layer.add(makeButton(scene, MAP_W / 2, y0 + H - 50, 'Hooray!', close, { width: 180, height: 52, size: 22 }));
    return layer;
  }
  // More than one: choose who travels with you.
  pic.y = y0 + 190;
  scene.tweens.add({ targets: pic, scale: 0.45, duration: 500, ease: 'Back.Out' });
  layer.add(scene.add.text(MAP_W / 2, y0 + 330, 'Choose your companion:', heading(22)).setOrigin(0.5));
  const n = companions.length;
  const tiles = companions.map((cb, i) => {
    const cz = BIOMES[cb].zebonky;
    const t = scene.add.container(MAP_W / 2 + (i - (n - 1) / 2) * 120, y0 + 420);
    const bg = scene.add.graphics();
    t.add([bg, scene.add.image(0, 0, `zebonky-${cz.id}`).setScale(0.28)]);
    t.draw = (on) => {
      bg.clear();
      bg.fillStyle(on ? 0xd6f0dc : 0xf8ecd0, 1);
      bg.fillRoundedRect(-52, -52, 104, 104, 14);
      bg.lineStyle(on ? 5 : 3, on ? COLORS.green : COLORS.ink, 1);
      bg.strokeRoundedRect(-52, -52, 104, 104, 14);
    };
    t.setSize(104, 104).setInteractive({ useHandCursor: true });
    t.on('pointerup', () => {
      state.setCompanion(cb);
      tiles.forEach((o) => o.t.draw(o.b === cb));
    });
    layer.add(t);
    return { b: cb, t };
  });
  tiles.forEach((o) => o.t.draw(o.b === state.data.companion));
  layer.add(makeButton(scene, MAP_W / 2, y0 + H - 46, 'Done', close, { width: 160, height: 52, size: 22 }));
  return layer;
}
