// Brand colours (from zebonky.com) and shared text styles.

export const COLORS = {
  green: 0x4d9e76,
  greenCss: '#4d9e76',
  yellow: 0xf6ea7c,
  yellowCss: '#f6ea7c',
  ink: 0x2b1d12,
  inkCss: '#2b1d12',
  parchment: 0xf3dfb3,
  parchmentCss: '#f3dfb3',
  card: 0xf4a26b,       // quiz card orange, from the mockup
  red: 0xc8553d,
  redCss: '#c8553d',
  white: 0xffffff,
};

export const FONT_HEAD = 'Poppins, "Segoe UI", sans-serif';
export const FONT_BODY = 'Nunito, "Segoe UI", sans-serif';

export function text(size, color = COLORS.inkCss, extra = {}) {
  return {
    fontFamily: FONT_BODY,
    fontSize: `${size}px`,
    fontStyle: '800',
    color,
    ...extra,
  };
}

export function heading(size, color = COLORS.inkCss, extra = {}) {
  return {
    fontFamily: FONT_HEAD,
    fontSize: `${size}px`,
    fontStyle: '800',
    color,
    ...extra,
  };
}

// A chunky rounded button made from Graphics + Text. Works with mouse and touch.
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width || 220;
  const h = opts.height || 56;
  const fill = opts.fill ?? COLORS.green;
  const textColor = opts.textColor || '#ffffff';

  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover) => {
    g.clear();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2 - (hover ? 2 : 0), w, h, 14);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(-w / 2, -h / 2 - (hover ? 2 : 0), w, h, 14);
  };
  draw(false);
  const t = scene.add.text(0, -2, label, text(opts.size || 24, textColor)).setOrigin(0.5);
  container.add([g, t]);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => { draw(true); t.y = -4; });
  container.on('pointerout', () => { draw(false); t.y = -2; });
  container.on('pointerup', () => onClick());
  container.label = t;
  return container;
}
