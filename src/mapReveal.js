// An area painting in on the map (the user, 2026-11-16: "Can we have the
// paint in be more stylistic ... paint splotches, sparkles"; they chose
// paint splotches and sparkles). The area's colour layer (Chris's pixels,
// tools/make_map_layers.py) shows only inside paint blots that splat onto it
// one after another, starting at the area's badge and spreading out, each
// with a ragged edge and a few flung drops, until the area is covered. Each
// splat throws a little burst of sparkles.
//
// How: for the length of the reveal the layer's image draws from a canvas
// texture. Every frame the canvas is cleared, the blots are drawn, and
// Chris's layer is drawn over them with 'source-in', so only the blotted
// parts show. At the end the image goes back to the layer's own texture.
//
//   paintIn(scene, area, image, from, parent)
//     image: the layer's Image (in the scaled map container)
//     from: where to start, in map pixels ({ x, y }), e.g. the area's badge
//     parent: the container the sparkles go in (map pixels)

// The first passes hid most of an area within a second: blots landing in
// turn at a fixed interval cover a long thin area (the coast) almost at
// once. Now each blot lands when the paint's front reaches it, timed by its
// distance from the start, so the colour spreads across at an even pace.
const SPLATS = 60;           // blots per area
const SPREAD_MS = 3000;      // the front reaching the farthest blot (~4 s in all)
const GROW_MS = 950;         // one blot spreading to full size
const SPARKS = 4;            // sparkles per splat
let revealCount = 0;

// A sparkle: a small four-point star, made once.
function sparkleTexture(scene) {
  const key = 'map-sparkle';
  if (scene.textures.exists(key)) return key;
  const S = 24;
  const tex = scene.textures.createCanvas(key, S, S);
  const ctx = tex.getContext();
  const c = S / 2;
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.moveTo(c, 0);
  ctx.quadraticCurveTo(c, c, S, c);
  ctx.quadraticCurveTo(c, c, c, S);
  ctx.quadraticCurveTo(c, c, 0, c);
  ctx.quadraticCurveTo(c, c, c, 0);
  ctx.fill();
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(c, c, 2.5, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
  return key;
}

// Where the blots go: spread over the layer's painted pixels (farthest-point
// picks from a grid of them), starting nearest `start`, and the radius that
// covers every painted pixel once all have grown.
function plan(img, start) {
  const w = img.width;
  const h = img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, w, h).data;
  const pts = [];
  const STEP = 6;
  for (let y = 0; y < h; y += STEP) {
    for (let x = 0; x < w; x += STEP) {
      if (data[(y * w + x) * 4 + 3] > 0) pts.push([x, y]);
    }
  }
  if (!pts.length) return { centers: [[w / 2, h / 2]], R: Math.hypot(w, h) };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  let first = pts[0];
  pts.forEach((p) => { if (d2(p, start) < d2(first, start)) first = p; });
  const centers = [first];
  const near = pts.map((p) => d2(p, first));
  while (centers.length < SPLATS) {
    let best = 0;
    near.forEach((v, i) => { if (v > near[best]) best = i; });
    const c2 = pts[best];
    centers.push(c2);
    pts.forEach((p, i) => { near[i] = Math.min(near[i], d2(p, c2)); });
  }
  // Order by distance from the start, so the paint spreads outward.
  centers.sort((a, b) => d2(a, start) - d2(b, start));
  const R = Math.sqrt(Math.max(...near)) * 1.35 + 12;
  return { centers, R };
}

// One blot's ragged outline and its flung drops, fixed when it's made.
function makeBlot(x, y) {
  const n = 13;
  const edge = Array.from({ length: n }, () => 0.78 + Math.random() * 0.4);
  const drops = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({
    a: Math.random() * Math.PI * 2,
    d: 1.08 + Math.random() * 0.45,
    s: 0.09 + Math.random() * 0.1,
  }));
  return { x, y, edge, drops, r: 0 };
}

function drawBlot(ctx, b, R) {
  const r = b.r * R;
  if (r <= 0) return;
  const n = b.edge.length;
  const pt = (i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * b.edge[i % n];
    return [b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr];
  };
  ctx.beginPath();
  let [px, py] = pt(0);
  let [qx, qy] = pt(1);
  ctx.moveTo((px + qx) / 2, (py + qy) / 2);
  for (let i = 1; i <= n; i++) {
    [px, py] = pt(i);
    [qx, qy] = pt(i + 1);
    ctx.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
  }
  ctx.fill();
  b.drops.forEach((dr) => {
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(dr.a) * r * dr.d, b.y + Math.sin(dr.a) * r * dr.d, r * dr.s, 0, Math.PI * 2);
    ctx.fill();
  });
}

// A splat's sparkles: they burst out, turn, and fade.
function sparkle(scene, parent, x, y, size) {
  const key = sparkleTexture(scene);
  for (let i = 0; i < SPARKS; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = size * (0.35 + Math.random() * 0.55);
    const s = scene.add.image(x, y, key).setScale(0).setAngle(Math.random() * 90);
    parent.add(s);
    const big = 1.0 + Math.random() * 0.9;
    scene.tweens.add({
      targets: s,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist,
      angle: s.angle + 120,
      duration: 650 + Math.random() * 300,
      ease: 'Cubic.Out',
    });
    scene.tweens.add({
      targets: s,
      scale: { from: 0, to: big },
      duration: 220,
      yoyo: true,
      hold: 200 + Math.random() * 200,
      ease: 'Sine.Out',
      onComplete: () => s.destroy(),
    });
  }
}

export function paintIn(scene, area, image, from, parent) {
  const srcKey = `map-${area}`;
  const src = scene.textures.get(srcKey).getSourceImage();
  const w = src.width;
  const h = src.height;
  const map = image.parentContainer;
  const sx = map ? map.scaleX : 1;
  const sy = map ? map.scaleY : 1;
  // `from` in the layer's own pixels.
  const start = [from.x / sx - image.x, from.y / sy - image.y];
  const { centers, R } = plan(src, start);

  // Each reveal draws on its own canvas, and only the newest one for an
  // image hands it back its texture (two overlapping reveals of one area
  // once removed the canvas the other was still drawing on).
  revealCount += 1;
  const key = `reveal-${area}-${revealCount}`;
  image.revealKey = key;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  const filter = scene.textures.get(srcKey).source[0].scaleMode;
  tex.setFilter(filter);
  image.setTexture(key).setAlpha(1).setVisible(true);

  const blots = centers.map(([x, y]) => makeBlot(x, y));
  const draw = () => {
    if (image.revealKey !== key) return;     // a newer reveal has taken over
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    blots.forEach((b) => drawBlot(ctx, b, R));
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(src, 0, 0);
    tex.refresh();
  };
  draw();
  // One redraw a frame, however many blots are growing.
  scene.events.on('update', draw);

  const dist = blots.map((b) => Math.hypot(b.x - start[0], b.y - start[1]));
  const far = Math.max(1, ...dist);
  let left = blots.length;
  blots.forEach((b, i) => {
    scene.tweens.add({
      targets: b,
      r: 1,
      delay: (dist[i] / far) * SPREAD_MS,
      duration: GROW_MS,
      ease: 'Cubic.Out',        // a splat, then a soak outward
      onStart: () => {
        if (parent) sparkle(scene, parent, (image.x + b.x) * sx, (image.y + b.y) * sy, Math.max(40, R * sx * 1.1));
      },
      onComplete: () => {
        left -= 1;
        if (left > 0) return;
        scene.events.off('update', draw);
        if (image.revealKey === key) {
          image.setTexture(srcKey);
          image.revealKey = null;
        }
        scene.textures.remove(key);
      },
    });
  });
  // Leaving the map mid-reveal: stop drawing.
  scene.events.once('shutdown', () => scene.events.off('update', draw));
}
