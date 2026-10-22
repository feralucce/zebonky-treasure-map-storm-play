// The explorer as a paper doll: separate parts (head, hair, torso, two-piece
// arms and legs, glasses) that turn on their joints, so one set of poses can
// play with any head, hair, skin tone or glasses swapped in.
//
// Parts come from assets/player/doll/ (tools/cut_doll_parts.py): a picture,
// a mask marking skin (red) and hair (green), where it sits in her 71 x 96
// standing frame, the joint it turns on, and the parent it hangs from.
//
// Pixel art can't simply be rotated: corners smear and edges break up. Each
// part is enlarged 4x with Scale2x twice (which keeps diagonal edges clean),
// turned, then sampled back down at the middle of each 4 x 4 block, which is
// the RotSprite approach. Turned parts are cached by angle.
//
// Angles in poses are degrees from straight down, positive towards the way
// she faces (right). Upper and lower limb angles are both measured from
// straight down, not from each other.

const SCALE = 4;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

function pixels(im) {
  const cv = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height });
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  return g.getImageData(0, 0, im.width, im.height);
}

// Scale2x: doubles a picture, rounding off stair-step diagonals.
function scale2x(src) {
  const { width: w, height: h } = src;
  const s = new Uint32Array(src.data.buffer.slice(0));
  const out = new ImageData(w * 2, h * 2);
  const d = new Uint32Array(out.data.buffer);
  const at = (x, y) => s[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      const i = (y * 2) * w * 2 + x * 2;
      d[i] = e0; d[i + 1] = e1; d[i + w * 2] = e2; d[i + w * 2 + 1] = e3;
    }
  }
  return out;
}

// Recolour one picture: skin and hair pixels take a new colour of the same
// lightness. ramp = [dark, mid, light] colours; ref = her own [dark, light]
// lightness for that layer.
function lightness(r, g, b) {
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

function recolour(img, mask, looks) {
  const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  const o = out.data;
  const m = mask.data;
  for (let i = 0; i < o.length; i += 4) {
    if (!m[i + 3]) continue;
    const look = m[i] ? looks.skin : m[i + 1] ? looks.hair : null;
    if (!look) continue;
    const t = Math.min(1, Math.max(0, (lightness(o[i], o[i + 1], o[i + 2]) - look.ref[0]) / (look.ref[1] - look.ref[0])));
    const [a, b] = t < 0.5 ? [look.ramp[0], look.ramp[1]] : [look.ramp[1], look.ramp[2]];
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    o[i] = a[0] + (b[0] - a[0]) * k;
    o[i + 1] = a[1] + (b[1] - a[1]) * k;
    o[i + 2] = a[2] + (b[2] - a[2]) * k;
  }
  return out;
}

// Her own colours, for "as drawn".
export const SKINS = {
  'As drawn': null,
  Light: [[176, 108, 82], [236, 184, 150], [252, 222, 196]],
  Tan: [[150, 84, 46], [222, 150, 100], [246, 196, 150]],
  Brown: [[96, 52, 30], [168, 104, 62], [208, 148, 100]],
  'Deep brown': [[52, 28, 20], [112, 66, 42], [156, 102, 68]],
  'Very deep': [[34, 20, 16], [76, 46, 34], [116, 76, 56]],
};
export const HAIRS = {
  'As drawn': null,
  Black: [[10, 8, 12], [36, 32, 40], [70, 64, 78]],
  Brown: [[40, 22, 12], [96, 58, 32], [146, 98, 60]],
  Auburn: [[70, 22, 12], [150, 60, 30], [206, 110, 60]],
  Blond: [[120, 84, 36], [206, 164, 86], [246, 222, 150]],
  Grey: [[70, 70, 76], [150, 150, 158], [214, 214, 220]],
};

export class Doll {
  static async load(base) {
    const info = await (await fetch(base + 'doll.json')).json();
    const parts = {};
    await Promise.all(info.parts.map(async (p) => {
      const [im, mk] = await Promise.all([loadImage(base + p.file), loadImage(base + p.mask)]);
      parts[p.name] = { ...p, img: pixels(im), mask: pixels(mk) };
      if (p.blink) {
        parts[p.name].blinkImg = pixels(await loadImage(base + p.blink));
        parts[p.name].blinkMask = p.blinkMask ? pixels(await loadImage(base + p.blinkMask)) : parts[p.name].mask;
      }
    }));
    return new Doll(info, parts);
  }

  constructor(info, parts) {
    this.info = info;
    this.parts = parts;
    this.order = info.parts.map((p) => p.name);
    // Her own lightness range for skin and for hair, to map new colours on.
    this.ref = { skin: [255, 0], hair: [255, 0] };
    Object.values(parts).forEach((p) => {
      const o = p.img.data, m = p.mask.data;
      for (let i = 0; i < o.length; i += 4) {
        if (!m[i + 3]) continue;
        const key = m[i] ? 'skin' : 'hair';
        const l = lightness(o[i], o[i + 1], o[i + 2]);
        this.ref[key][0] = Math.min(this.ref[key][0], l);
        this.ref[key][1] = Math.max(this.ref[key][1], l);
      }
    });
    this.setLook({});
  }

  // look: { skin: name in SKINS, hair: name in HAIRS, glasses: bool }
  setLook(look) {
    this.look = { skin: 'As drawn', hair: 'As drawn', glasses: false, ...look };
    const skin = SKINS[this.look.skin], hair = HAIRS[this.look.hair];
    const looks = {
      skin: skin && { ramp: skin, ref: this.ref.skin },
      hair: hair && { ramp: hair, ref: this.ref.hair },
    };
    this.cache = new Map();
    Object.values(this.parts).forEach((p) => {
      p.cur = recolour(p.img, p.mask, looks);
      if (p.blinkImg) p.curBlink = recolour(p.blinkImg, p.blinkMask, looks);
    });
  }

  // A part's picture turned by `deg` (clockwise on screen) about its joint.
  // Returns a canvas and where the joint sits in it.
  turned(p, deg, blink) {
    const key = `${p.name}|${blink ? 1 : 0}|${Math.round(deg)}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const src = blink ? p.curBlink : p.cur;
    const jx = p.joint[0] - p.x, jy = p.joint[1] - p.y;
    let result;
    if (Math.round(deg) === 0) {
      const cv = Object.assign(document.createElement('canvas'), { width: src.width, height: src.height });
      cv.getContext('2d').putImageData(src, 0, 0);
      result = { cv, jx, jy };
    } else {
      const big = scale2x(scale2x(src));
      const bw = big.width, bh = big.height;
      const b32 = new Uint32Array(big.data.buffer);
      const a = (Math.round(deg) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      // Bounds of the turned part, in 1x pixels around the joint.
      const corners = [[-jx, -jy], [src.width - jx, -jy], [-jx, src.height - jy], [src.width - jx, src.height - jy]]
        .map(([x, y]) => [x * c - y * s, x * s + y * c]);
      const x0 = Math.floor(Math.min(...corners.map((q) => q[0]))) - 1;
      const y0 = Math.floor(Math.min(...corners.map((q) => q[1]))) - 1;
      const x1 = Math.ceil(Math.max(...corners.map((q) => q[0]))) + 1;
      const y1 = Math.ceil(Math.max(...corners.map((q) => q[1]))) + 1;
      const w = x1 - x0, h = y1 - y0;
      const out = new ImageData(w, h);
      const o32 = new Uint32Array(out.data.buffer);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Middle of this output pixel, turned back into the part, in 4x pixels.
          const ux = x0 + x + 0.5, uy = y0 + y + 0.5;
          const sx = (ux * c + uy * s + jx) * SCALE, sy = (-ux * s + uy * c + jy) * SCALE;
          const ix = Math.floor(sx), iy = Math.floor(sy);
          if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) continue;
          o32[y * w + x] = b32[iy * bw + ix];
        }
      }
      const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
      cv.getContext('2d').putImageData(out, 0, 0);
      result = { cv, jx: -x0, jy: -y0 };
    }
    this.cache.set(key, result);
    return result;
  }

  // Lay out a pose: where each part's joint lands and how far it's turned.
  layout(pose) {
    const P = this.parts;
    const place = {};
    const angle = {
      torso: pose.lean || 0,
      head: (pose.lean || 0) + (pose.tilt || 0),
      arm_back_upper: -(pose.armB?.[0] || 0), arm_back_lower: -(pose.armB?.[1] || 0),
      arm_front_upper: -(pose.armF?.[0] || 0), arm_front_lower: -(pose.armF?.[1] || 0),
      leg_back_upper: -(pose.legB?.[0] || 0), leg_back_lower: -(pose.legB?.[1] || 0),
      leg_front_upper: -(pose.legF?.[0] || 0), leg_front_lower: -(pose.legF?.[1] || 0),
    };
    angle.hair_back = angle.head + (pose.hair || 0);
    angle.glasses = angle.head;
    const turn = (deg, x, y) => {
      const a = (deg * Math.PI) / 180;
      return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    };
    const at = (name) => {
      if (place[name]) return place[name];
      const p = P[name];
      if (!p.parent) {
        place[name] = [p.joint[0], p.joint[1] - (pose.lift || 0)];
      } else {
        const parent = P[p.parent];
        const [px, py] = at(p.parent);
        const [dx, dy] = turn(angle[p.parent], p.at[0] - parent.joint[0], p.at[1] - parent.joint[1]);
        place[name] = [px + dx, py + dy + (name === 'head' ? pose.headDy || 0 : 0)];
      }
      return place[name];
    };
    this.order.forEach(at);
    return { place, angle };
  }

  // Draw a pose with the top left of her 71 x 96 frame at (ox, oy). A pose
  // with ground: true is moved up or down so her lowest boot stands on the
  // frame's ground line.
  draw(ctx, pose, ox, oy) {
    const { place, angle } = this.layout(pose);
    const items = [];
    let lowest = -Infinity;
    for (const name of this.order) {
      if (name === 'glasses' && !this.look.glasses) continue;
      const p = this.parts[name];
      const t = this.turned(p, angle[name] || 0, name === 'head' && pose.blink);
      const x = Math.round(place[name][0] - t.jx), y = Math.round(place[name][1] - t.jy);
      items.push([t.cv, x, y]);
      if (name.endsWith('_lower') && name.startsWith('leg')) lowest = Math.max(lowest, y + t.cv.height);
    }
    const shift = pose.ground ? this.info.ground + 1 - lowest : 0;
    ctx.imageSmoothingEnabled = false;
    items.forEach(([cv, x, y]) => ctx.drawImage(cv, ox + x, oy + y + shift));
  }
}

// Poses, frame by frame. legF/legB/armF/armB: [upper, lower] angles; lift:
// pixels off the ground (jumps); lean: body tilt; headDy: head bob; blink.
const g = (o) => ({ ground: true, ...o });
export const ANIMS = {
  idle: {
    fps: 4,
    frames: [
      g({ armF: [2, 2], armB: [-2, -2] }),
      g({ headDy: 1, armF: [4, 5], armB: [-4, -5], hair: -1 }),
      g({ headDy: 1, armF: [4, 5], armB: [-4, -5], hair: -1 }),
      g({ armF: [2, 2], armB: [-2, -2] }),
      g({ armF: [2, 2], armB: [-2, -2] }),
      g({ armF: [2, 2], armB: [-2, -2], blink: true }),
      g({ headDy: 1, armF: [4, 5], armB: [-4, -5], hair: -1 }),
      g({ headDy: 1, armF: [4, 5], armB: [-4, -5], hair: -1 }),
    ],
  },
  walk: {
    fps: 8,
    frames: [
      g({ lean: 3, legF: [22, 8], legB: [-20, -32], armF: [-18, -10], armB: [18, 26] }),
      g({ lean: 3, headDy: 1, legF: [4, -6], legB: [-4, -26], armF: [-4, 0], armB: [4, 8] }),
      g({ lean: 3, legF: [-20, -32], legB: [22, 8], armF: [18, 26], armB: [-18, -10] }),
      g({ lean: 3, headDy: 1, legF: [-4, -26], legB: [4, -6], armF: [4, 8], armB: [-4, 0] }),
    ],
  },
  run: {
    fps: 12,
    frames: [
      g({ lean: 8, legF: [35, 15], legB: [-35, -75], armF: [-40, -10], armB: [45, 90] }),
      g({ lean: 10, headDy: 1, legF: [10, -25], legB: [-15, -100], armF: [-20, 10], armB: [25, 80] }),
      { lean: 12, lift: 4, legF: [55, -10], legB: [-40, -15], armF: [40, 90], armB: [-45, -10] },
      g({ lean: 8, legF: [-35, -75], legB: [35, 15], armF: [45, 90], armB: [-40, -10] }),
      g({ lean: 10, headDy: 1, legF: [-15, -100], legB: [10, -25], armF: [25, 80], armB: [-20, 10] }),
      { lean: 12, lift: 4, legF: [-40, -15], legB: [55, -10], armF: [-45, -10], armB: [40, 90] },
    ],
  },
  jump: {
    fps: 8,
    frames: [
      g({ lean: 10, headDy: 2, legF: [40, -30], legB: [30, -40], armF: [-30, -10], armB: [-40, -20] }),
      { lean: 4, lift: 10, legF: [5, 0], legB: [-10, -5], armF: [160, 175], armB: [150, 170] },
      { lean: 4, lift: 22, legF: [60, -20], legB: [-5, -10], armF: [140, 160], armB: [120, 150] },
      { lean: 6, lift: 28, legF: [80, 10], legB: [60, 0], armF: [100, 120], armB: [90, 110] },
      { lean: 4, lift: 22, legF: [25, 10], legB: [-15, -5], armF: [110, 90], armB: [100, 80] },
      { lean: 2, lift: 10, legF: [10, 5], legB: [-5, 0], armF: [130, 100], armB: [120, 90] },
      g({ lean: 10, headDy: 2, legF: [40, -30], legB: [30, -40], armF: [30, 60], armB: [20, 50] }),
    ],
  },
  swim: {
    fps: 6,
    frames: [
      { lean: 12, legF: [20, -10], legB: [-25, -20], armF: [110, 90], armB: [-20, -30] },
      { lean: 12, legF: [-25, -20], legB: [20, -10], armF: [30, 10], armB: [40, 60] },
      { lean: 12, legF: [20, -10], legB: [-25, -20], armF: [-20, -30], armB: [110, 90] },
      { lean: 12, legF: [-25, -20], legB: [20, -10], armF: [40, 60], armB: [30, 10] },
    ],
  },
};
