// The artist's files, taken as they come back: pictures painted at 2x on
// the designer's guides. Turned into game-size art for test play.
//
// - A background (solid all over): if it's one strip pasted across again
//   and again, one copy is cut out to repeat in the game; otherwise the
//   whole picture is used.
// - Dressing (see-through, painted on the whole-level guide with the guide
//   still showing): the same guide is drawn again here and taken away, so
//   only the artist's plants, rocks and vines are left, 1:1 with the level.
//
// Everything comes out at game size (the guides are 2x) in pieces narrow
// enough for any graphics card.

import { backgroundGuide, svgToImage, ART_SCALE } from './guides.js?v=cafacdb';

const PIECE = 1024;        // game px per dressing piece
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const ctx = (cv) => cv.getContext('2d', { willReadFrequently: true });

// Mostly solid pixels: a background. Mostly see-through: dressing.
async function kindOf(bitmap) {
  const cv = canvas(256, 64);
  const g = ctx(cv);
  g.drawImage(bitmap, 0, 0, 256, 64);
  const a = g.getImageData(0, 0, 256, 64).data;
  let solid = 0;
  for (let i = 3; i < a.length; i += 4) if (a[i] > 250) solid++;
  return solid / (256 * 64) > 0.9 ? 'background' : 'dressing';
}

// A picture shrunk to game size with no smoothing, so pixel art stays crisp.
function toGameSize(src, sx, sy, sw, sh) {
  const cv = canvas(Math.round(sw / ART_SCALE), Math.round(sh / ART_SCALE));
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv;
}

// The pale fringe round the artist's shapes: edge pixels blended with the
// white paper he painted on. Twice round the edge, drop the pixels that
// are part see-through, pale grey, or pinkish.
function cleanFringe(cv, passes = 2) {
  const g = ctx(cv);
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const a = img.data;
  const w = cv.width;
  const h = cv.height;
  for (let pass = 0; pass < passes; pass++) {
    const drop = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!a[i + 3]) continue;
        const open = (xx, yy) => xx < 0 || yy < 0 || xx >= w || yy >= h || !a[(yy * w + xx) * 4 + 3];
        if (!(open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1))) continue;
        const r = a[i];
        const gr = a[i + 1];
        const b = a[i + 2];
        const lum = (r + gr + b) / 3;
        const sat = Math.max(r, gr, b) - Math.min(r, gr, b);
        const washedGreen = sat < 40 && lum > 40 && gr >= r && gr >= b;   // a green blended with the paper
        if (a[i + 3] < 250 || (lum > 130 && sat < 70) || (r > gr + 15 && lum > 110) || washedGreen) drop.push(i);
      }
    }
    drop.forEach((i) => { a[i + 3] = 0; });
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// A picture at game size, in pieces narrow enough for any graphics card.
function inPieces(src, sw, sh) {
  const pieces = [];
  const stripW = PIECE * ART_SCALE;
  for (let x0 = 0; x0 < sw; x0 += stripW) {
    pieces.push({ canvas: toGameSize(src, x0, 0, Math.min(stripW, sw - x0), sh), x: x0 / ART_SCALE });
  }
  return pieces;
}

// How wide one copy is when a strip is repeated across, or 0.
function repeatWidth(bitmap) {
  const W = 1600;
  const H = 100;
  const cv = canvas(W, H);
  const g = ctx(cv);
  g.drawImage(bitmap, 0, 0, W, H);
  const a = g.getImageData(0, 0, W, H).data;
  const diff = (p) => {
    let sum = 0;
    let n = 0;
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x + p < W; x += 2) {
        const i = (y * W + x) * 4;
        const j = (y * W + x + p) * 4;
        sum += Math.abs(a[i] - a[j]) + Math.abs(a[i + 1] - a[j + 1]) + Math.abs(a[i + 2] - a[j + 2]);
        n++;
      }
    }
    return sum / n;
  };
  const diffs = [];
  let bestD = Infinity;
  for (let p = Math.round(W / 12); p <= W / 2; p++) {
    const d = diff(p);
    diffs.push([p, d]);
    bestD = Math.min(bestD, d);
  }
  if (bestD > 6) return 0;                        // no clear repeat
  // Two or three copies side by side match too; take the narrowest repeat
  // that matches about as well as the best.
  let best = 0;
  for (let i = 1; i < diffs.length - 1; i++) {
    const [p, d] = diffs[i];
    if (d <= bestD * 1.5 + 1 && d <= diffs[i - 1][1] && d <= diffs[i + 1][1]) { best = p; break; }
  }
  // Refine at full size on a band across the middle.
  const scale = bitmap.width / W;
  const band = canvas(Math.min(bitmap.width, Math.round(best * scale * 2 + 200)), 40);
  const bg = ctx(band);
  bg.drawImage(bitmap, 0, bitmap.height / 2, band.width, 40, 0, 0, band.width, 40);
  const b = bg.getImageData(0, 0, band.width, 40).data;
  let exact = Math.round(best * scale);
  let exactD = Infinity;
  for (let p = Math.round((best - 2) * scale); p <= (best + 2) * scale; p++) {
    let sum = 0;
    let n = 0;
    for (let y = 0; y < 40; y += 4) {
      for (let x = 0; x + p < band.width; x += 3) {
        const i = (y * band.width + x) * 4;
        const j = (y * band.width + x + p) * 4;
        sum += Math.abs(b[i] - b[j]) + Math.abs(b[i + 1] - b[j + 1]) + Math.abs(b[i + 2] - b[j + 2]);
        n++;
      }
    }
    if (sum / n < exactD) { exactD = sum / n; exact = p; }
  }
  return exact;
}

// The whole picture, 1:1 with the level as painted. The game lays a second
// copy after the end, so it can scroll at its own (parallax) speed without
// running out; a picture that tiles joins itself cleanly.
async function makeBackground(bitmap) {
  const p = repeatWidth(bitmap);
  const pieces = inPieces(bitmap, bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width / ART_SCALE);
  const h = Math.round(bitmap.height / ART_SCALE);
  return {
    pieces,
    w,
    h,
    note: `Background: the whole picture, 1:1 with the level (${w} x ${h} game px)${p ? `; it tiles (a ${Math.round(p / ART_SCALE)} px strip repeats), so the copy after it joins cleanly` : ''}.`,
  };
}

// The artist's paint, without the guide under it. A pixel is kept when it's
// mostly solid and its colour differs from the guide's at that spot.
async function makeDressing(bitmap, rows, levelName) {
  const guide = backgroundGuide(rows, 'whole', levelName);
  if (Math.abs(guide.w - bitmap.width) > 2 || Math.abs(guide.h - bitmap.height) > 2) {
    throw new Error(`The dressing file is ${bitmap.width} x ${bitmap.height} px, but this level's whole-level guide is ${guide.w} x ${guide.h}. It was painted on a different level or size.`);
  }
  const guideImg = await createImageBitmap(await svgToImage(guide.svg, guide.w, guide.h, 'png'));
  const pieces = [];
  let kept = 0;
  const stripW = PIECE * ART_SCALE;
  for (let x0 = 0; x0 < bitmap.width; x0 += stripW) {
    const w = Math.min(stripW, bitmap.width - x0);
    const h = bitmap.height;
    const art = canvas(w, h);
    const ga = ctx(art);
    ga.drawImage(bitmap, x0, 0, w, h, 0, 0, w, h);
    const gd = canvas(w, h);
    const gg = ctx(gd);
    gg.drawImage(guideImg, x0, 0, w, h, 0, 0, w, h);
    const A = ga.getImageData(0, 0, w, h);
    const G = gg.getImageData(0, 0, w, h).data;
    const a = A.data;
    // Paint apps keep the guide's colours but often not how see-through
    // they were, so where the guide has anything, a matching colour counts
    // as guide whatever its opacity.
    for (let i = 0; i < a.length; i += 4) {
      const guideHere = G[i + 3] > 0;
      const sameColour = Math.abs(a[i] - G[i]) + Math.abs(a[i + 1] - G[i + 1]) + Math.abs(a[i + 2] - G[i + 2]) < 45;
      // White text written over a guide colour: each channel the same share
      // of the way from the guide's colour to white.
      let whiteOverGuide = false;
      if (guideHere && !sameColour) {
        const t0 = (a[i] - G[i]) / Math.max(1, 255 - G[i]);
        const t1 = (a[i + 1] - G[i + 1]) / Math.max(1, 255 - G[i + 1]);
        const t2 = (a[i + 2] - G[i + 2]) / Math.max(1, 255 - G[i + 2]);
        const lo = t0 < t1 ? (t0 < t2 ? t0 : t2) : (t1 < t2 ? t1 : t2);
        const hi = t0 > t1 ? (t0 > t2 ? t0 : t2) : (t1 > t2 ? t1 : t2);
        whiteOverGuide = lo > 0.15 && hi - lo < 0.2;
      }
      if (a[i + 3] < 128 || (guideHere && sameColour) || whiteOverGuide) a[i + 3] = 0;
    }
    // The artist's own name labels: white text with grey edges. Drop the
    // white, then grey pixels right next to it (the text's soft edges).
    const grey = (i) => Math.max(a[i], a[i + 1], a[i + 2]) - Math.min(a[i], a[i + 1], a[i + 2]) < 30;
    const white = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (a[i + 3] && grey(i) && Math.min(a[i], a[i + 1], a[i + 2]) > 200) { white[p] = 1; a[i + 3] = 0; }
    }
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (!a[i + 3] || !grey(i)) continue;
      const x = p % w;
      const y = (p - x) / w;
      let near = false;
      for (let dy = -3; dy <= 3 && !near; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && white[yy * w + xx]) { near = true; break; }
        }
      }
      if (near) a[i + 3] = 0;
    }
    for (let i = 3; i < a.length; i += 4) if (a[i]) kept++;
    ga.putImageData(A, 0, 0);
    const piece = cleanFringe(toGameSize(art, 0, 0, w, h));
    pieces.push({ canvas: piece, x: x0 / ART_SCALE });
  }
  guideImg.close();
  return {
    pieces,
    note: `Dressing: the guide was taken out, leaving ${Math.round(kept / (ART_SCALE * ART_SCALE)).toLocaleString()} game pixels of the artist's art (pale fringe round his shapes cleaned off), placed 1:1 with the level.`,
  };
}

// files: the dropped File objects. Returns { background?, dressing?, notes }.
export async function readArtistFiles(files, rows, levelName) {
  const out = { notes: [] };
  for (const file of files) {
    const bitmap = await createImageBitmap(file);
    try {
      if (await kindOf(bitmap) === 'background') out.background = await makeBackground(bitmap);
      else out.dressing = await makeDressing(bitmap, rows, levelName);
    } finally {
      bitmap.close();
    }
  }
  if (out.background) out.notes.push(out.background.note);
  if (out.dressing) out.notes.push(out.dressing.note);
  return out;
}
