// The Z meter: a bonus room's HUD meter that fruit charges and the
// Zebonky's power spends (the user, 2026-11-16/17). The game's copy of the
// approved mockup, tools/zmeter/meter.html (docs/guides/z-meter.md has the
// rules every meter keeps). Pixel art at a native 400x110, drawn into a
// canvas texture every frame and shown at 1x.
//
//   const m = new ZMeter(scene, x, y, 'shaan');
//   m.fill = 2.5;          // segments, 0..5
//   m.update(time);        // each frame
//
// It's full once fill reaches 5; `full` then counts from that moment and
// drives the pulse and the sparkles. Shaan's pieces (his curl frames, the
// grubberry, the cove dressing) are cut by tools/zmeter/make_pieces.py into
// assets/hud/zmeter/<name>/ and loaded by Boot as `zmeter-<name>-<piece>`.

export const SEGMENTS = 5;
const W = 400, H = 110;
const RC = { x: 55, y: 57, r: 39, disc: 30 };
const BAR = { x0: 88, x1: 370, y0: 38, y1: 76 };
const N = SEGMENTS;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const INK = [27, 26, 46];

// Each Zebonky's meter: its frame and emblem SVG (`frame`), palette, charge
// ramp and dressing. Every meter shares the same energy and pulse (the
// sweep, the crackle, the Z-shaped front edge, the full pulse and the
// sparkles; the user, 2026-11-17: "the same energy and pulse on all of them").
export const METERS = {
  shaan: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_grass_clump_b', 'pt_grass_clump_c', 'pt_leaf_cluster_a', 'pt_rock_small_b'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_grass_clump_b', 96], ['pt_rock_small_b', 112], ['pt_leaf_cluster_a', 132], ['pt_grass_clump_c', 154]],
    pal: ['#1b1a2e', '#ffe2ad', '#f2c27e', '#c98a44', '#a8682e', '#fff3d6', '#8ff6ff', '#1aa6c9', '#0a4a6a',
      '#e9fbff', '#173a4a', '#0b1f2b', '#24566a', '#ffffff', '#fffbe0', '#3fb8e0', '#53d3f2', '#0e6d93'].map(hex),
    ramp: ['#0fa5a8', '#16d6c8', '#5ee6a0', '#a6ec46', '#d8f02a', '#ffe600', '#fff27a'].map(hex),
  },
  // Axel's (the user's pick, 2026-11-17: take A, Gill Fronds, "lose the
  // fronds"): his brown body band with a belly stripe, his mint tail tip off
  // the right end, a brown ring round a water disc with sonic rings, and a
  // sea-teal to seafoam-white charge. His swim frames in the emblem.
  axel: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_fern_a', 'pt_tropical_plant_a', 'pt_leaf_cluster_a', 'pt_fern_b'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_fern_a', 96], ['pt_tropical_plant_a', 116], ['pt_leaf_cluster_a', 140], ['pt_fern_b', 166]],
    frame: axelFrameSVG,
    pal: ['#1b1a2e', '#a8673a', '#c98a55', '#e3b583', '#7a4524', '#f2d2a8', '#7fe8c4', '#5fd4ad', '#2f9c7c',
      '#8ff0ff', '#1c9bc0', '#0a3f60', '#0d3a44', '#07202a', '#1a5560', '#ffffff', '#dffff4', '#e9fbff'].map(hex),
    ramp: ['#0b7d84', '#14a7a0', '#2fc9b4', '#5ee6c8', '#9ff3dc', '#d9fff2', '#f4fffd'].map(hex),
  },
  // Ricky's (the user's pick, 2026-11-17: take A, Ringed Tail, with "remove
  // the dressing on the top of the ring, remove the bolt shapes, have ricky
  // face the other way, and use the meter color from c"): his grey tail with
  // dark rings as the frame, a grey ring round a blue disc, him facing
  // right, and take C's blue to violet charge.
  ricky: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_grass_clump_a', 'pt_flower_pink_a', 'pt_leaf_sprout_a', 'pt_grass_clump_b'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_grass_clump_a', 98], ['pt_flower_pink_a', 120], ['pt_leaf_sprout_a', 142], ['pt_grass_clump_b', 166]],
    frame: rickyFrameSVG,
    pal: ['#1b1a2e', '#c9ccd6', '#e4e6ee', '#9a9eae', '#3a3d4a', '#ffffff', '#d8ecff', '#5f9de0', '#22417a',
      '#1d1838', '#0e0b1f', '#2c2650', '#eef0f6', '#6d7184'].map(hex),
    ramp: ['#2a1fb0', '#4a3cff', '#6a6cff', '#7a8bff', '#a9b4ff', '#d4daff', '#f0f0ff'].map(hex),
  },
  // Charlie's (the user's pick, 2026-11-17: take C, Hyper Dash, "remove
  // those shapes on the ring", with the shared Z edge, energy and flash): a
  // dark racing frame with orange speed chevrons, a dark ring round an
  // orange disc with speed lines behind him, his run frames dashing right,
  // and a red-orange to yellow charge.
  charlie: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_grass_clump_a', 'pt_fern_small_a', 'pt_leaf_cluster_a', 'pt_grass_clump_b'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_grass_clump_a', 98], ['pt_fern_small_a', 122], ['pt_leaf_cluster_a', 146], ['pt_grass_clump_b', 176]],
    frame: charlieFrameSVG,
    pal: ['#1b1a2e', '#3a3346', '#4d4560', '#2a2433', '#ff8a1e', '#ffc23c', '#ffe9c8', '#f08a3c', '#b8502a', '#7a2a14',
      '#2a1d22', '#140d10', '#ffffff', '#fff2a8'].map(hex),
    ramp: ['#c41e14', '#e0301e', '#f2541c', '#ff8a1e', '#ffb43a', '#ffd96a', '#fff2a8'].map(hex),
  },
  // Unity's (the user's pick, 2026-11-17: take A, Starry Mane): her white
  // coat as the frame with her mane's blue, violet and pink swept along the
  // top, a violet ring round a starlit disc, and a violet to starlight
  // charge. Her idle frames in the emblem, Chris's sparkle (her food) at the
  // edge, Crystal Caverns crystals on the line.
  unity: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_crystal_small_a', 'pt_crystal_group_c', 'pt_crystal_small_b', 'pt_crystal_medium_b'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_crystal_small_a', 98], ['pt_crystal_group_c', 122], ['pt_crystal_small_b', 152], ['pt_crystal_medium_b', 176]],
    frame: unityFrameSVG,
    pal: ['#1b1a2e', '#f4f1fb', '#d9d1ee', '#b9b0d6', '#3c5bd8', '#7d5be6', '#c46ad8', '#fff6dc', '#9a86e8', '#3a2a86',
      '#1d1838', '#0e0b1f', '#ffffff', '#fff4dc', '#5e4bb8'].map(hex),
    ramp: ['#3a1fb0', '#4b2bd6', '#7a55f0', '#a77bff', '#d0b4ff', '#f3e6ff', '#fff4dc'].map(hex),
  },
  // Sofia's (the user's pick, 2026-11-17: "c, but with b's energy bar"):
  // take C's cracked stone frame with ground waves under it and cracks
  // round the ring, and take B's leaf-green to gold charge. Her idle frames,
  // her haycorn at the edge, Squvannahs grass and plants on the line.
  sofia: {
    pieces: ['ball0', 'ball1', 'ball2', 'ball3', 'berry', 'pt_grass_tuft_a', 'pt_spiky_plant_b', 'pt_grass_tuft_b', 'pt_bush_small'],
    frames: ['ball0', 'ball1', 'ball2', 'ball3'],
    dressing: [['pt_grass_tuft_a', 98], ['pt_spiky_plant_b', 124], ['pt_grass_tuft_b', 152], ['pt_bush_small', 176]],
    frame: sofiaFrameSVG,
    pal: ['#1b1a2e', '#8c8278', '#a89e94', '#6e655d', '#4a4038', '#f0c060', '#fff0d0', '#c89a6a', '#5a3e28',
      '#1f2414', '#0f130a', '#ffffff', '#fff6c0'].map(hex),
    ramp: ['#3a7a20', '#4f9a2c', '#8cc036', '#c8d840', '#e8e070', '#fff6c0', '#fffbe0'].map(hex),
  },
};
const HOT = [hex('#ffffff'), hex('#fffbe0'), hex('#bff8ff'), hex('#fff27a')];
const SPARK_COLS = ['#ffe600', '#5ee6a0', '#ffffff', '#fff27a', '#8ff6ff'].map(hex);

function nearest(r, g, b, pal) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < pal.length; i++) {
    const p = pal[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return pal[best];
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${body}</svg>`;
const P = (a) => a.map((p) => p.join(',')).join(' ');
function divider(x) {
  const { y0, y1 } = BAR, ym = Math.round((y0 + y1) / 2);
  return [[x + 11, y0 - 1], [x - 1, ym + 1], [x + 7, ym + 1], [x - 5, y1 + 1]];
}
// The divider's Z as an x offset by row: the charge's front edge.
function boltOff(y) {
  const [a, b, c, e] = divider(0);
  if (y <= b[1]) return Math.round(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
  return Math.round(c[0] + (e[0] - c[0]) * (y - c[1]) / (e[1] - c[1]));
}
const segW = (BAR.x1 - BAR.x0) / N;
const divXs = [1, 2, 3, 4].map((i) => Math.round(BAR.x0 + segW * i));
function segPoly(i) {
  const L = i === 0 ? [[BAR.x0 - 30, BAR.y0 - 4], [BAR.x0 - 30, BAR.y1 + 4]] : divider(divXs[i - 1]);
  const R = i === N - 1 ? [[BAR.x1 + 30, BAR.y0 - 4], [BAR.x1 + 30, BAR.y1 + 4]] : divider(divXs[i]);
  return [...L, ...R.slice().reverse()];
}
const pillR = (BAR.y1 - BAR.y0) / 2;
const O = 7;
const FR = { x: BAR.x0 - O - 10, y: BAR.y0 - O, w: BAR.x1 - BAR.x0 + 2 * O + 10, h: BAR.y1 - BAR.y0 + 2 * O };

// Shaan's frame (his armour bands) and emblem (plate ring, water disc).
function frameSVG() {
  let s = `<defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2ad"/><stop offset="0.55" stop-color="#f2c27e"/><stop offset="1" stop-color="#c98a44"/></linearGradient>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#8ff6ff"/><stop offset="0.6" stop-color="#1aa6c9"/><stop offset="1" stop-color="#0a4a6a"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a4a"/><stop offset="1" stop-color="#0b1f2b"/></linearGradient>
  </defs>`;
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="url(#plate)" stroke="#1b1a2e" stroke-width="2"/>`;
  for (let x = FR.x + 24; x < FR.x + FR.w - 14; x += 15) {
    s += `<path d="M${x},${FR.y + 2} q-4,${FR.h / 2 - 2} 0,${FR.h - 4}" fill="none" stroke="#a8682e" stroke-width="1.4"/>`;
    s += `<rect x="${x - 8}" y="${FR.y + 3}" width="2" height="1" fill="#fff3d6"/>`;
    s += `<rect x="${x - 8}" y="${FR.y + FR.h - 4}" width="2" height="1" fill="#a8682e"/>`;
  }
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="url(#plate)" stroke="#1b1a2e" stroke-width="2.5"/>`;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    s += `<line x1="${RC.x + Math.cos(a) * RC.disc}" y1="${RC.y + Math.sin(a) * RC.disc}" x2="${RC.x + Math.cos(a) * (RC.r - 1)}" y2="${RC.y + Math.sin(a) * (RC.r - 1)}" stroke="#a8682e" stroke-width="1.3"/>`;
  }
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${(RC.r + RC.disc) / 2}" fill="none" stroke="#c98a44" stroke-width="1"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  [0, 1].forEach((k) => {
    const r = 21 + k * 5;
    s += `<path d="M${RC.x - r * 0.95},${RC.y + r * 0.3} A${r},${r} 0 0 1 ${RC.x - r * 0.2},${RC.y - r * 0.98}" fill="none" stroke="#e9fbff" stroke-width="${2 - k * 0.6}" stroke-linecap="round"/>`;
    s += `<path d="M${RC.x + r * 0.95},${RC.y - r * 0.3} A${r},${r} 0 0 1 ${RC.x + r * 0.2},${RC.y + r * 0.98}" fill="none" stroke="#e9fbff" stroke-width="${2 - k * 0.6}" stroke-linecap="round"/>`;
  });
  return svg(s);
}
// Axel's frame and emblem (take A without the fronds).
function axelFrameSVG() {
  let s = `<defs>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#8ff0ff"/><stop offset="0.6" stop-color="#1c9bc0"/><stop offset="1" stop-color="#0a3f60"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d3a44"/><stop offset="1" stop-color="#07202a"/></linearGradient>
  </defs>`;
  // his mint tail tip, curling off the right end (behind the frame)
  s += `<path d="M${FR.x + FR.w - 10},${FR.y + FR.h / 2} q20,-14 24,-4 q3,10 -14,13 z" fill="#7fe8c4" stroke="#1b1a2e" stroke-width="2"/>`;
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="#a8673a" stroke="#1b1a2e" stroke-width="2"/>`;
  s += `<rect x="${FR.x + 20}" y="${FR.y + 3}" width="${FR.w - 40}" height="2" fill="#c98a55"/>`;
  s += `<rect x="${FR.x + 20}" y="${FR.y + FR.h - 5}" width="${FR.w - 40}" height="3" fill="#e3b583"/>`;
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#a8673a" stroke="#1b1a2e" stroke-width="2.5"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${(RC.r + RC.disc) / 2}" fill="none" stroke="#c98a55" stroke-width="1"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  // sonic rings ahead of his nose
  [0, 1, 2].forEach((k) => {
    const r = 17 + k * 4;
    s += `<path d="M${RC.x + r * 0.55},${RC.y - r * 0.83} A${r},${r} 0 0 1 ${RC.x + r * 0.55},${RC.y + r * 0.83}" fill="none" stroke="#e9fbff" stroke-width="${1.6 - k * 0.3}" stroke-linecap="round"/>`;
  });
  return svg(s);
}

// Ricky's frame and emblem: his ringed tail (take A, without the feathers
// and the bolts).
function rickyFrameSVG() {
  let s = `<defs>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#d8ecff"/><stop offset="0.6" stop-color="#5f9de0"/><stop offset="1" stop-color="#22417a"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1838"/><stop offset="1" stop-color="#0e0b1f"/></linearGradient>
  </defs>`;
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="#c9ccd6" stroke="#1b1a2e" stroke-width="2"/>`;
  // the tail's dark rings across the frame
  for (let x = FR.x + 24; x < FR.x + FR.w - 14; x += 30) {
    s += `<rect x="${x}" y="${FR.y + 1}" width="13" height="${FR.h - 2}" rx="3" fill="#3a3d4a"/>`;
  }
  s += `<rect x="${FR.x + 24}" y="${FR.y + 2}" width="${FR.w - 50}" height="1" fill="#ffffff"/>`;
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#c9ccd6" stroke="#1b1a2e" stroke-width="2.5"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${(RC.r + RC.disc) / 2}" fill="none" stroke="#9a9eae" stroke-width="1"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  return svg(s);
}

// Charlie's frame and emblem: take C, Hyper Dash, without the dust cloud.
function charlieFrameSVG() {
  let s = `<defs>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#ffe9c8"/><stop offset="0.6" stop-color="#f08a3c"/><stop offset="1" stop-color="#7a2a14"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d22"/><stop offset="1" stop-color="#140d10"/></linearGradient>
  </defs>`;
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="#3a3346" stroke="#1b1a2e" stroke-width="2"/>`;
  s += `<rect x="${FR.x + 22}" y="${FR.y + 2}" width="${FR.w - 46}" height="1" fill="#4d4560"/>`;
  // speed chevrons pointing right, along the top and bottom of the frame
  const chev = (x, y, c) => `<polygon points="${P([[x, y - 2], [x + 2, y], [x, y + 2], [x - 1, y + 2], [x + 1, y], [x - 1, y - 2]])}" fill="${c}"/>`;
  for (let x = FR.x + 30; x < FR.x + FR.w - 18; x += 16) {
    s += chev(x, FR.y + 4, '#ff8a1e');
    s += chev(x + 8, FR.y + FR.h - 4, '#ffc23c');
  }
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#3a3346" stroke="#1b1a2e" stroke-width="2.5"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${(RC.r + RC.disc) / 2}" fill="none" stroke="#4d4560" stroke-width="1"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  // speed lines behind him (he dashes right)
  [[-9, 12], [-3, 9], [3, 7]].forEach(([dy, len], k) => {
    s += `<rect x="${RC.x - 27 + k * 2}" y="${RC.y + dy}" width="${len}" height="1" fill="${k ? '#fff2a8' : '#ffffff'}"/>`;
  });
  return svg(s);
}

// Unity's frame and emblem: take A, Starry Mane.
function unityFrameSVG() {
  let s = `<defs>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#fff6dc"/><stop offset="0.6" stop-color="#9a86e8"/><stop offset="1" stop-color="#3a2a86"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1838"/><stop offset="1" stop-color="#0e0b1f"/></linearGradient>
  </defs>`;
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="#f4f1fb" stroke="#1b1a2e" stroke-width="2"/>`;
  // her mane's colours swept along the top, like hair
  [['#3c5bd8', 1.5], ['#7d5be6', 3], ['#c46ad8', 4.5]].forEach(([c, dy]) => {
    let d = `M${FR.x + 22},${FR.y + dy}`;
    for (let x = FR.x + 22; x < FR.x + FR.w - 26; x += 16) d += ` q4,-1.6 8,0 q4,1.6 8,0`;
    s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.2"/>`;
  });
  s += `<rect x="${FR.x + 22}" y="${FR.y + FR.h - 3}" width="${FR.w - 48}" height="1" fill="#d9d1ee"/>`;
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#f4f1fb" stroke="#1b1a2e" stroke-width="2.5"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${(RC.r + RC.disc) / 2}" fill="none" stroke="#7d5be6" stroke-width="2"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  return svg(s);
}

// Sofia's frame and emblem: take C, Quake Stone (cracked stone, ground
// waves under it, cracks round the ring).
function sofiaFrameSVG() {
  let s = `<defs>
    <radialGradient id="disc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#fff0d0"/><stop offset="0.6" stop-color="#c89a6a"/><stop offset="1" stop-color="#5a3e28"/></radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2414"/><stop offset="1" stop-color="#0f130a"/></linearGradient>
  </defs>`;
  // ground waves under the frame
  [0, 1].forEach((k) => {
    let d = `M${FR.x + 24},${FR.y + FR.h + 4 + k * 4}`;
    for (let x = FR.x + 24; x < FR.x + FR.w - 24; x += 12) d += ` q3,-2 6,0 q3,2 6,0`;
    s += `<path d="${d}" fill="none" stroke="#f0c060" stroke-width="${k ? 0.8 : 1.3}"/>`;
  });
  s += `<rect x="${FR.x}" y="${FR.y}" width="${FR.w}" height="${FR.h}" rx="${pillR + O}" fill="#8c8278" stroke="#1b1a2e" stroke-width="2"/>`;
  s += `<rect x="${FR.x + 22}" y="${FR.y + FR.h - 3}" width="${FR.w - 48}" height="1" fill="#6e655d"/>`;
  // a crack running along the stone's top
  let c = `M${FR.x + 22},${FR.y + 3}`;
  for (let x = FR.x + 22; x < FR.x + FR.w - 30; x += 15) c += ` l5,2 l4,-2 l6,1`;
  s += `<path d="${c}" fill="none" stroke="#4a4038" stroke-width="1"/>`;
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="url(#empty)"/>`;
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#8c8278" stroke="#1b1a2e" stroke-width="2.5"/>`;
  // cracks round the ring
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 + 0.3;
    const p = (r, da) => `${RC.x + Math.cos(a + da) * r},${RC.y + Math.sin(a + da) * r}`;
    s += `<polyline points="${p(RC.disc + 1, 0)} ${p(RC.disc + 5, 0.08)} ${p(RC.r - 1, -0.04)}" fill="none" stroke="#4a4038" stroke-width="1"/>`;
  }
  s += `<circle cx="${RC.x}" cy="${RC.y}" r="${RC.disc}" fill="url(#disc)" stroke="#1b1a2e" stroke-width="2"/>`;
  return svg(s);
}

const tubeMaskSVG = () => svg(`<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="#fff"/>`);
const segSVG = () => svg([0, 1, 2, 3, 4].map((i) => `<polygon points="${P(segPoly(i))}" fill="rgb(${(i + 1) * 40},0,0)"/>`).join(''));
function inkSVG() {
  let s = '';
  divXs.forEach((x) => { s += `<polyline points="${P(divider(x))}" fill="none" stroke="#1b1a2e" stroke-width="4" stroke-linejoin="miter"/>`; });
  s += `<rect x="${BAR.x0}" y="${BAR.y0}" width="${BAR.x1 - BAR.x0}" height="${BAR.y1 - BAR.y0}" rx="${pillR}" fill="none" stroke="#1b1a2e" stroke-width="2.5"/>`;
  return svg(s);
}
function rimSVG() {
  let s = '';
  divXs.forEach((x) => { s += `<polyline points="${P(divider(x).map(([a, b]) => [a + 2, b]))}" fill="none" stroke="#fffbe0" stroke-width="1"/>`; });
  return svg(s);
}

const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
async function raster(svgText) {
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, W, H);
}
function snap(id, pal, thr = 128) {
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < thr) { d[i + 3] = 0; continue; }
    const p = pal ? nearest(d[i], d[i + 1], d[i + 2], pal) : [d[i], d[i + 1], d[i + 2]];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  return id;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function put(d, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
}
function over(dst, src) {
  const a = dst.data, b = src.data;
  for (let i = 0; i < a.length; i += 4) if (b[i + 3]) { a[i] = b[i]; a[i + 1] = b[i + 1]; a[i + 2] = b[i + 2]; a[i + 3] = 255; }
}
function baseOf(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const a = x.getImageData(0, 0, c.width, c.height).data;
  let b = 0;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (a[(y * c.width + i) * 4 + 3] > 0) b = y;
  return b;
}

export class ZMeter {
  constructor(scene, x, y, name = 'shaan', depth = 21) {
    this.scene = scene;
    this.cfg = METERS[name];
    this.name = name;
    this.fill = 0;             // segments, 0..5
    this.shown = 0;            // what's drawn: eases to `fill` (a pickup eases in over ~160 ms)
    this.fullAt = -1;          // time it filled, or -1
    this.charge = 0;           // the big blast's charge, 0..1 (drawn as faster spin)
    this.key = `zmeter-${name}-${scene.sys.settings.key}`;
    if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
    this.tex = scene.textures.createCanvas(this.key, W, H);
    this.ctx = this.tex.getContext();
    this.ctx.imageSmoothingEnabled = false;
    this.image = scene.add.image(x, y, this.key).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.ready = false;
    this.setup();
  }

  get full() { return this.fill >= SEGMENTS - 1e-6; }

  async setup() {
    const L = {};
    L.frame = snap(await raster((this.cfg.frame || frameSVG)()), this.cfg.pal);
    L.mask = snap(await raster(tubeMaskSVG()), null);
    const seg = await raster(segSVG());
    L.ink = snap(await raster(inkSVG()), [INK], 110);
    L.rim = snap(await raster(rimSVG()), [hex('#fffbe0')], 110);
    for (let y = FR.y - 3; y < FR.y + 4; y++) {
      const i = (y * W + 140) * 4, c = L.frame.data;
      if (c[i + 3] && c[i] === INK[0] && c[i + 1] === INK[1] && c[i + 2] === INK[2]) L.lineY = y;
    }
    L.segOf = new Int8Array(W * H).fill(-1);
    for (let i = 0; i < W * H; i++) if (L.mask.data[i * 4 + 3]) L.segOf[i] = Math.max(0, Math.round(seg.data[i * 4] / 40) - 1);
    this.img = {};
    this.base = {};
    this.cfg.pieces.forEach((p) => {
      const k = `zmeter-${this.name}-${p}`;
      if (!this.scene.textures.exists(k)) return;
      this.img[p] = this.scene.textures.get(k).getSourceImage();
      this.base[p] = baseOf(this.img[p]);
    });
    this.L = L;
    this.ready = true;
  }

  update(time) {
    if (!this.ready || !this.scene.sys.isActive()) return;
    // Ease what's drawn toward the real fill (each fruit eases in).
    const target = Math.min(SEGMENTS, Math.max(0, this.fill));
    this.shown += (target - this.shown) * 0.18;
    if (Math.abs(target - this.shown) < 0.004) this.shown = target;
    if (this.full && this.fullAt < 0) this.fullAt = time;
    if (!this.full) this.fullAt = -1;
    this.render(time, this.shown, this.fullAt >= 0 ? time - this.fullAt : -1);
    this.tex.refresh();
  }

  render(t, fill, full) {
    const { L, cfg } = this;
    const ctx = this.ctx;
    const id = ctx.createImageData(W, H), d = id.data;
    over(id, L.frame);
    const RAMP = cfg.ramp;
    const fx = BAR.x0 + segW * fill;
    const pulse = full >= 0 ? Math.floor(full / 70) % 9 : -1;
    const ramp = [...RAMP, ...RAMP.slice(1, -1).reverse()];
    const done = fill >= N - 1e-3;
    for (let y = BAR.y0; y < BAR.y1; y++) for (let x = BAR.x0; x < BAR.x1; x++) {
      const i = y * W + x;
      if (L.segOf[i] < 0) continue;
      if (!done && x >= fx + boltOff(y)) continue;
      if (fill <= 0.01) continue;
      let k = Math.floor((x + (y - BAR.y0) * 0.35 - t * 0.06) / 7);
      k = ((k % ramp.length) + ramp.length) % ramp.length;
      let c = ramp[k];
      const row = y - BAR.y0;
      if (row >= 3 && row <= 5) c = RAMP[Math.min(RAMP.length - 1, RAMP.indexOf(c) + 2)] || c;
      if (row === 4 && (x % 11) < 6) c = HOT[1];
      if (full >= 0 && pulse <= 1) c = HOT[pulse === 0 ? 0 : 3];
      put(d, x, y, c);
    }
    if (full < 0 && fill > 0.01) {
      const inFill = (x, y) => L.segOf[y * W + x] >= 0 && x < fx + boltOff(y);
      for (let y = BAR.y0; y < BAR.y1; y++) for (let x = Math.floor(fx) - 14; x < fx + 14; x++) {
        if (!inFill(x, y)) continue;
        if (!inFill(x + 1, y) || (!inFill(x, y - 1) && y > BAR.y0 + 1 && L.segOf[(y - 1) * W + x] >= 0)
          || (!inFill(x, y + 1) && L.segOf[(y + 1) * W + x] >= 0)) put(d, x, y, HOT[0]);
        else if (!inFill(x + 2, y)) put(d, x, y, HOT[1]);
      }
    }
    // crackle
    const R = rng(Math.floor(t / 67) * 7919 + 13);
    const nb = full >= 0 ? 4 : 2;
    for (let b = 0; b < nb && fx - BAR.x0 > 16; b++) {
      let x = BAR.x0 + 6 + Math.floor(R() * Math.max(1, fx - BAR.x0 - 30));
      let y = BAR.y0 + 6 + Math.floor(R() * (BAR.y1 - BAR.y0 - 12));
      const len = 14 + Math.floor(R() * 22);
      const path = [];
      for (let s = 0; s < len; s++) {
        path.push([x, y]);
        x += 1; if (R() < 0.45) y += R() < 0.5 ? -1 : 1;
        y = Math.max(BAR.y0 + 3, Math.min(BAR.y1 - 4, y));
        if (!done && x >= fx + boltOff(y) - 2) break;
        if (R() < 0.06) {
          let bx = x, by = y; const dir = R() < 0.5 ? -1 : 1;
          for (let k2 = 0; k2 < 5; k2++) { bx += 1; by += dir; if ((done || bx < fx + boltOff(by) - 2) && L.segOf[by * W + bx] >= 0) put(d, bx, by, HOT[2]); }
        }
      }
      path.forEach(([px, py]) => {
        if (L.segOf[py * W + px] < 0) return;
        put(d, px, py, HOT[0]);
        if (L.segOf[(py + 1) * W + px] >= 0) put(d, px, py + 1, HOT[2]);
      });
    }
    // twinkles
    const T = rng(Math.floor(t / 180) * 31 + 5);
    for (let s = 0; s < (full >= 0 ? 4 : 2) && fx - BAR.x0 > 20; s++) {
      const sx = BAR.x0 + 8 + Math.floor(T() * (fx - BAR.x0 - 16)), sy = BAR.y0 + 6 + Math.floor(T() * 26);
      const big = T() < 0.5;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], ...(big ? [[2, 0], [-2, 0], [0, 2], [0, -2]] : [])].forEach(([a, b]) => {
        if (L.segOf[(sy + b) * W + sx + a] >= 0) put(d, sx + a, sy + b, a === 0 && b === 0 ? HOT[0] : HOT[1]);
      });
    }
    over(id, L.ink);
    over(id, L.rim);
    if (full >= 0) {
      const ringColor = [hex('#fff27a'), hex('#ffe600'), hex('#ffffff')];
      if (pulse <= 3) {
        const a = id.data, k = L.ink.data;
        const col = pulse <= 1 ? hex('#ffffff') : hex('#ffe600');
        for (let i = 0; i < a.length; i += 4) {
          if (!k[i + 3]) continue;
          const p = i / 4;
          if (L.segOf[p] >= 0 && L.segOf[p - W] >= 0 && L.segOf[p + W] >= 0 && L.segOf[p - 1] >= 0 && L.segOf[p + 1] >= 0) continue;
          a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2];
        }
      }
      if (pulse >= 1 && pulse <= 4) {
        const g = pulse + 1;
        ringRect(d, FR.x - g, FR.y - g, FR.w + g * 2, FR.h + g * 2, pillR + O + g, ringColor[Math.min(2, pulse - 1)]);
        ringCircle(d, RC.x, RC.y, RC.r + g, ringColor[Math.min(2, pulse - 1)]);
      }
      fullSparkles(d, full);
    }
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(id, 0, 0);
    // Chris's pieces: the dressing on the frame's top black line, the
    // Zebonky spinning (faster when full, faster still charging), the fruit
    // riding the charge's front edge.
    cfg.dressing.forEach(([p, x]) => { if (this.img[p]) ctx.drawImage(this.img[p], x, L.lineY - this.base[p]); });
    const spin = this.charge > 0 ? 30 : full >= 0 ? 60 : 110;
    const fr = this.img[cfg.frames[Math.floor(t / spin) % cfg.frames.length]];
    if (fr) ctx.drawImage(fr, Math.round(RC.x - fr.width / 2), Math.round(RC.y - fr.height / 2 + 1));
    if (full < 0 && this.img.berry) {
      const bx = Math.round(Math.min(fx, BAR.x1 - 20)), bob = Math.floor(t / 250) % 2;
      ctx.drawImage(this.img.berry, bx - 15, BAR.y0 - 21 - bob);
    }
  }

  destroy() {
    this.image.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}

function star(d, cx, cy, r, col) {
  const px = new Set();
  const add = (x, y) => px.add(x + ',' + y);
  add(0, 0);
  for (let k = 1; k <= r; k++) { add(k, 0); add(-k, 0); add(0, k); add(0, -k); }
  if (r >= 3) { add(1, 1); add(-1, 1); add(1, -1); add(-1, -1); }
  if (r >= 5) [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => add(a, b));
  px.forEach((p) => {
    const [x, y] = p.split(',').map(Number);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (!px.has((x + a) + ',' + (y + b))) put(d, cx + x + a, cy + y + b, INK); });
  });
  px.forEach((p) => {
    const [x, y] = p.split(',').map(Number);
    put(d, cx + x, cy + y, x === 0 && y === 0 && r >= 2 ? HOT[0] : col);
  });
}
function fullSparkles(d, full) {
  const SLOTS = 9, PERIOD = 900, LIFE = 420;
  for (let s = 0; s < SLOTS; s++) {
    const local = full - (s * PERIOD) / SLOTS;
    if (local < 0) continue;
    const cycle = Math.floor(local / PERIOD), age = local % PERIOD;
    if (age >= LIFE) continue;
    const r = [1, 2, 4, 5, 4, 2, 1][Math.min(6, Math.floor(age / 60))];
    const R = rng(s * 1009 + cycle * 7919 + 3);
    let x, y;
    if (R() < 0.3) {
      const a = R() * Math.PI * 2, dist = RC.r + 6 + Math.floor(R() * 5);
      x = Math.round(RC.x + Math.cos(a) * dist); y = Math.round(RC.y + Math.sin(a) * dist);
    } else {
      const side = R();
      if (side < 0.4) { x = FR.x + 100 + Math.floor(R() * (FR.w - 110)); y = FR.y - 6 - Math.floor(R() * 8); }
      else if (side < 0.8) { x = FR.x + 30 + Math.floor(R() * (FR.w - 30)); y = FR.y + FR.h + 6 + Math.floor(R() * 8); }
      else { x = FR.x + FR.w + 6 + Math.floor(R() * 10); y = FR.y + 6 + Math.floor(R() * (FR.h - 12)); }
    }
    x = Math.max(5, Math.min(W - 6, x)); y = Math.max(5, Math.min(H - 6, y));
    star(d, x, y, r, SPARK_COLS[Math.floor(R() * SPARK_COLS.length)]);
  }
}
function ringRect(d, x, y, w, h, r, c) {
  const inside = (px, py) => {
    const cx = Math.max(x + r, Math.min(x + w - r, px)), cy = Math.max(y + r, Math.min(y + h - r, py));
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  };
  for (let yy = Math.floor(y); yy <= y + h; yy++) for (let xx = Math.floor(x); xx <= x + w; xx++) {
    if (inside(xx, yy) && !(inside(xx - 1, yy) && inside(xx + 1, yy) && inside(xx, yy - 1) && inside(xx, yy + 1))) {
      if (xx < RC.x + RC.r - 2 && (xx - RC.x) ** 2 + (yy - RC.y) ** 2 < (RC.r + 6) ** 2) continue;
      put(d, xx, yy, c);
    }
  }
}
function ringCircle(d, cx, cy, r, c) {
  for (let a = 0; a < 720; a++) {
    const t = a / 720 * Math.PI * 2, x = Math.round(cx + Math.cos(t) * r), y = Math.round(cy + Math.sin(t) * r);
    if (x > cx + r * 0.7 && y > BAR.y0 - 12 && y < BAR.y1 + 12) continue;
    put(d, x, y, c);
  }
}
