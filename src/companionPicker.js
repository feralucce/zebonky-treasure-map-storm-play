// The companion tracker (the user, 2026-10-25): every biome's Zebonky in
// map order, for the difficulty played now (each difficulty earns its own). The ones they've unlocked show in colour and can be picked to
// travel with them; the rest are dark silhouettes with "???" until their
// biome's every question is answered. Used by the joining moment
// (showCompanionPicker, with the new one revealed) and by the explorer
// screen's Companion tab (companionGrid).

import { MAP_W, MAP_H, BIOMES } from './data/world.js?v=3ed34b2';
import { state } from './state.js?v=3ed34b2';
import { COLORS, heading, text, makeButton } from './theme.js?v=3ed34b2';
import { audio } from './audio.js?v=3ed34b2';


// Biomes with a Zebonky, in the order they're met on the map.
export const COMPANION_BIOMES = Object.keys(BIOMES).filter((b) => BIOMES[b].zebonky);

const silhouette = (img) => img.setTint(0x2b1d12).setTintMode(Phaser.TintModes.FILL).setAlpha(0.55);
const colour = (img) => img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY).setAlpha(1);

// The row of tiles, centred on cx at y (top). `reveal`: a biome whose tile
// starts as a silhouette and turns into its Zebonky. Returns the container.
export function companionGrid(scene, cx, y, { reveal = null, onPick = null, onReveal = null, tile: TILE = 150 } = {}) {
  const GAP = Math.round(TILE / 9);
  const grid = scene.add.container(0, 0);
  const have = state.companions();
  const n = COMPANION_BIOMES.length;
  const x0 = cx - (n * TILE + (n - 1) * GAP) / 2;
  const tiles = COMPANION_BIOMES.map((b, i) => {
    const z = BIOMES[b].zebonky;
    const t = scene.add.container(x0 + i * (TILE + GAP), y);
    const bg = scene.add.graphics();
    const pic = scene.add.image(TILE / 2, TILE / 2 - 8, `zebonky-${z.id}`);
    pic.setScale(Math.min((TILE - 30) / pic.width, (TILE - 44) / pic.height));
    const name = scene.add.text(TILE / 2, TILE - 18, '???', text(15)).setOrigin(0.5);
    t.add([bg, pic, name]);
    const unlocked = have.includes(b);
    const show = (on) => {
      if (on) {
        colour(pic);
        name.setText(z.who || z.name);
      } else {
        silhouette(pic);
        name.setText('???');
      }
    };
    show(unlocked && b !== reveal);
    t.draw = () => {
      const on = state.companion() === b;
      bg.clear();
      bg.fillStyle(on ? 0xd6f0dc : 0xf8ecd0, 1);
      bg.fillRoundedRect(0, 0, TILE, TILE, 16);
      bg.lineStyle(on ? 5 : 3, on ? COLORS.green : COLORS.ink, have.includes(b) ? 1 : 0.4);
      bg.strokeRoundedRect(0, 0, TILE, TILE, 16);
    };
    if (unlocked) {
      t.setInteractive(new Phaser.Geom.Rectangle(0, 0, TILE, TILE), Phaser.Geom.Rectangle.Contains);
      t.input.cursor = 'pointer';
      t.on('pointerup', () => {
        if (state.companion() === b) return;
        state.setCompanion(b);
        audio.sfx(scene, 'step');
        tiles.forEach((o) => o.draw());
        if (onPick) onPick(b);
      });
    }
    grid.add(t);
    t.reveal = () => {
      const s = pic.scale;
      scene.tweens.add({
        targets: pic, scale: s * 1.25, duration: 260, yoyo: true, ease: 'Sine.InOut',
        onYoyo: () => {
          show(true);
          audio.sfx(scene, 'right');
          if (onReveal) onReveal(b);
        },
      });
    };
    t.biome = b;
    return t;
  });
  tiles.forEach((o) => o.draw());
  if (reveal) {
    const t = tiles.find((o) => o.biome === reveal);
    if (t) scene.time.delayedCall(500, () => t.reveal());
  }
  return grid;
}

// The picker shown when a Zebonky joins: a card with the grid, the new one
// turning from silhouette into colour.
export function showCompanionPicker(scene, b, onClose) {
  const z = BIOMES[b].zebonky;
  const layer = scene.add.container(0, 0).setDepth(50);
  layer.add(scene.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.6).setOrigin(0).setInteractive());
  const W = 940;
  const H = 390;
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
  // Its name shows only as its tile is revealed (the user, 2026-10-25).
  const who = z.who ? `${z.who} the ${z.name}` : `The ${z.name}`;
  const title = scene.add.text(MAP_W / 2, y0 + 48, 'A new companion joins you!', heading(34)).setOrigin(0.5);
  layer.add(title);
  layer.add(scene.add.text(MAP_W / 2, y0 + 94,
    'Your companions. Tap one to have it travel with you.', text(19)).setOrigin(0.5));
  layer.add(companionGrid(scene, MAP_W / 2, y0 + 140, { reveal: b, onReveal: () => title.setText(`${who} joins you!`) }));
  layer.add(makeButton(scene, MAP_W / 2, y0 + H - 50, 'Hooray!', () => {
    layer.destroy();
    if (onClose) onClose();
  }, { width: 180, height: 52, size: 22 }));
  return layer;
}
