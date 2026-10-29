// Turns a level drawing (SVG text) into a game layout: { rows, artset }.
//
// 1. The drawing is placed in the page so the browser works out every
//    shape's real colour and position (styles, transforms, groups).
// 2. Markers, doors and numbers are picked out as shapes and removed.
// 3. What's left is painted to a canvas and each 64 px square is sampled to
//    see which legend colour covers most of it.

import { TILE_PX, TERRAIN, MARKERS, DOOR, WAIT, CRATES, rgb } from './legend.js?v=93b28b5';
import { makeNav, missableCrates } from '../src/pathing.js?v=93b28b5';

const INKSCAPE = 'http://www.inkscape.org/namespaces/inkscape';
const SHAPES = 'rect,circle,ellipse,path,polygon,polyline,line';
const MATCH = 70;          // how far off a colour can be and still count
const SAMPLES = 5;         // 5 x 5 sample points per tile
const SOLID_SHARE = 0.5;   // terrain fills a tile when it covers half of it
const STRIP_SHARE = 0.2;   // platforms only need a strip

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

function parseColor(str) {
  const m = /rgba?\(([^)]+)\)/.exec(str || '');
  if (!m) return null;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (parts.length > 3 && parts[3] === 0) return null;
  return parts.slice(0, 3);
}

function nearest(color, list) {
  let best = null;
  let bestD = MATCH;
  list.forEach((item) => {
    const d = dist(color, rgb(item.hex));
    if (d < bestD) { bestD = d; best = item; }
  });
  return best;
}

function isIgnoredLayer(el) {
  if (el.getAttribute('data-designer') === 'ignore') return true;
  if (['guides', 'jump-guides'].includes(el.id)) return true;
  const label = el.getAttributeNS(INKSCAPE, 'label') || '';
  return /grid|key|guide|reference|notes?/i.test(label);
}

function drawingSize(svg) {
  const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0) return { w: vb[2], h: vb[3], x0: vb[0], y0: vb[1] };
  return { w: parseFloat(svg.getAttribute('width')) || 4096, h: parseFloat(svg.getAttribute('height')) || 768, x0: 0, y0: 0 };
}

export async function readDrawing(svgText) {
  const warnings = [];
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('That file is not an SVG drawing.');
  const size = drawingSize(svg);
  const cols = Math.round(size.w / TILE_PX);
  const rows = Math.round(size.h / TILE_PX);
  if (Math.abs(cols * TILE_PX - size.w) > 1 || Math.abs(rows * TILE_PX - size.h) > 1) {
    warnings.push(`The page is ${size.w} x ${size.h} px, not a multiple of 64. It was rounded to ${cols} x ${rows} tiles.`);
  }

  // Put it in the page, off screen, at one drawing unit per pixel.
  const host = document.createElement('div');
  // Kept invisible with opacity (not visibility, which every shape would inherit).
  host.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
  const live = document.importNode(svg, true);
  live.setAttribute('width', size.w);
  live.setAttribute('height', size.h);
  host.appendChild(live);
  document.body.appendChild(host);

  try {
    const origin = live.getBoundingClientRect();
    const scale = origin.width / size.w || 1;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale };
    };
    const onPage = (x, y) => x >= 0 && y >= 0 && x <= size.w && y <= size.h;
    const legendColours = [...TERRAIN, ...MARKERS, WAIT, DOOR].map((t) => rgb(t.hex));

    // Skipped layers (grid, key, guides, notes...). If something in a legend
    // colour sits on the page in one of them, it was probably drawn on the
    // wrong layer: say so, since it won't be in the level.
    live.querySelectorAll('g').forEach((g) => {
      if (!isIgnoredLayer(g) || !g.isConnected) return;
      let stray = 0;
      g.querySelectorAll(SHAPES).forEach((el) => {
        const fill = parseColor(getComputedStyle(el).fill);
        if (!fill || !legendColours.some((c) => dist(fill, c) < MATCH / 2)) return;
        const b = box(el);
        if (onPage(b.x + b.w / 2, b.y + b.h / 2)) stray++;
      });
      if (stray) {
        const name = g.getAttributeNS(INKSCAPE, 'label') || g.id || 'a skipped layer';
        warnings.push(`${stray} shape${stray > 1 ? 's' : ''} in legend colours ${stray > 1 ? 'are' : 'is'} on the page but on the layer "${name}", which the designer skips. Move ${stray > 1 ? 'them' : 'it'} to the Level layer.`);
      }
    });
    live.querySelectorAll('g').forEach((g) => { if (isIgnoredLayer(g)) g.remove(); });
    live.querySelectorAll('metadata, title, desc').forEach((n) => n.remove());

    // Numbers written on doors and waiting points.
    const labels = [];
    live.querySelectorAll('text').forEach((t) => {
      const b = box(t);
      const n = parseInt(t.textContent.trim(), 10);
      if (n >= 1 && n <= 99) labels.push({ n, x: b.x + b.w / 2, y: b.y + b.h / 2 });
      t.remove();
    });
    const labelIn = (b, pad) => labels.find((l) => l.x >= b.x - pad && l.x <= b.x + b.w + pad && l.y >= b.y - pad && l.y <= b.y + b.h + pad);

    const markers = [];
    const doors = [];
    const waits = [];
    const strangers = new Map();
    let offPage = 0;
    live.querySelectorAll(SHAPES).forEach((el) => {
      if (el.closest('defs, clipPath, mask, pattern, symbol, marker')) return;
      const style = getComputedStyle(el);
      const fill = parseColor(style.fill);
      if (!fill || style.display === 'none') {
        el.remove();
        return;
      }
      const b = box(el);
      // Markers, doors and waiting points off the page aren't part of the level.
      const pointLike = [WAIT, DOOR].some((t) => dist(fill, rgb(t.hex)) < MATCH) || nearest(fill, MARKERS);
      if (pointLike && !onPage(b.x + b.w / 2, b.y + b.h / 2)) {
        offPage++;
        el.remove();
        return;
      }
      if (dist(fill, rgb(WAIT.hex)) < MATCH) {
        const label = labelIn(b, 24);
        waits.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, n: label ? label.n : null });
        el.remove();
        return;
      }
      if (dist(fill, rgb(DOOR.hex)) < MATCH) {
        doors.push(b);
        el.remove();
        return;
      }
      const m = nearest(fill, MARKERS);
      if (m) {
        markers.push({ m, x: b.x + b.w / 2, y: b.y + b.h / 2 });
        el.remove();
        return;
      }
      if (!nearest(fill, TERRAIN)) {
        const h = hex(fill);
        if (!/^#F[0-9A-F]F[0-9A-F]F[0-9A-F]$/.test(h)) strangers.set(h, (strangers.get(h) || 0) + 1);
        el.remove();
      }
    });
    if (offPage) warnings.push(`${offPage} marker${offPage > 1 ? 's are' : ' is'} outside the page and ${offPage > 1 ? 'were' : 'was'} skipped. Make the page bigger to include ${offPage > 1 ? 'them' : 'it'}.`);
    strangers.forEach((n, h) => warnings.push(`${n} shape${n > 1 ? 's' : ''} filled ${h} ${n > 1 ? "aren't" : "isn't"} a legend colour and ${n > 1 ? 'were' : 'was'} skipped.`));

    // Paint what's left (terrain only) and sample it.
    const canvas = document.createElement('canvas');
    canvas.width = cols * TILE_PX;
    canvas.height = rows * TILE_PX;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(live)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      ctx.drawImage(img, 0, 0, size.w, size.h);
    } finally {
      URL.revokeObjectURL(url);
    }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const grid = [];
    for (let r = 0; r < rows; r++) {
      const line = [];
      for (let c = 0; c < cols; c++) {
        const counts = {};
        for (let i = 0; i < SAMPLES; i++) {
          for (let j = 0; j < SAMPLES; j++) {
            const px = Math.floor(c * TILE_PX + ((i + 0.5) / SAMPLES) * TILE_PX);
            const py = Math.floor(r * TILE_PX + ((j + 0.5) / SAMPLES) * TILE_PX);
            const k = (py * canvas.width + px) * 4;
            if (pixels[k + 3] < 128) continue;
            const t = nearest([pixels[k], pixels[k + 1], pixels[k + 2]], TERRAIN);
            if (t) counts[t.char] = (counts[t.char] || 0) + 1;
          }
        }
        const total = SAMPLES * SAMPLES;
        let ch = '.';
        let best = 0;
        Object.entries(counts).forEach(([k, n]) => {
          if (k !== '=' && n >= total * SOLID_SHARE && n > best) { ch = k; best = n; }
        });
        if (ch === '.' && (counts['='] || 0) >= total * STRIP_SHARE) ch = '=';
        line.push(ch);
      }
      grid.push(line);
    }
    // A thick platform drawn across two rows becomes one row: the top one.
    for (let r = rows - 1; r > 0; r--) {
      for (let c = 0; c < cols; c++) if (grid[r][c] === '=' && grid[r - 1][c] === '=') grid[r][c] = '.';
    }

    const solid = (r, c) => r >= rows || ['#', 's', 'R', '='].includes(grid[r] && grid[r][c]);
    const clampCell = (x, y) => ({
      c: Math.min(cols - 1, Math.max(0, Math.floor(x / TILE_PX))),
      r: Math.min(rows - 1, Math.max(0, Math.floor(y / TILE_PX))),
    });
    // Out of solid ground, then (if asked) down onto it.
    const settle = (cell, drop) => {
      let { r } = cell;
      while (r > 0 && solid(r, cell.c)) r--;
      if (drop) while (r < rows - 1 && !solid(r + 1, cell.c)) r++;
      return { c: cell.c, r };
    };
    const placed = [];
    const put = (cell, ch, what) => {
      const cur = grid[cell.r][cell.c];
      if (!['.', '~', 'W'].includes(cur)) {
        warnings.push(`${what} landed on a tile that already holds something (column ${cell.c + 1}, row ${cell.r + 1}).`);
      }
      if (placed.some((p) => p.c === cell.c && p.r === cell.r)) {
        warnings.push(`Two markers share column ${cell.c + 1}, row ${cell.r + 1}; one was lost.`);
      }
      grid[cell.r][cell.c] = ch;
      placed.push(cell);
    };

    markers.sort((a, b) => a.x - b.x).forEach(({ m, x, y }) => {
      const cell = settle(clampCell(x, y), m.snap);
      put(cell, m.char, m.label);
    });

    // Doors: numbered ones pair by number, the rest pair left to right.
    const numbered = {};
    const loose = [];
    doors.sort((a, b) => a.x - b.x).forEach((d) => {
      const found = labelIn(d, 16);
      const label = found && found.n <= 9 ? found : null;
      const cell = settle(clampCell(d.x + d.w / 2, d.y + d.h - 8), true);
      if (label) (numbered[label.n] = numbered[label.n] || []).push(cell);
      else loose.push(cell);
    });
    const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !numbered[n]);
    for (let i = 0; i < loose.length; i += 2) {
      const n = free.shift();
      if (n === undefined) { warnings.push('More than 9 door pairs: the extras were skipped.'); break; }
      numbered[n] = loose.slice(i, i + 2);
    }
    const doorPairs = [];
    Object.entries(numbered).forEach(([n, cells]) => {
      if (cells.length !== 2) {
        warnings.push(`Door ${n} has ${cells.length === 1 ? 'no partner' : `${cells.length} doors; it needs exactly 2`}.`);
        return;
      }
      cells.forEach((cell) => put(cell, String(n), `Door ${n}`));
      doorPairs.push({ n: Number(n), cells });
    });

    // The guide's waiting points: numbered first, in number order, then the
    // rest left to right. Each one stands on the ground below it.
    const ordered = [
      ...waits.filter((w) => w.n !== null).sort((a, b) => a.n - b.n),
      ...waits.filter((w) => w.n === null).sort((a, b) => a.x - b.x),
    ];
    const waitCells = ordered.map((w) => settle(clampCell(w.x, w.y), true));

    const count = (ch) => grid.flat().filter((x) => x === ch).length;
    if (count('P') === 0) warnings.push('No start marker (green). The player will start near the left edge.');
    if (count('P') > 1) warnings.push('More than one start marker: the last one wins.');
    if (count('G') === 0) warnings.push("No goal marker (red), so the level can't be finished.");
    if (count('T') !== CRATES) warnings.push(`${count('T')} mystery crate${count('T') === 1 ? '' : 's'} drawn; each level has ${CRATES} questions.`);
    if (count('B') > 1) warnings.push('More than one guide Zebonky: only the last one is used.');
    if (count('B') && !waitCells.length) warnings.push('The guide Zebonky has no waiting points, so it reveals the exit where it stands.');
    if (!count('B') && waitCells.length) warnings.push('Waiting points were drawn but there is no guide Zebonky (purple) to use them.');
    if (count('E') && !count('f')) warnings.push('There are wild Zebonkies but no food to toss. Jumping over still works.');

    const nav = makeNav(grid.map((line) => line.join('')));
    const cellsOf = (ch) => {
      const out = [];
      grid.forEach((line, r) => line.forEach((x, c) => { if (x === ch) out.push({ r, c }); }));
      return out;
    };

    // Every crate should stay within reach: warn when a player can get past
    // it to somewhere they can still finish from but can't get back to it
    // (hidden doors don't count as a way back). Crates are numbered left to
    // right, as the game numbers its questions.
    missableCrates(grid.map((line) => line.join(''))).forEach((t) => {
      warnings.push(`Mystery crate ${t.n} (column ${t.c + 1}, row ${t.r + 1}) can be missed: a player can get past it and still finish, with no way back to it. Add a way up to it, or move it onto the path everyone takes.`);
    });

    // The guide only goes where the player could: check each leg of its route.
    const guideAt = cellsOf('B');
    if (guideAt.length && waitCells.length) {
      let from = guideAt[guideAt.length - 1];
      waitCells.forEach((w, i) => {
        if (!nav.find(from, w)) {
          warnings.push(`The guide can't get ${i ? `from waiting point ${i}` : 'from its start'} to waiting point ${i + 1} on a route the player could take (a jump too high or too far?). It will get as close as it can and wait there.`);
        }
        from = w;
      });
    }

    return {
      rows: grid.map((line) => line.join('')),
      waits: waitCells,
      cols,
      rowsCount: rows,
      doorPairs,
      warnings,
    };
  } finally {
    host.remove();
  }
}
