// The card for a finished biome, shown by the map (scenes/Overworld.js) or
// by a level the moment its last question is answered (scenes/Quiz.js).
//   event 'reward':    the biome's Zebonky joins as a companion: the
//                      companion picker, with it revealed.
//   event 'questions': the biome is done, but not every question was
//                      answered; doing that earns its Zebonky.
// onClose runs when the card's button is pressed.

import { MAP_W, MAP_H, BIOMES } from './data/world.js?v=c1447cb';
import { COLORS, heading, text, makeButton } from './theme.js?v=c1447cb';
import { showCompanionPicker } from './companionPicker.js?v=c1447cb';

export function showCompanionCard(scene, b, event, onClose) {
  // A Zebonky joins: the companion picker, the new one revealed
  // (companionPicker.js).
  if (event === 'reward') return showCompanionPicker(scene, b, onClose);
  const info = BIOMES[b];
  const z = info.zebonky;
  const layer = scene.add.container(0, 0).setDepth(50);
  layer.add(scene.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive());
  const W = 760;
  const H = 500;
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

  layer.add(scene.add.text(MAP_W / 2, y0 + 50, `${info.name} explored!`, heading(34)).setOrigin(0.5));
  layer.add(scene.add.image(MAP_W / 2, y0 + 210, `zebonky-${z.id}`).setScale(0.6).setTint(0x2b1d12).setAlpha(0.55));
  layer.add(scene.add.text(MAP_W / 2, y0 + 340,
    `Answer every question in ${info.name} and its Zebonky will join you as a companion!`,
    text(22, COLORS.inkCss, { align: 'center', wordWrap: { width: W - 90 } })).setOrigin(0.5, 0));
  layer.add(makeButton(scene, MAP_W / 2, y0 + H - 50, 'OK', close, { width: 160, height: 52, size: 22 }));
  return layer;
}
