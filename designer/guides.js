// Artist guides: full-resolution sheets made from a level drawing, for the
// artist to paint on. One for the background (the whole level at 1:1, or a
// strip that repeats), one with a labelled space for every tile and
// dressing picture the art set needs.
//
// Both are SVGs with two Inkscape layers: an empty one to paint on and a
// locked guide layer over it. The same SVG renders to a PNG for painting
// apps. Each slot's position is stored in the <metadata> block, so a
// painted sheet can be cut back into an art set later.

import { TILE_PX as TILE } from './legend.js?v=c726f9d';
import { solidRole, platformRole } from '../src/data/artsets.js?v=c726f9d';
import { MAP_W, MAP_H } from '../src/data/world.js?v=c726f9d';

const SOLID = '#sR';
const FONT = 'Nunito, Arial, sans-serif';
// How fast a repeating backdrop scrolls against the level (the art sets use 0.3).
export const TILE_SCROLL = 0.3;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- reading the level ----------

// Which tile pictures the level needs, and how often.
export function analyse(rows) {
  const cols = Math.max(...rows.map((r) => r.length));
  const at = (r, c) => (rows[r] && rows[r][c]) || '.';
  const solid = (r, c) => SOLID.includes(at(r, c));
  const plat = (r, c) => at(r, c) === '=';

  // Ground joined to the bottom of the level is ground; the rest floats
  // (the game draws it as treetops: "air ground").
  const grounded = new Set();
  const last = rows.length - 1;
  const queue = [];
  for (let c = 0; c < cols; c++) if (solid(last, c)) { grounded.add(`${c},${last}`); queue.push([last, c]); }
  while (queue.length) {
    const [r, c] = queue.pop();
    [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
      const k = `${nc},${nr}`;
      if (nr >= 0 && nr <= last && nc >= 0 && nc < cols && !grounded.has(k) && solid(nr, nc)) {
        grounded.add(k);
        queue.push([nr, nc]);
      }
    });
  }

  const count = { ground: {}, sand: {}, rock: {}, air: {}, platform: {} };
  const bump = (set, key) => { count[set][key] = (count[set][key] || 0) + 1; };
  const floorTops = {};
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '#' && !grounded.has(`${c},${r}`)) {
      const open = [!solid(r - 1, c), !solid(r + 1, c), !solid(r, c - 1), !solid(r, c + 1)];
      bump('air', open.map((o) => (o ? 1 : 0)).join(''));
    } else if (SOLID.includes(ch)) {
      let role = solidRole(solid, r, c);
      if (role === 'fill') {
        let depth = 0;
        while (depth < 3 && solid(r - depth - 1, c)) depth++;
        if (depth >= 3) role = 'deep';
      }
      bump({ '#': 'ground', s: 'sand', R: 'rock' }[ch], role);
      if (role.startsWith('top') && grounded.has(`${c},${r}`)) floorTops[r] = (floorTops[r] || 0) + 1;
    } else if (ch === '=') {
      bump('platform', platformRole(plat, r, c));
    }
  }));
  // The most common floor height: where a repeating backdrop's ground sits.
  const floorRow = Number(Object.entries(floorTops).sort((a, b) => b[1] - a[1])[0]?.[0] ?? last);
  return { cols, rowsCount: rows.length, at, solid, grounded, count, floorRow };
}

// ---------- shared drawing bits ----------

// Guides are made at twice game size, so the art can be scaled down cleanly
// (or used as is on sharper screens). The guide is laid out in game pixels
// and scaled up; the Art layer is at the full 2x size.
export const ART_SCALE = 2;

// Returns the finished guide at ART_SCALE: { svg, w, h } in sheet pixels.
function svgDoc(w, h, meta, guide, note) {
  const S = ART_SCALE;
  const W = w * S;
  const H = h * S;
  const scaled = { ...meta, scale: S, width: W, height: H, game_width: w, game_height: h };
  if (meta.slots) scaled.slots = meta.slots.map((s) => ({ ...s, x: s.x * S, y: s.y * S, w: s.w * S, h: s.h * S }));
  if (meta.floor_y != null) scaled.floor_y = meta.floor_y * S;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<metadata id="tms-guide">${esc(JSON.stringify(scaled))}</metadata>
<!-- ${esc(note)}. Drawn at ${S}x game size: ${S} sheet pixels to one game pixel. -->
<g inkscape:groupmode="layer" id="art" inkscape:label="Art (paint here)"></g>
<g inkscape:groupmode="layer" id="guide" inkscape:label="Guide (hide before saving the art)" sodipodi:insensitive="true" style="font-family:${FONT}">
<g transform="scale(${S})">
${guide}
</g>
</g>
</svg>
`;
  return { svg, w: W, h: H };
}

function label(x, y, text, size = 22, fill = '#2b1d12', anchor = 'start', weight = 800) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" stroke="#fffaf0" stroke-width="${size / 5}" paint-order="stroke">${esc(text)}</text>`;
}

// The level's shapes, see-through, so the artist can paint around them.
function silhouette(info, x0 = 0, maxCols = info.cols) {
  const out = [];
  const { at, grounded } = info;
  for (let r = 0; r < info.rowsCount; r++) {
    for (let c = 0; c < maxCols && c < info.cols; c++) {
      const ch = at(r, c);
      const x = x0 + c * TILE;
      const y = r * TILE;
      if (SOLID.includes(ch)) {
        const air = ch === '#' && !grounded.has(`${c},${r}`);
        const fill = air ? '#1f9e7a' : { '#': '#2b1d12', s: '#c79a45', R: '#6b6b6b' }[ch];
        out.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="${fill}" fill-opacity="0.38"/>`);
      } else if (ch === '=') {
        out.push(`<rect x="${x}" y="${y}" width="${TILE}" height="28" fill="#8B4513" fill-opacity="0.55"/>`);
      } else if (ch === '~' || ch === 'W') {
        out.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="#0050FF" fill-opacity="0.22"/>`);
      } else if ('PGS'.includes(ch)) {
        const t = { P: 'Start', G: 'Exit', S: 'Bonus level door' }[ch];
        out.push(`<circle cx="${x + TILE / 2}" cy="${y + TILE / 2}" r="22" fill="${{ P: '#00B050', G: '#FF0000', S: '#FF00FF' }[ch]}" fill-opacity="0.7"/>`);
        out.push(label(x + TILE / 2, y - 6, t, 20, '#2b1d12', 'middle'));
      }
    }
  }
  return out.join('\n');
}

function grid(w, h) {
  const lines = [];
  for (let x = 0; x <= w; x += TILE) lines.push(`M${x} 0V${h}`);
  for (let y = 0; y <= h; y += TILE) lines.push(`M0 ${y}H${w}`);
  return `<path d="${lines.join('')}" stroke="#2b1d12" stroke-opacity="0.12" stroke-width="1" fill="none"/>`;
}

function keyBox(x, y, items) {
  const rowH = 30;
  const h = items.length * rowH + 20;
  const parts = [`<rect x="${x}" y="${y}" width="420" height="${h}" rx="12" fill="#fffaf0" fill-opacity="0.92" stroke="#2b1d12" stroke-width="2"/>`];
  items.forEach(([fill, text, dash], i) => {
    const yy = y + 14 + i * rowH;
    parts.push(dash
      ? `<path d="M${x + 16} ${yy + 10}h34" stroke="${fill}" stroke-width="4" stroke-dasharray="${dash}"/>`
      : `<rect x="${x + 16}" y="${yy}" width="34" height="20" fill="${fill}" fill-opacity="0.6"/>`);
    parts.push(label(x + 62, yy + 17, text, 18, '#2b1d12', 'start', 700));
  });
  return parts.join('\n');
}

// ---------- background guide ----------

// mode: 'whole' (the entire level, locked to it 1:1), 'tile' (a strip that
// repeats edge to edge) or 'mirror' (a strip whose every other copy is
// flipped left to right, so its edges always join).
export function backgroundGuide(rows, mode, name = 'level') {
  if (mode === 'foreground') return foregroundGuide(name);
  const info = analyse(rows);
  const levelW = info.cols * TILE;
  const h = info.rowsCount * TILE;
  const w = mode === 'whole' ? levelW : Math.ceil((2 * MAP_W) / TILE) * TILE;
  const floorY = info.floorRow * TILE;
  const g = [];

  g.push(grid(w, h));
  if (mode === 'whole') {
    g.push(silhouette(info));
    // One screen's worth, starting at each screen-width step.
    for (let x = 0, n = 1; x < w; x += MAP_W, n++) {
      g.push(`<path d="M${x} 0V${h}" stroke="#d6336c" stroke-width="3" stroke-dasharray="18 12" stroke-opacity="0.6"/>`);
      g.push(label(x + 12, 34, `Screen ${n}`, 22, '#d6336c'));
    }
    g.push(keyBox(24, 60, [
      ['#2b1d12', 'Ground'],
      ['#1f9e7a', 'Air ground (treetops)'],
      ['#8B4513', 'Platform'],
      ['#0050FF', 'Water'],
      ['#d6336c', 'One screen wide', '18 12'],
      ['#fffaf0', `Sheet is ${ART_SCALE}x game size`],
    ]));
  } else {
    // The level's main floor height, and how tall one screen is.
    g.push(`<path d="M0 ${floorY}H${w}" stroke="#2b1d12" stroke-width="4" stroke-dasharray="24 12"/>`);
    g.push(label(24, floorY - 12, 'Main floor of the level: paint your ground line here', 22));
    g.push(`<rect x="0" y="${Math.max(0, floorY - MAP_H + 2 * TILE)}" width="${MAP_W}" height="${Math.min(MAP_H, h)}" fill="none" stroke="#d6336c" stroke-width="3" stroke-dasharray="18 12"/>`);
    g.push(label(16, Math.max(0, floorY - MAP_H + 2 * TILE) + 32, 'One screen', 22, '#d6336c'));
    // Tile rows, so heights can be matched against the level drawing.
    for (let r = 5; r < info.rowsCount; r += 5) {
      g.push(`<path d="M0 ${r * TILE}h40" stroke="#2b1d12" stroke-width="3"/>`);
      g.push(label(46, r * TILE + 7, `row ${r}`, 18, '#2b1d12', 'start', 700));
    }
    // The edges and what they meet.
    const edge = 96;
    if (mode === 'tile') {
      g.push(`<rect x="0" y="0" width="${edge}" height="${h}" fill="#ffc93c" fill-opacity="0.25"/>`);
      g.push(`<rect x="${w - edge}" y="0" width="${edge}" height="${h}" fill="#ffc93c" fill-opacity="0.25"/>`);
      g.push(label(w / 2, 40, 'Perfect tiling: this picture repeats edge to edge.', 26, '#2b1d12', 'middle'));
      g.push(label(w / 2, 72, 'The right edge runs straight into the left edge, so the gold strips must match.', 20, '#2b1d12', 'middle', 700));
    } else {
      const tick = (x) => `<path d="M${x} 0V${h}" stroke="#4d9e76" stroke-width="5" stroke-dasharray="6 10"/>`;
      g.push(tick(2), tick(w - 2));
      g.push(label(w / 2, 40, 'Reverse tiling: every other copy is flipped left to right.', 26, '#2b1d12', 'middle'));
      g.push(label(w / 2, 72, 'Each edge meets its own mirror image, so edges join by themselves. Avoid text and one-sided shapes near them.', 20, '#2b1d12', 'middle', 700));
    }
    g.push(label(w / 2, 104, `Scrolls at ${TILE_SCROLL} of the player's speed and repeats across the whole level, at the level's full height. Sheet is ${ART_SCALE}x game size.`, 18, '#2b1d12', 'middle', 700));
  }

  const meta = {
    kind: 'background', mode, level: name, width: w, height: h, tile: TILE,
    screen: [MAP_W, MAP_H], floor_y: floorY,
    scroll: mode === 'whole' ? 1 : TILE_SCROLL, mirror_repeat: mode === 'mirror',
  };
  const titles = { whole: 'whole level, 1:1', tile: 'perfect tiling', mirror: 'reverse tiling' };
  return svgDoc(w, h, meta, g.join('\n'), `Background guide (${titles[mode]}) for ${name}`);
}

// ---------- foreground guide ----------

// Speed and softness of the foreground in the jungle art sets.
export const FG_SCROLL = 1.6;
export const FG_BLUR = 6;

// One screen tall, two wide: leaves along the bottom, branches along the
// top, the middle left clear for play. It's pinned to the screen, so the
// same picture works for any level.
export function foregroundGuide(name = 'level') {
  const w = Math.ceil((2 * MAP_W) / TILE) * TILE;
  const h = MAP_H;
  const top = Math.round(h * 0.2);
  const bottom = Math.round(h * 0.75);
  const g = [grid(w, h)];
  g.push(`<rect x="0" y="0" width="${w}" height="${top}" fill="#4d9e76" fill-opacity="0.18"/>`);
  g.push(`<rect x="0" y="${bottom}" width="${w}" height="${h - bottom}" fill="#4d9e76" fill-opacity="0.18"/>`);
  g.push(`<path d="M0 ${top}H${w}M0 ${bottom}H${w}" stroke="#4d9e76" stroke-width="3" stroke-dasharray="18 10"/>`);
  g.push(label(MAP_W / 2, top - 14, 'Branches and hanging leaves: from the top edge down to about here', 22, '#2b1d12', 'middle'));
  g.push(label(MAP_W / 2, bottom + 34, 'Leaves and fronds: from the bottom edge up to about here', 22, '#2b1d12', 'middle'));
  g.push(label(MAP_W / 2, h / 2 - 30, 'Keep clear: the play area', 30, '#8a7d6b', 'middle'));
  g.push(label(MAP_W / 2, h / 2 + 8, `Paint it sharp. The game blurs it (${FG_BLUR} px) and slides it past ${FG_SCROLL}x as fast as the level, in front of the player.`, 18, '#8a7d6b', 'middle', 700));
  g.push(label(MAP_W / 2, h / 2 + 36, 'Every other copy is flipped left to right, so the edges join by themselves. It is pinned to the screen in every level.', 18, '#8a7d6b', 'middle', 700));
  // What sits on top of it on the first screen.
  const zone = (x, y, zw, zh, text) => {
    g.push(`<rect x="${x}" y="${y}" width="${zw}" height="${zh}" fill="none" stroke="#d6336c" stroke-width="2" stroke-dasharray="8 6"/>`);
    g.push(label(x + 8, y + zh / 2 + 6, text, 16, '#d6336c', 'start', 700));
  };
  zone(8, 8, 560, 80, 'Energy bar and level name');
  zone(MAP_W - 260, 8, 250, 70, 'Food count, Map');
  zone(20, h - 140, 260, 120, 'Phone buttons');
  zone(MAP_W - 320, h - 150, 310, 140, 'Phone buttons');
  g.push(`<path d="M${MAP_W} 0V${h}" stroke="#d6336c" stroke-width="3" stroke-dasharray="18 12"/>`);
  g.push(label(MAP_W + 12, h - 16, 'End of one screen', 18, '#d6336c'));
  const meta = { kind: 'foreground', level: name, width: w, height: h, tile: TILE, screen: [MAP_W, MAP_H], scroll: FG_SCROLL, blur: FG_BLUR, mirror_repeat: true };
  return svgDoc(w, h, meta, g.join('\n'), 'Foreground guide (leaves and branches)');
}

// ---------- tile and dressing sheet ----------

const GROUND_ROLES = [
  ['top_left', 'Top left corner', 1],
  ['top_mid', 'Top', 4],
  ['top_right', 'Top right corner', 1],
  ['top_single', 'Top, one tile wide', 1],
  ['side_left', 'Left side', 2],
  ['side_right', 'Right side', 2],
  ['fill', 'Inside', 4],
  ['deep', 'Deep inside (3+ down)', 4],
];
const PLATFORM_ROLES = [['left', 'Left end', 1], ['mid', 'Middle', 3], ['right', 'Right end', 1], ['single', 'One tile', 1]];
const DRESSING = [
  ['ground_plants', 'Ground plants: stand on the grass', 4, 256, 192, 'bottom'],
  ['hangers', 'Hangers: under ledges, platforms', 3, 224, 160, 'top'],
  ['scatter', 'Scatter: small, on grass', 4, 128, 96, 'bottom'],
  ['platform_decor', 'Platform toppers: drape over a plank', 3, 128, 64, 'top'],
];
const sideWords = (key) => {
  const names = ['top', 'bottom', 'left', 'right'];
  const open = names.filter((_, i) => key[i] === '1');
  return open.length ? `open ${open.join(' + ')}` : 'surrounded';
};

export function tileSheet(rows, name = 'level') {
  const info = analyse(rows);
  const W = 1920;
  const M = 64;
  const g = [];
  const slots = [];
  let y = 150;

  g.push(label(M, 70, `Tile and dressing sheet: ${name}`, 40));
  g.push(label(M, 112, `Paint each picture to fill its box. The sheet is ${ART_SCALE}x game size, so a ground tile is ${TILE * ART_SCALE} px square. Dashed boxes: this level does not use that shape yet. Variations: the game picks between them.`, 18, '#2b1d12', 'start', 700));

  // Lays out a row of boxes, wrapping at the page edge.
  function section(title, items) {
    g.push(label(M, y + 30, title, 30));
    y += 64;
    let x = M;
    let rowH = 0;
    items.forEach((it) => {
      // Each slot gets a cell wide enough for its caption.
      const cell = Math.max(it.w, it.cell || 170);
      if (x + cell > W - M) { x = M; y += rowH + 84; rowH = 0; }
      it.draw(x, y);
      slots.push({ id: it.id, x, y, w: it.w, h: it.h, file: it.file, set: it.set, role: it.role });
      x += cell + 24;
      rowH = Math.max(rowH, it.h);
    });
    y += rowH + 90;
  }

  // cap: one or two caption lines under the box.
  const box = (x, y0, w, h, used, cap) => [
    `<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="${used ? '#ffffff' : '#f3efe4'}" stroke="#2b1d12" stroke-width="2" stroke-dasharray="${used ? 'none' : '8 6'}"/>`,
    ...[].concat(cap).map((line, i) => label(x, y0 + h + 22 + i * 20, line, 16, used ? '#2b1d12' : '#8a7d6b', 'start', i ? 600 : 700)),
  ].join('\n');

  function tileItems(setName, roles, counts, tileH = TILE) {
    const items = [];
    roles.forEach(([role, words, variants]) => {
      const used = counts[role] || 0;
      for (let v = 1; v <= variants; v++) {
        const cap = v === 1 ? [words, `used ${used}x`] : [`${words} ${v}`, 'variation'];
        const file = `${setName}_${role}_${v}.png`;
        items.push({
          id: `${setName}.${role}.${v}`, set: setName, role, file, w: TILE, h: tileH,
          draw: (x, yy) => {
            g.push(box(x, yy, TILE, tileH, used, cap));
            // Mark the edges that show (grass on top, cliff faces at the sides).
            if (role.startsWith('top')) g.push(`<path d="M${x} ${yy + 3}h${TILE}" stroke="#4d9e76" stroke-width="6"/>`);
            if (role === 'top_left' || role === 'top_single' || role === 'side_left') g.push(`<path d="M${x + 3} ${yy}v${tileH}" stroke="#b5482b" stroke-width="5"/>`);
            if (role === 'top_right' || role === 'top_single' || role === 'side_right') g.push(`<path d="M${x + TILE - 3} ${yy}v${tileH}" stroke="#b5482b" stroke-width="5"/>`);
          },
        });
      }
    });
    return items;
  }

  section('Ground', tileItems('ground', GROUND_ROLES, info.count.ground));
  if (Object.keys(info.count.sand).length) section('Sand', tileItems('sand', GROUND_ROLES, info.count.sand));
  if (Object.keys(info.count.rock).length) section('Cliff rock', tileItems('rock', GROUND_ROLES, info.count.rock));

  // Air ground: a 2 x 2 block per shape, so neighbouring leaves join.
  const airKeys = [];
  for (let n = 0; n < 16; n++) airKeys.push(n.toString(2).padStart(4, '0'));
  airKeys.sort((a, b) => (info.count.air[b] || 0) - (info.count.air[a] || 0));
  section('Air ground: floating ledges (the game shows these as treetops)', airKeys.map((key) => {
    const used = info.count.air[key] || 0;
    return {
      id: `air.${key}`, set: 'canopy', role: key, file: `air_${key}.png`, w: TILE * 2, h: TILE * 2, cell: 250,
      draw: (x, yy) => {
        g.push(box(x, yy, TILE * 2, TILE * 2, used, [sideWords(key), `used ${used}x`]));
        g.push(`<path d="M${x + TILE} ${yy}v${TILE * 2}M${x} ${yy + TILE}h${TILE * 2}" stroke="#2b1d12" stroke-opacity="0.25"/>`);
        const S = TILE * 2;
        const edges = [`M${x} ${yy + 3}h${S}`, `M${x} ${yy + S - 3}h${S}`, `M${x + 3} ${yy}v${S}`, `M${x + S - 3} ${yy}v${S}`];
        edges.forEach((d, i) => { if (key[i] === '1') g.push(`<path d="${d}" stroke="#1f9e7a" stroke-width="6"/>`); });
      },
    };
  }));

  section('Platforms (jump through from below, 28 px tall)', tileItems('platform', PLATFORM_ROLES, info.count.platform, 28));

  section('Dressing (scenery only, behind the player)', DRESSING.flatMap(([role, words, n, w, h, attach]) => {
    const items = [];
    for (let v = 1; v <= n; v++) {
      items.push({
        id: `dressing.${role}.${v}`, set: 'dressing', role, file: `${role}_${v}.png`, w, h,
        draw: (x, yy) => {
          g.push(box(x, yy, w, h, true, v === 1 ? words.split(': ') : [`${role.replace(/_/g, ' ')} ${v}`, 'variation']));
          const ly = attach === 'bottom' ? yy + h - 10 : yy + 10;
          g.push(`<path d="M${x} ${ly}h${w}" stroke="#4d9e76" stroke-width="3" stroke-dasharray="10 6"/>`);
          g.push(label(x + w - 8, attach === 'bottom' ? ly - 8 : ly + 22, attach === 'bottom' ? 'ground line' : 'hangs from here', 14, '#4d9e76', 'end', 700));
        },
      });
    }
    return items;
  }));

  const H = Math.ceil(y / TILE) * TILE;
  const meta = { kind: 'tile-sheet', level: name, width: W, height: H, tile: TILE, slots };
  return svgDoc(W, H, meta, g.join('\n'), `Tile and dressing sheet for ${name}`);
}

// ---------- files ----------

// The guide as a picture: 'png' (see-through where nothing is drawn) or
// 'jpg' (on white, as JPG has no transparency).
export function svgToImage(svg, w, h, type = 'png') {
  const jpg = type === 'jpg';
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      if (jpg) {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
      }
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error(`${jpg ? 'JPG' : 'PNG'} failed`))),
        jpg ? 'image/jpeg' : 'image/png', jpg ? 0.92 : undefined);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not draw the guide')); };
    img.src = url;
  });
}
