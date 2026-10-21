// Finding a way through a level using only the moves the player has, so the
// guide Zebonky leads along a route the player can actually follow.
//
// Works on the level's text grid (see data/levels.js), one tile at a time.
// A spot is somewhere you can stand (an empty tile with floor or a platform
// under it) or the surface of water. The moves between spots:
//   walk     one tile left or right on the same level
//   jump     as far as a running, full-height jump really carries her (up to
//            2 tiles up; about 3 across at 2 up, 4 at 1 up or level, 5
//            when landing lower); also straight up through a platform
//   current  into the uphill waterfall, which carries you up; step out onto
//            anything within 3 tiles of it on the way
//   drop     step off a ledge and fall, or drop down through a platform
//   swim     along the water's surface; hop out onto a bank up to 2 tiles up
//   door     through a pair of hidden doors
// Every jump is traced as an arc and refused if it would pass through solid
// ground. Used by the game (the guide's route) and the designer (warnings).

const SOLID = new Set(['#', 's', 'R']);

// How many tiles across a running, full-height jump carries you when it
// lands h tiles lower (h negative: higher), from the game's physics
// (Platformer.js: jump 790 px/s, gravity 1900, run 300 px/s, 64 px tiles),
// plus most of a tile for taking off at one edge and landing on the other.
const JUMP_V = 790;
const GRAVITY = 1900;
const RUN = 300;
const TILE_PX = 64;
function reach(h) {
  const rise = -h * TILE_PX;                       // how far up the landing is
  const disc = JUMP_V * JUMP_V - 2 * GRAVITY * rise;
  if (disc < 0) return -1;                         // too high to reach at all
  const t = (JUMP_V + Math.sqrt(disc)) / GRAVITY;  // time until coming down to it
  return Math.floor((RUN * t) / TILE_PX + 0.6);
}
const BODY = 0.27;                     // half the player's width, in tiles

export function makeNav(rows) {
  const R = rows.length;
  const C = Math.max(...rows.map((r) => r.length));
  // Beyond the left and right edges is wall; above and below is open.
  const ch = (r, c) => {
    if (c < 0 || c >= C) return '#';
    if (r < 0 || r >= R) return '.';
    return rows[r][c] || '.';
  };
  const solid = (r, c) => SOLID.has(ch(r, c));
  const water = (r, c) => ch(r, c) === '~';
  const current = (r, c) => ch(r, c) === 'W';
  const floorAt = (r, c) => solid(r, c) || ch(r, c) === '=';
  const stand = (r, c) => r >= 0 && r < R && !solid(r, c) && !water(r, c) && floorAt(r + 1, c);
  const surface = (r, c) => water(r, c) && !water(r - 1, c) && !solid(r - 1, c);
  const isSpot = (r, c) => c >= 0 && c < C && (stand(r, c) || surface(r, c));

  // Falling straight down a column: where you come to rest, or null for a pit.
  const fallFrom = (r, c) => {
    for (let y = r; y < R; y++) {
      if (solid(y, c)) return null;
      if (water(y, c)) return y;
      if (stand(y, c)) return y;
    }
    return null;
  };

  // Trace a jump from one spot's feet to another's and make sure nothing
  // solid is in the way of the body at any point.
  const arcClear = (r0, c0, r1, c1, up) => {
    const xs = c0 + 0.5;
    const ys = r0 + 1;
    const xe = c1 + 0.5;
    const ye = r1 + 1;
    const peak = Math.min(ys, ye) - (up ? 0.55 : 0.35);
    const lift = (ys + ye) / 2 - peak;
    for (let i = 1; i < 16; i++) {
      const t = i / 16;
      const x = xs + (xe - xs) * t;
      const y = ys + (ye - ys) * t - 4 * lift * t * (1 - t);
      for (const dy of [0.08, 0.5, 0.92]) {
        for (const dx of [-BODY, BODY]) {
          if (solid(Math.floor(y - dy), Math.floor(x + dx))) return false;
        }
      }
    }
    return true;
  };

  // Doors: digit -> the two spots carrying it.
  const doors = {};
  rows.forEach((row, r) => [...row].forEach((d, c) => {
    if (d >= '1' && d <= '9') (doors[d] = doors[d] || []).push({ r, c });
  }));

  function moves(r, c) {
    const out = [];
    const add = (nr, nc, type, cost) => out.push({ r: nr, c: nc, type, cost });
    if (surface(r, c)) {
      for (const d of [-1, 1]) {
        if (surface(r, c + d)) add(r, c + d, 'swim', 1.5);
        for (const up of [0, 1, 2]) {
          if (stand(r - up, c + d) && arcClear(r, c, r - up, c + d, true)) {
            add(r - up, c + d, 'jump', 2 + up);
            break;
          }
        }
      }
      return out;
    }
    for (const d of [-1, 1]) {
      // walk, or step off the edge and fall
      if (stand(r, c + d)) add(r, c + d, 'walk', 1);
      else if (!solid(r, c + d) && !floorAt(r + 1, c + d)) {
        const y = fallFrom(r, c + d);
        if (y !== null) add(y, c + d, 'drop', 1 + 0.2 * (y - r));
      }
      // jumps, as far as the real jump reaches (taking off from the edge of
      // a tile and landing with a toe on the far one)
      for (let dist = d < 0 ? 0 : 1; dist <= 7; dist++) {
        const nc = c + d * dist;
        for (let h = -2; h <= 8; h++) {
          if (dist === 0 && h >= 0) continue;   // straight up only
          if (h === 0 && dist === 1) continue;
          if (dist > reach(h)) continue;
          if (h > 0 && dist === 1) continue;    // that's a drop
          const nr = r + h;
          if (!isSpot(nr, nc)) continue;
          if (arcClear(r, c, nr, nc, h < 0)) add(nr, nc, 'jump', 1.5 + dist * 0.5 + Math.abs(h) * 0.5);
        }
      }
    }
    // into the uphill waterfall beside you: ride it up and step out
    for (const d of [-1, 1]) {
      if (!current(r, c + d) && !current(r - 1, c + d)) continue;
      let lo = c + d;
      let hi = c + d;
      while (current(r, lo - 1) || current(r - 1, lo - 1)) lo--;
      while (current(r, hi + 1) || current(r - 1, hi + 1)) hi++;
      let top = r;
      while (top > 0 && (current(top - 1, lo) || current(top - 1, hi))) top--;
      for (let nr = Math.max(0, top - 1); nr < r; nr++) {
        for (let nc = lo - 3; nc <= hi + 3; nc++) {
          if (nc >= lo && nc <= hi) continue;
          if (stand(nr, nc)) add(nr, nc, 'current', 3 + (r - nr) * 0.2 + Math.abs(nc - c) * 0.3);
        }
      }
    }
    // drop down through a platform
    if (ch(r + 1, c) === '=') {
      const y = fallFrom(r + 2, c);
      if (y !== null) add(y, c, 'drop', 2 + 0.2 * (y - r));
    }
    // a hidden door
    const d = ch(r, c);
    if (doors[d] && doors[d].length === 2) {
      const other = doors[d].find((p) => p.r !== r || p.c !== c);
      if (other && isSpot(other.r, other.c)) add(other.r, other.c, 'door', 4);
    }
    return out;
  }

  // The nearest spot to a tile (looking a little up, down and sideways).
  function nearestSpot(r, c) {
    if (isSpot(r, c)) return { r, c };
    for (let rad = 1; rad <= 3; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (isSpot(r + dr, c + dc)) return { r: r + dr, c: c + dc };
        }
      }
    }
    return null;
  }

  // Cheapest route between two tiles, as a list of steps [{r, c, type}],
  // the first being the start. Null when there's no way the player could go.
  // avoid(r, c), if given, rules out landing on those spots.
  function find(from, to, closest = false, avoid = null) {
    const a = nearestSpot(from.r, from.c);
    const b = nearestSpot(to.r, to.c);
    if (!a || !b) return null;
    const key = (p) => p.r * 10000 + p.c;
    const best = new Map([[key(a), 0]]);
    const prev = new Map();
    const open = [{ ...a, cost: 0 }];
    while (open.length) {
      let i = 0;
      for (let j = 1; j < open.length; j++) if (open[j].cost < open[i].cost) i = j;
      const cur = open.splice(i, 1)[0];
      if (cur.r === b.r && cur.c === b.c) break;
      if (cur.cost > best.get(key(cur))) continue;
      for (const m of moves(cur.r, cur.c)) {
        if (avoid && avoid(m.r, m.c)) continue;
        const cost = cur.cost + m.cost;
        const k = key(m);
        if (best.has(k) && best.get(k) <= cost) continue;
        best.set(k, cost);
        prev.set(k, { r: cur.r, c: cur.c, type: m.type });
        open.push({ r: m.r, c: m.c, cost });
      }
    }
    let goal = b;
    if (!best.has(key(b))) {
      if (!closest) return null;
      // The reachable spot nearest the goal.
      let bestD = Infinity;
      best.forEach((_, k) => {
        const r = Math.floor(k / 10000);
        const c = k % 10000;
        const dd = Math.hypot(r - b.r, c - b.c);
        if (dd < bestD) { bestD = dd; goal = { r, c }; }
      });
    }
    const path = [];
    let p = { r: goal.r, c: goal.c, type: 'end' };
    while (p) {
      const back = prev.get(key(p));
      path.unshift({ r: p.r, c: p.c, type: back ? back.type : 'start' });
      if (!back) break;
      p = { r: back.r, c: back.c };
    }
    path.reached = goal === b;
    return path;
  }

  return { find, isSpot, surface, nearestSpot };
}
