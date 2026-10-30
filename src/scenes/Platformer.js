// Concept side-scroller. Every piece of art is a simple rounded-box SVG
// from assets/svg/. Uses the level contract in levelApi.js, so the map,
// quiz and save flow all work exactly as they will in the finished game.

import { LEVELS, MAP_W, MAP_H } from '../data/world.js?v=f1ed798';
import { TILE, layoutFor } from '../data/levels.js?v=f1ed798';
import { state } from '../state.js?v=f1ed798';
import { COLORS, heading, text } from '../theme.js?v=f1ed798';
import { startQuiz, finishLevel, leaveLevel } from '../levelApi.js?v=f1ed798';
import { TERRAIN_SETS, texKey, pick, tileHash, solidRole, roleFiles, platformRole, BLOCKS, BLOCK_COLORS, BLOCKS_SKY } from '../data/artsets.js?v=f1ed798';
import { WildZebonky, GuideZebonky, zebonkyArt, ensureAnims } from '../actors.js?v=f1ed798';
import { makeNav } from '../pathing.js?v=f1ed798';
import { startQuestionRun } from '../data/questions.js?v=f1ed798';
import { audio, musicButton, soundButton } from '../audio.js?v=f1ed798';
import { Companion } from '../companion.js?v=f1ed798';
import { startShowcase } from '../showcase.js?v=f1ed798';
import { startExplorerTour } from '../explorerTour.js?v=f1ed798';
import { LETTERS, lettersFound, findLetter, allLetters, currency, currencyIcon } from '../currency.js?v=f1ed798';

// Walking (the user, 2026-10-25): she builds up to speed instead of
// starting at full speed, and letting go she slides a little before
// stopping. Her top speed is the one the levels' jumps are built for
// (pathing.js).
const RUN_SPEED = 300;        // top speed
const ACCEL = 1100;           // about a quarter second to walking speed
const TURN_ACCEL = 2600;      // pushing against her own speed: a quick skid round
const SLIDE_DRAG = 1300;      // let go at walking speed: a slide of about half a tile
const JUMP_SPEED = 790;       // about 2.5 tiles high
const COYOTE_MS = 100;        // can still jump just after running off a ledge
const JUMP_BUFFER_MS = 130;   // a jump pressed just before landing still counts

// Water: you float down slowly and each jump press is a swim stroke.
const SWIM_SPEED = 220;
const SWIM_STROKE = 430;
const FLOAT_RISE = 170;       // water carries you up to the surface at this speed
const SWIM_DIVE = 200;        // hold Down to swim down
const SWIM_HOP_OUT = 990;     // a stroke near the surface pops you out onto land (her feet clear 2 tiles above the water)
// The Dorsal Cove waterfall flows uphill and carries you with it.
const CURRENT_LIFT = 660;
const CLIMB_SPEED = 260;      // up and down a vine wall
// Hidden doors: a short fade while you slip through.
const DOOR_FADE_MS = 160;
const ARTIST_BG_SCROLL = 0.3;  // the artist's background's parallax speed
const BOTTOM_ROOM = 64;       // the camera can look this far below the level's bottom

// Energy is the row of Z-bolts on the HUD. A wild Zebonky's bump or a fall
// into a pit costs one; a Z-bolt paw print gives one back. Run out and you
// start the level over. How many bolts, and whether there's a bar at all,
// comes from the map's difficulty slider (data/difficulty.js): Junior
// Explorer has no bar and is lifted out of pits; Pioneer has one bolt less.
const HURT_SAFE_MS = 1300;     // blinking, can't be bumped again
const TOSS_VX = 480;
const TOSS_VY = -260;          // a low lob, so it reaches a Zebonky on the ground

// Arrow signpost characters -> their pictures.
const ARROW_SIGNS = { '<': 'sign-left', '>': 'sign-right', '^': 'sign-up', '[': 'sign-upleft', ']': 'sign-upright' };

// Solid tile characters -> [texture on top of a stack, texture underneath].
// The artist's art for test play, if the designer page around this game
// has some ready (window.tmsArtistArt, set by designer/designer.js).
function artistArt() {
  try {
    const a = window.parent !== window && window.parent.tmsArtistArt;
    return a && (a.background || (a.dressing && a.dressing.length)) ? a : null;
  } catch (e) {
    return null;
  }
}

// The artist's art saved with a level by the designer (layout.art: the
// pictures in assets/levels/art/<id>/), in the same shape as above.
function savedArt(art) {
  if (!art || !art.dir) return null;
  const a = {
    background: art.background && art.background.pieces
      ? { w: art.background.w, pieces: art.background.pieces.map((p) => ({ url: art.dir + p.file, x: p.x })) }
      : null,
    dressing: (art.dressing || []).map((d) => ({ url: art.dir + d.file, x: d.x })),
  };
  return a.background || a.dressing.length ? a : null;
}

const SOLID_TEXTURES = {
  '#': ['ground-top', 'ground'],
  s: ['sand-top', 'sand'],
  R: ['rock-top', 'rock'],
};

export class PlatformerScene extends Phaser.Scene {
  constructor() {
    super('Level');
  }

  init(data) {
    this.levelId = data.levelId;
    this.layoutId = data.layoutId || (LEVELS[data.levelId] && LEVELS[data.levelId].layout) || data.levelId;
    this.test = !!data.test;
    this.demo = !!data.demo;
    // Inspect mode (index.html?inspect=1): the dressing tool. The level's art
    // only, with a free-moving marker instead of the explorer.
    this.inspect = !!data.inspect || state.inspectAll;
    // The Zebonky showcase (src/showcase.js): one Zebonky in its own biome.
    this.showcase = data.showcase || null;
    // The explorer tour (src/explorerTour.js): an explorer through all her moves.
    this.explorerTour = data.explorerTour || null;
    // A designer test run (or an inspection, showcase or tour) never touches saved progress.
    state.noSave = this.test || this.inspect || !!this.showcase || !!this.explorerTour;
    this.damaged = false;      // the no-damage reward (currency.js)
    this.inDoor = false;
    this.touchDoor = false;
    this.touchGrab = false;
    this.nearItem = null;      // crate the player is standing at
    this.flingUntil = 0;       // flying off a Zebonky's back: no air drag
    this.touchToss = false;
    this.band = state.difficulty();
    this.lifting = false;
    this.maxEnergy = this.band.maxEnergy;
    this.energy = this.maxEnergy;
    this.food = 0;
    this.safeUntil = 0;
    this.done = false;
    this.lastGrounded = 0;
    this.jumpPressedAt = -1000;
    this.touch = { left: false, right: false, jump: false };
  }

  create() {
    const lvl = LEVELS[this.levelId];
    startQuestionRun(this.levelId);
    // A demo plays the level's saved drawing; a designer test plays the hand-off.
    const layout = layoutFor(this.layoutId, this.test && !this.demo);
    this.art = layout.artset ? this.cache.json.get(`artset:${layout.artset}`) : null;
    this.artName = layout.artset;
    // "Blocks": the drawing as flat legend-coloured blocks with no scenery.
    // Characters, pickups and signs still use their real art.
    this.blocks = layout.artset === BLOCKS;
    if (this.blocks) {
      this.art = null;
      this.artName = null;
    }
    // Test play from the designer can carry the artist's own background and
    // dressing (designer/artist.js); they replace the art set's.
    this.artist = (this.test && !this.demo ? artistArt() : null) || savedArt(layout.art);
    const rows = layout.rows;
    const cols = Math.max(...rows.map((r) => r.length));
    const worldW = cols * TILE;
    const worldH = rows.length * TILE;
    this.worldH = worldH;
    this.worldW = worldW;

    this.physics.world.setBounds(0, 0, worldW, worldH + 400);
    // Below the bottom row. The camera looks a little past it, so pits near
    // the bottom sit clear of the foreground leaves. Solid ground carries
    // on down; in pits the backdrop runs on and fades into the dark, with
    // no edge that could read as a floor.
    if (!this.textures.exists('pit-fade')) {
      const cv = Object.assign(document.createElement('canvas'), { width: 4, height: BOTTOM_ROOM });
      const g = cv.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, BOTTOM_ROOM);
      grad.addColorStop(0, 'rgba(8,16,12,0)');
      grad.addColorStop(1, 'rgba(8,16,12,0.92)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, BOTTOM_ROOM);
      this.textures.addCanvas('pit-fade', cv);
    }
    this.add.image(0, worldH, 'pit-fade').setOrigin(0).setDisplaySize(worldW, BOTTOM_ROOM).setDepth(-2);
    this.add.rectangle(0, worldH + BOTTOM_ROOM, worldW, 400, 0x08100c, 0.92).setOrigin(0).setDepth(-2);
    const ground = this.art && this.art.sets && this.art.sets.ground;
    const under = ground && (ground.deep || ground.fill);
    const skinRock = ground && ground.skin && texKey(this.artName, ground.skin.rock);
    const underKey = skinRock && this.textures.exists(skinRock) ? skinRock : under && under.length && texKey(this.artName, under[0]);
    const bottom = rows[rows.length - 1] || '';
    for (let c = 0; c < cols;) {
      if (!SOLID_TEXTURES[bottom[c]]) { c++; continue; }
      const from = c;
      while (c < cols && SOLID_TEXTURES[bottom[c]]) c++;
      if (underKey && this.textures.exists(underKey)) {
        const earth = this.add.tileSprite(from * TILE, worldH, (c - from) * TILE, 400, underKey).setOrigin(0).setDepth(-1);
        // The skin's rock carries on in line with the tiles above it.
        if (underKey === skinRock) earth.setTilePosition(from * TILE, worldH).setTint(0xe6e6e6);
      } else {
        this.add.rectangle(from * TILE, worldH, (c - from) * TILE, 400, this.blocks ? BLOCK_COLORS['#'] : 0x6b4a2e).setOrigin(0).setDepth(-1);
      }
    }
    // The page's left and right edges are walls; the top and bottom are open
    // (you can jump above the page, and pits drop out of the bottom).
    this.physics.world.checkCollision.down = false;
    this.physics.world.checkCollision.up = false;
    this.cameras.main.setBounds(0, 0, worldW, Math.max(worldH + BOTTOM_ROOM, MAP_H));
    // An undressed level can carry its own sky (night on the waves, a cave).
    this.cameras.main.setBackgroundColor(this.blocks ? (layout.sky || BLOCKS_SKY) : (this.art && this.art.sky) || lvl.color);

    if (this.artist) {
      this.loadArtistArt(worldW, worldH);
    }
    if (this.blocks || (this.artist && this.artist.background)) {
      // No backdrop (or the artist's, once it has loaded).
    } else if (this.art && this.art.background && this.art.background.length) this.buildArtBackdrop(worldW, worldH);
    else this.buildBackdrop(worldW, worldH);
    if (this.art && this.art.foreground) this.buildForeground(worldW);

    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.treasures = this.physics.add.staticGroup();
    let start = { x: TILE * 2, y: worldH - TILE * 3 };
    const treasureSpots = [];
    const at = (r, c) => (rows[r] && rows[r][c]) || '.';

    // Water and current cells, looked up every frame by the player's position.
    this.water = new Set();
    this.current = new Set();
    this.vines = new Set();
    this.signCells = new Set();
    this.surfaceRow = {};
    this.falls = [];
    // For picking tile art, ground runs on past the left and right walls, so
    // it doesn't get a grassy side at the page edge.
    const atWall = (r, c) => at(r, Math.min(cols - 1, Math.max(0, c)));
    const isSolid = (r, c) => !!SOLID_TEXTURES[atWall(r, c)];
    const isPlatform = (r, c) => atWall(r, c) === '=';
    // Tunnel blocks (H) look like the ground around them but can be run
    // into; their neighbours draw as if they were solid, so nothing gives
    // them away (the user, 2026-10-29).
    const isArtSolid = (r, c) => isSolid(r, c) || atWall(r, c) === 'H' || atWall(r, c) === 'l';
    const tunnelCells = [];
    const letterSpots = [];
    this.grounded = this.findGrounded(rows, cols);
    // Hidden doors: digit -> the cells carrying it.
    const doorCells = {};
    // Pickups and Zebonkies, placed once the level is built.
    const foodSpots = [];
    const pawSpots = [];
    const wildSpots = [];
    let guideSpot = null;
    let goalSpot = null;
    const isWater = (r, c) => at(r, c) === '~' || (at(r, c) === 'T' && (at(r, c - 1) === '~' || at(r, c + 1) === '~'));

    this.pitSigns(rows, cols, isSolid, isWater);
    // Banks: ground beside water. They draw in front of the water, which
    // runs a little way in under them, so the shore is the ledge's own
    // edge instead of a square cut (the user, 2026-10-24).
    this.bankCells = new Set();
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (SOLID_TEXTURES[ch] && (isWater(r, c - 1) || isWater(r, c + 1))) this.bankCells.add(`${c},${r}`);
    }));
    const BANK_TUCK = 14;

    rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        if (SOLID_TEXTURES[ch]) {
          // Picture only; collision comes from the merged boxes built below.
          if (this.blocks) {
            this.block(x, y, TILE, BLOCK_COLORS[ch]);
          } else if (!this.drawArtSolid(ch, isArtSolid, r, c, x, y, at)) {
            const [topTex, fillTex] = SOLID_TEXTURES[ch];
            const top = !SOLID_TEXTURES[at(r - 1, c)];
            this.add.image(x, y, top ? topTex : fillTex);
          }
        } else if (ch >= '1' && ch <= '9') {
          (doorCells[ch] = doorCells[ch] || []).push({ c, r });
        } else if (ARROW_SIGNS[ch]) {
          // Arrow signposts: scenery, standing on the floor of their tile.
          this.add.image(x, (r + 1) * TILE, ARROW_SIGNS[ch]).setOrigin(0.5, 1).setDepth(2);
        } else if (ch === 'H') {
          tunnelCells.push({ c, r, x, y });
        } else if (ch === 'L' || ch === 'l') {
          // A letter of ZEBONKY; l is one hidden inside a tunnel.
          letterSpots.push({ c, r, x, y });
          if (ch === 'l') tunnelCells.push({ c, r, x, y });
        } else if (ch === 'f') {
          foodSpots.push({ x, y });
        } else if (ch === 'Z') {
          pawSpots.push({ x, y });
        } else if (ch === 'E' || (ch === 'e' && this.band.extraWild)) {
          // e: a wild Zebonky only Pioneer meets.
          wildSpots.push({ x, y: (r + 1) * TILE });
        } else if (ch === 'B') {
          guideSpot = { x, y: (r + 1) * TILE };
        } else if (isWater(r, c)) {
          const surface = !isWater(r - 1, c);
          const wa = !this.blocks && this.art && this.art.water;
          const wFiles = wa && (surface ? wa.top : wa.body);
          const wKey = wFiles && wFiles.length && texKey(this.artName, pick(wFiles, c, r));
          // A water strip (one long picture per row) is laid across the pool
          // as one piece, each tile showing its own slice of it.
          const sKey = wa && (surface ? wa.top_strip : wa.body_strip) && texKey(this.artName, surface ? wa.top_strip : wa.body_strip);
          if (this.blocks) this.block(x, y, TILE, BLOCK_COLORS['~'], 0.45).setDepth(5);
          else if (sKey && this.textures.exists(sKey)) {
            const tl = isSolid(r, c - 1) ? BANK_TUCK : 0;
            const tr = isSolid(r, c + 1) ? BANK_TUCK : 0;
            const sw = this.textures.get(sKey).getSourceImage().width;
            this.add.tileSprite(x + (tr - tl) / 2, y, TILE + tl + tr, TILE, sKey)
              .setTilePosition((((c * TILE - tl) % sw) + sw) % sw, 0)
              .setDepth(5).setAlpha(wa.alpha ?? 0.75);
          } else {
            const img = wKey && this.textures.exists(wKey)
              ? this.add.image(x, y, wKey).setDepth(5).setAlpha(wa.alpha ?? 0.75)
              : this.add.image(x, y, surface ? 'water-top' : 'water').setDepth(5).setAlpha(0.6);
            // In under the bank on either side.
            const tl = isSolid(r, c - 1) ? BANK_TUCK : 0;
            const tr = isSolid(r, c + 1) ? BANK_TUCK : 0;
            if (tl || tr) img.setDisplaySize(TILE + tl + tr, TILE).setX(x + (tr - tl) / 2);
          }
          this.water.add(`${c},${r}`);
          if (surface) this.surfaceRow[c] = r;
          if (ch === 'T') treasureSpots.push({ x, y });
        } else if (ch === 'V') {
          // Vine wall: the art set's vine tile, or a see-through green block.
          // With a single strand (vine_strand), the whole climbable run shows
          // one vine, hung against the wall beside it.
          const sKey = !this.blocks && this.art && this.art.vine_strand && texKey(this.artName, this.art.vine_strand);
          const vKey = !this.blocks && this.art && this.art.vines && texKey(this.artName, this.art.vines);
          if (sKey && this.textures.exists(sKey)) {
            // In the wall's top row the vine rounds the corner onto the
            // ground (vine_strand_top, which reaches up into the row above);
            // nothing is drawn higher.
            // The side the vine hangs on: a wall (or a platform's end) beside
            // it in this row, or the nearest row below, or else above (a
            // vine climbing to a platform's end, the user, 2026-10-25).
            const wallAt = (rr, cc) => isSolid(rr, cc) || at(rr, cc) === '=';
            const sideOf = (rr) => {
              let lo = c;
              let hi = c;
              while (at(rr, lo - 1) === 'V') lo--;
              while (at(rr, hi + 1) === 'V') hi++;
              if (wallAt(rr, hi + 1)) return { col: hi, flip: false };
              if (wallAt(rr, lo - 1)) return { col: lo, flip: true };
              return { col: Math.floor((lo + hi) / 2), flip: false, free: true };
            };
            const host = () => {
              for (let rr = r; at(rr, c) === 'V'; rr++) {
                const s0 = sideOf(rr);
                if (!s0.free) return { ...s0, up: rr - r };
              }
              for (let rr = r - 1; at(rr, c) === 'V'; rr--) {
                const s0 = sideOf(rr);
                if (!s0.free) return { ...s0, up: rr - r };
              }
              return { ...sideOf(r), up: 0 };
            };
            const h = host(r);
            const tKey = this.art.vine_strand_top && texKey(this.artName, this.art.vine_strand_top);
            const bendable = !h.free && tKey && this.textures.exists(tKey);
            const topRow = h.up === 0 && !wallAt(r - 1, h.flip ? h.col - 1 : h.col + 1);
            if (c !== h.col || (bendable && h.up > 0)) {
              // Not this column, or above the bend.
            } else if (bendable && topRow) {
              // A platform's grass sits lower than the ground's moss tufts.
              const onPlank = at(r, h.flip ? h.col - 1 : h.col + 1) === '=';
              this.add.image(h.flip ? x + TILE / 2 : x - TILE / 2, y + TILE / 2 + (onPlank ? 16 : 0), tKey)
                .setOrigin(h.flip ? 1 : 0, 1).setDepth(1).setFlipX(h.flip);
            } else this.add.image(x, y, sKey).setDepth(1).setFlipX(h.flip);
          } else if (vKey && this.textures.exists(vKey)) this.add.image(x, y, vKey).setDepth(1);
          else this.block(x, y, TILE, BLOCK_COLORS.V, 0.55).setDepth(1);
          this.vines.add(`${c},${r}`);
        } else if (ch === 'W' && this.blocks) {
          this.block(x, y, TILE, BLOCK_COLORS.W, 0.5).setDepth(5);
          this.current.add(`${c},${r}`);
        } else if (ch === 'W') {
          const fk = this.art && this.art.water && this.art.water.falls && texKey(this.artName, this.art.water.falls);
          const art = fk && this.textures.exists(fk);
          const fall = this.add.tileSprite(x, y, TILE, TILE, art ? fk : 'waterfall').setDepth(5).setAlpha(art ? 0.8 : 0.5);
          fall.tilePositionX = (c % 2) * TILE;
          this.falls.push(fall);
          this.current.add(`${c},${r}`);
        } else if (ch === 'F') {
          this.add.image(x + 16, (r + 1) * TILE + 6, 'fin').setOrigin(0.5, 1);
        } else if (ch === '=') {
          const tex = this.blocks ? this.blockTexture('block-platform', TILE, 28, BLOCK_COLORS['='])
            : this.artTexture(this.art && this.art.platform, platformRole(isPlatform, r, c), r, c) || 'platform';
          const p = this.platforms.create(x, r * TILE + 14, tex);
          if (p.height > 28) {
            // A deep art platform: the top 28 px are what the player stands
            // on; the rest (his island's underside) hangs below.
            p.setOrigin(0.5, 14 / p.height).refreshBody();
            p.body.setSize(p.width, 28, false).setOffset(0, 0);
          }
          this.decoratePlatform(x, r, c);
          p.body.checkCollision.down = false;
          p.body.checkCollision.left = false;
          p.body.checkCollision.right = false;
        } else if (ch === 'T') {
          treasureSpots.push({ x, y });
        } else if (ch === 'G') {
          goalSpot = { x, y: (r + 1) * TILE };
          this.goal = this.physics.add.staticImage(x, (r + 1) * TILE - 96, 'goal');
          this.goal.body.setSize(40, 192);
        } else if (ch === 'S' && (lvl.hasSecret || this.test)) {
          // On the map only levels with a secret route show it; a test or
          // demo always shows a drawn one (it just restarts the level).
          // The art set's dressed door (empty until it's opened), else the plain one.
          const db = !this.blocks && this.art && this.art.door_bonus;
          const dk = db && texKey(this.artName, db.file);
          if (dk && this.textures.exists(dk)) {
            // Set back from an edge, so its plants stand on the ground and
            // don't hang over (the user): the dressing reaches about 112 px
            // each side of the door's middle; move it a tile at a time (up to
            // two) toward whichever side has the ground.
            const floorAt = (px) => isSolid(r + 1, Math.floor(px / TILE)) || at(r + 1, Math.floor(px / TILE)) === '=';
            const fits = (cx) => floorAt(cx - 112) && floorAt(cx + 112);
            let dxs = 0;
            for (const t of [0, -1, 1, -2, 2]) {
              if (fits(x + t * TILE)) { dxs = t * TILE; break; }
            }
            this.secret = this.physics.add.staticSprite(x + dxs, (r + 1) * TILE - db.frameHeight / 2, dk, db.frames - 1).setDepth(-0.5);
            this.secret.body.setSize(96, 128).setOffset((db.frameWidth - 96) / 2, db.frameHeight - 128);
            this.secret.dressed = db;
          } else this.secret = this.physics.add.staticImage(x, (r + 1) * TILE - 48, 'secret-door');
        } else if (ch === 'P') {
          start = { x, y };
        }
      });
    });
    this.rows = rows;
    this.nav = makeNav(rows);
    this.buildSolidBoxes(rows);
    this.buildTunnels(tunnelCells, at, isArtSolid);
    this.letterSpots = letterSpots;
    this.crateCount = treasureSpots.length;
    this.buildDoors(doorCells);

    (layout.signs || []).forEach((s) => {
      const x = s.col * TILE + TILE / 2;
      const y = (s.row + 1) * TILE;
      this.add.image(x, y, 'sign').setOrigin(0.5, 1);
      this.add.text(x, y - 76, s.text, text(17, COLORS.inkCss, { align: 'center', lineSpacing: -2 })).setOrigin(0.5);
    });

    // Treasures are numbered left to right, so the first one met asks question 1.
    treasureSpots.sort((a, b) => a.x - b.x).forEach((t, i) => this.spawnTreasure(t.x, t.y, i));
    this.start = start;
    this.safe = { ...start };

    // Player: the explorer chosen on the map (data/characters.js). Her body
    // box is narrower than the picture so hat brims and hair don't snag on ledges.
    this.cid = state.character().id;
    this.makeExplorerAnims();
    this.player = this.physics.add.sprite(start.x, start.y - 16, `${this.cid}-idle`, 0);
    const ex = this.cache.json.get(this.cid);
    this.player.body.setSize(34, 64).setOffset((ex.frameWidth - 34) / 2, ex.frameHeight - 64);
    // A rig explorer's background arm and leg on a vine, behind the vine (depth 1).
    this.playerBack = this.rig ? this.add.sprite(start.x, start.y, `${this.cid}-climb_back`, 0).setDepth(0.5).setVisible(false) : null;
    this.player.setMaxVelocity(RUN_SPEED, 1400);
    this.player.setDragX(SLIDE_DRAG);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.solids);
    // Platforms hold the player except for a moment after Down + Jump.
    this.dropUntil = 0;
    this.physics.add.collider(this.player, this.platforms, null, () => this.time.now >= this.dropUntil);
    this.buildZebonkies(layout, wildSpots, guideSpot, goalSpot);
    this.buildDressing(rows, at, isSolid, worldW, worldH);
    this.buildPickups(foodSpots, pawSpots);
    this.buildLetters();
    // Standing at a crate or a pickup marks it; Down opens or takes it.
    this.physics.add.overlap(this.player, this.treasures, (_, t) => { if (!t.taken) this.nearItem = t; });
    if (this.goal) this.physics.add.overlap(this.player, this.goal, () => this.exit('normal'));
    // The bonus level door opens on Up (or the door button), like a hidden door.
    if (this.secret) this.physics.add.overlap(this.player, this.secret, () => { this.atSecret = true; });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 60);
    this.cameras.main.setDeadzone(120, 80);

    // Keys, chosen so move + jump + throw can be held at once on most
    // keyboards (cheap ones can't read some combinations, like Left + Space
    // + X): arrows with Z jump and X throw, or WASD with J jump and K throw.
    // Space and F work too. The touch buttons show them (KEY_LABELS).
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,Z,ESC,R,X,F,J,K');
    if (this.test) this.keys.R.on('down', () => this.scene.restart());
    this.keys.ESC.on('down', () => this.leave());
    const hudFrom = this.children.list.length;
    this.buildHud(lvl);
    if (this.explorerTour) {
      // No HUD; the tour's own explorer instead of the player.
      this.children.list.slice(hudFrom).forEach((o) => o.setVisible && o.setVisible(false));
      this.player.setVisible(false);
      this.player.body.enable = false;
      startExplorerTour(this, this.explorerTour);
      return;
    }
    if (this.showcase) {
      // No explorer and no HUD: just the Zebonky in its biome.
      this.children.list.slice(hudFrom).forEach((o) => o.setVisible && o.setVisible(false));
      this.player.setVisible(false);
      this.player.body.enable = false;
      const art = zebonkyArt(this, this.artName);
      ensureAnims(this, art);
      startShowcase(this, this.showcase, art);
      return;
    }
    if (this.inspect) {
      this.startInspect(lvl);
      return;
    }

    // The buttons stay in front of the foreground leaves.
    const before = this.children.list.length;
    this.buildTouchControls();
    this.children.list.slice(before).forEach((o) => o.setDepth && o.setDepth(22));

    // Held keys can get stuck while the quiz has the level paused.
    // The companion Zebonky, if they've earned one, rolls along behind her.
    this.companion = state.companion() ? new Companion(this, state.companion()) : null;

    this.events.on('resume', () => {
      this.input.keyboard.resetKeys();
      this.touch = { left: false, right: false, jump: false };
      // One just earned (its biome's last question, answered in the quiz):
      // it joins right here, sparkling in beside her.
      if (!this.companion && state.companion()) this.companion = new Companion(this, state.companion(), true);
    });

    // Leaving the level (or pausing it for a quiz) stops the paddling.
    const quiet = () => audio.loop(this, 'swim', false);
    this.events.on('pause', quiet);
    this.events.once('shutdown', () => {
      quiet();
      this.events.off('pause', quiet);
    });

    this.cameras.main.fadeIn(300, 43, 29, 18);
  }

  makeExplorerAnims() {
    // Her walk: four steps, about two strides a second. A character's
    // manifest can set its own walk speed and footstep frames.
    const ex = this.cache.json.get(this.cid);
    this.rig = !!ex.rig;
    if (this.rig) {
      this.makeRigAnims(ex);
      return;
    }
    this.stepFrames = ex.steps || [0, 2];
    const rates = { idle: 3, walk: ex.walkRate || 8 };
    Object.entries(rates).forEach(([name, rate]) => {
      const key = `${this.cid}-${name}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key),
        frameRate: rate,
        repeat: -1,
      });
    });
  }

  // ---------- tunnels and letters ----------

  // Tunnel blocks: drawn like the solid they sit in (the nearest one beside
  // them), in front of the explorer; each connected run of them fades away
  // while she is inside it, so she can be seen.
  buildTunnels(cells, at, isArtSolid) {
    this.tunnels = [];
    this.tunnelAt = new Map();
    if (!cells.length) return;
    const key = (c, r) => `${c},${r}`;
    const left = new Map(cells.map((t) => [key(t.c, t.r), t]));
    while (left.size) {
      const [k0, t0] = left.entries().next().value;
      left.delete(k0);
      const region = { cells: [t0], imgs: [], alpha: 1 };
      for (let i = 0; i < region.cells.length; i++) {
        const { c, r } = region.cells[i];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
          const k = key(c + dc, r + dr);
          if (left.has(k)) { region.cells.push(left.get(k)); left.delete(k); }
        });
      }
      this.tunnels.push(region);
    }
    this.tunnels.forEach((region) => {
      region.cells.forEach(({ c, r, x, y }) => {
        this.tunnelAt.set(key(c, r), region);
        // The look of the nearest solid beside it, within a few tiles.
        let look = null;
        for (let d = 1; d <= 6 && !look; d++) {
          for (const [cc, rr] of [[c - d, r], [c + d, r], [c, r + d], [c, r - d]]) {
            const ch = at(rr, cc);
            if (SOLID_TEXTURES[ch]) { look = { ch, cc, rr }; break; }
          }
        }
        const ch = look ? look.ch : '#';
        if (look && this.grounded.has(key(look.cc, look.rr))) this.grounded.add(key(c, r));
        const from = this.children.list.length;
        if (this.blocks) this.block(x, y, TILE, BLOCK_COLORS[ch]);
        else if (!this.drawArtSolid(ch, isArtSolid, r, c, x, y, at)) {
          const [topTex, fillTex] = SOLID_TEXTURES[ch];
          this.add.image(x, y, isArtSolid(r - 1, c) ? fillTex : topTex);
        }
        this.children.list.slice(from).forEach((o) => { o.setDepth(4); region.imgs.push(o); });
      });
    });
  }

  updateTunnels() {
    if (!this.tunnels || !this.tunnels.length) return;
    const b = this.player.body;
    const inside = new Set();
    [[b.left + 4, b.top + 4], [b.right - 4, b.top + 4], [b.left + 4, b.bottom - 4], [b.right - 4, b.bottom - 4], [b.center.x, b.center.y]]
      .forEach(([x, y]) => {
        const reg = this.tunnelAt.get(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
        if (reg) inside.add(reg);
      });
    this.tunnels.forEach((reg) => {
      const to = inside.has(reg) ? 0.15 : 1;
      if (Math.abs(reg.alpha - to) < 0.01) return;
      reg.alpha = Phaser.Math.Linear(reg.alpha, to, 0.2);
      if (Math.abs(reg.alpha - to) < 0.02) reg.alpha = to;
      reg.imgs.forEach((o) => o.setAlpha(reg.alpha));
    });
  }

  // The letters of ZEBONKY (L markers, left to right, the first seven): the
  // ones not found yet on this difficulty. Found letters stay found.
  buildLetters() {
    this.letters = [];
    const spots = [...(this.letterSpots || [])].sort((a, b) => a.c - b.c || a.r - b.r).slice(0, LETTERS.length);
    const found = lettersFound(this.levelId);
    spots.forEach((s, i) => {
      const ch = LETTERS[i];
      if (found.includes(ch)) return;
      const t = this.add.text(s.x, s.y, ch, heading(44, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 9 }))
        .setOrigin(0.5).setDepth(3);
      this.tweens.add({ targets: t, y: s.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.letters.push({ ch, t, x: s.x, y: s.y });
    });
  }

  updateLetters() {
    if (!this.letters || !this.letters.length) return;
    const p = this.player;
    this.letters = this.letters.filter((L) => {
      if (Math.abs(p.x - L.x) > 44 || Math.abs(p.y - L.y) > 60) return true;
      findLetter(this.levelId, L.ch);
      audio.sfx(this, 'food');
      this.tweens.killTweensOf(L.t);
      this.tweens.add({ targets: L.t, y: L.y - 70, scale: 1.6, alpha: 0, duration: 450, onComplete: () => L.t.destroy() });
      if (allLetters(this.levelId)) this.floatText(p.x, p.y - 120, 'ZEBONKY!', 34, 1400);
      this.refreshHud();
      return false;
    });
  }

  // What this play earned, for the level ending screen (scenes/LevelEnd.js).
  runResults() {
    const items = (LEVELS[this.levelId] && LEVELS[this.levelId].items) || [];
    const wild = this.wild || [];
    return {
      nodamage: !this.damaged,
      hasWild: wild.length > 0,
      tamed: wild.length > 0 && wild.every((z) => z.fed),
      hasCrates: this.crateCount > 0 && items.length > 0,
      questions: this.crateCount > 0 && items.every((it) => state.hasTreasure(this.levelId, it.id)),
    };
  }

  // The rig explorers: every move loops at its own rate, except the crouch,
  // which goes down once (its first two frames) and then loops the rest.
  makeRigAnims(ex) {
    const id = this.cid;
    this.rigSteps = ex.steps || {};
    Object.entries(ex.anims).forEach(([name, a]) => {
      const key = `${id}-${name}`;
      if (name === 'crouch') {
        if (!this.anims.exists(`${key}down`)) {
          this.anims.create({ key: `${key}down`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: a.fps, repeat: 0 });
          this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 2, end: a.frames - 1 }), frameRate: a.fps, repeat: -1 });
        }
        return;
      }
      if (this.anims.exists(key) || name === 'jump' || name === 'climb_back' || name === 'picker') return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key), frameRate: a.fps, repeat: -1 });
    });
  }

  // The rig explorers' picture each frame: climbing on a vine (the
  // background arm and leg behind it, the rest in front), swimming or
  // treading water, the jump frame by her speed in the air, the crouch,
  // running at speed, walking, standing.
  rigPicture(time, onFloor, onVine, inWater, down) {
    const p = this.player;
    const id = this.cid;
    const vx = Math.abs(p.body.velocity.x);
    const vy = p.body.velocity.y;
    const play = (name) => {
      const k = `${id}-${name}`;
      if (p.anims.currentAnim?.key !== k || !p.anims.isPlaying) p.play(k);
    };
    p.anims.timeScale = 1;
    // Bobbing at the surface can lift her middle a pixel or two out of the
    // water row: she is still swimming, not jumping (the user: it switched
    // animation for a frame). Only a real hop out (rising fast) or landing
    // ends it.
    if (inWater) this.rigWaterAt = time;
    const floating = inWater || (!onFloor && !onVine && vy > -350 && time - (this.rigWaterAt || -1e9) < 300);
    if (onVine) {
      play('climb');
      // Her hands and feet only move while she climbs.
      if (Math.abs(vy) < 20) p.anims.pause();
      else p.anims.resume();
    } else if (floating) {
      play(vx > 40 ? 'swim' : 'tread');
    } else if (!onFloor) {
      const f = vy < -450 ? 3 : vy < -150 ? 4 : vy < 150 ? 5 : vy < 450 ? 8 : 9;
      p.anims.stop();
      p.setTexture(`${id}-jump`, f);
    } else if ((down && vx <= 30) || time < (this.crouchUntil || 0)) {
      if (!p.anims.currentAnim || !p.anims.currentAnim.key.startsWith(`${id}-crouch`)) {
        p.play(`${id}-crouchdown`);
        p.anims.chain(`${id}-crouch`);
      }
    } else if (vx > 30) {
      const name = vx > 230 ? 'run' : 'walk';
      play(name);
      if (name === 'walk') p.anims.timeScale = Phaser.Math.Clamp(vx / 230, 0.6, 1);
      // A footstep as each foot lands, never the same sound twice in a row.
      const frame = p.anims.currentFrame ? p.anims.currentFrame.index - 1 : -1;
      if (frame !== this.walkFrame && (this.rigSteps[name] || []).includes(frame) && p.body.blocked.down) {
        let n;
        do n = Phaser.Math.Between(0, 4); while (n === this.lastStep);
        this.lastStep = n;
        audio.sfx(this, `step-${n}`, { detune: Phaser.Math.Between(-80, 80) });
      }
      this.walkFrame = frame;
    } else {
      play('idle');
    }
    // The swim's frames are wider: keep her body box where it was.
    const fw = p.frame.width;
    if (fw !== this.rigFW) {
      this.rigFW = fw;
      p.body.setOffset((fw - 34) / 2, p.frame.height - 64);
    }
    // On a vine she is in front of it; her background arm and leg are behind.
    p.setDepth(onVine ? 2 : 0);
    const b = this.playerBack;
    if (b) {
      b.setVisible(onVine && p.visible);
      if (onVine) b.setPosition(p.x, p.y).setFlipX(p.flipX).setFrame(p.frame.name);
    }
  }

  // ---------- Zebonkies ----------

  buildZebonkies(layout, wildSpots, guideSpot, goalSpot) {
    this.wild = [];
    this.guide = null;
    const art = zebonkyArt(this, this.artName);
    // The biome's own food (Chris's, assets/food/), from the level's art set;
    // else the Zebonky's art set's.
    const own = this.cache.json.get(`artset:${this.artName}`);
    const ownFood = own && own.food && texKey(this.artName, own.food);
    this.foodTex = ownFood && this.textures.exists(ownFood) ? ownFood
      : art && art.food ? texKey(art.name, art.food) : 'treasure';
    // A biome whose Zebonky eats more than one food (`foods`, the user,
    // 2026-10-25: "Axel eats both"): the food spots take turns. Any one
    // not loaded yet is left out.
    this.foodTexes = [this.foodTex, ...((own && own.foods) || []).map((f) => texKey(this.artName, f))
      .filter((k) => k !== this.foodTex && this.textures.exists(k))];
    // Chris's "good vibe" sparkle, in this food's colours, for the pickups
    // and the guide (the user, 2026-10-24); else the drawn gold star.
    const vibe = own && own.food && texKey(this.artName, own.food.replace(/([^/]+)\.png$/, 'sparkle_$1.png'));
    this.sparkTex = vibe && this.textures.exists(vibe) ? vibe : null;
    if (!art) return;
    ensureAnims(this, art);

    this.wildGroup = this.physics.add.group({ allowGravity: true });
    wildSpots.forEach((sp) => {
      const z = new WildZebonky(this, art, sp.x, sp.y);
      this.wildGroup.add(z.sprite);
      this.wild.push(z);
    });
    this.physics.add.collider(this.wildGroup, this.solids);
    this.physics.add.collider(this.wildGroup, this.platforms);
    this.physics.add.overlap(this.player, this.wildGroup, (_, zs) => this.touchWild(zs.zebonky));

    // The guide leads from its start through the waiting points in order;
    // the exit stays hidden until it reaches the last one.
    if (guideSpot) {
      const points = [guideSpot, ...(layout.waits || []).map((w) => ({ x: w.c * TILE + TILE / 2, y: (w.r + 1) * TILE }))];
      this.guide = new GuideZebonky(this, art, points, (g) => this.revealGoal(g));
      if (this.goal) {
        this.goal.setAlpha(0);
        this.goal.body.enable = false;
      }
    }
  }

  revealGoal(guide) {
    if (!this.goal) return;
    this.floatText(guide.sprite.x, guide.sprite.y - 120, 'This way!', 30);
    this.goal.body.enable = true;
    this.tweens.add({ targets: this.goal, alpha: 1, duration: 700 });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const st = this.add.star(this.goal.x, this.goal.y, 5, 4, 10, 0xfff6b0).setDepth(6);
      this.tweens.add({
        targets: st, x: st.x + Math.cos(a) * 110, y: st.y + Math.sin(a) * 110, alpha: 0, angle: 180,
        duration: 900, ease: 'Cubic.Out', onComplete: () => st.destroy(),
      });
    }
  }

  touchWild(z) {
    if (!z || z.harmless || this.inDoor) return;
    const p = this.player;
    const s = z.sprite;
    const now = this.time.now;
    // Landing on its back: no harm, it's dazed, and the player bounces a
    // full jump on past it.
    if (p.body.velocity.y > 0 && p.body.bottom <= s.body.top + 16) {
      z.daze(now);
      const dir = Math.sign(p.body.velocity.x) || (p.flipX ? -1 : 1);
      p.setVelocity(dir * RUN_SPEED, -JUMP_SPEED);
      this.flingUntil = now + 900;
      this.boostUntil = now + 450;
      this.lastGrounded = -1000;
      return;
    }
    if (now < this.safeUntil) return;
    z.bumped(now);
    const away = Math.sign(p.x - s.x) || 1;
    p.setVelocity(away * 340, -380);
    this.hurt();
  }

  hurt() {
    this.damaged = true;
    // Junior Explorer has no energy: a bump or a fall only blinks.
    if (this.band.energyBar) this.energy = Math.max(0, this.energy - 1);
    this.safeUntil = this.time.now + HURT_SAFE_MS;
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 110, yoyo: true, repeat: 5,
      onComplete: () => this.player.setAlpha(1) });
    this.cameras.main.shake(140, 0.005);
    this.refreshHud();
    if (this.energy === 0) this.outOfEnergy();
  }

  heal() {
    if (!this.band.energyBar || this.energy >= this.maxEnergy) return false;
    this.energy += 1;
    this.refreshHud();
    return true;
  }

  // Pioneer: a quiz question missed after its hint costs a Z-bolt, but
  // never the last one, so a quiz can't send you back to the start. True if
  // a bolt was taken.
  questionMiss() {
    if (!this.band.energyBar || this.energy <= 1) return false;
    this.energy -= 1;
    this.refreshHud();
    return true;
  }

  // No game over: back to the start with full energy. Crates already
  // answered stay answered; food carried is kept.
  outOfEnergy() {
    this.inDoor = true;
    const p = this.player;
    p.body.enable = false;
    this.cameras.main.fadeOut(350, 43, 29, 18);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      p.setPosition(this.start.x, this.start.y);
      p.setVelocity(0, 0);
      this.safe = { ...this.start };
      this.wild.forEach((z) => { if (z.fed) z.catchUpAt(this.start.x, this.floorNear(this.start.x, this.start.y + 48) ?? this.start.y + 32, false); });
      this.energy = this.maxEnergy;
      this.refreshHud();
      this.cameras.main.fadeIn(350, 43, 29, 18);
      p.body.enable = true;
      this.inDoor = false;
    });
  }

  // ---------- food and paw prints ----------

  buildPickups(foodSpots, pawSpots) {
    this.pickups = this.physics.add.staticGroup();
    foodSpots.forEach(({ x, y }, i) => {
      const f = this.pickups.create(x, y, this.foodTexes[i % this.foodTexes.length]).setDepth(3);
      f.kind = 'food';
      this.tweens.add({ targets: f, y: y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.pickupShine(f);
    });
    // Junior Explorer has no energy, so no Z-bolt paw prints either.
    (this.band.energyBar ? pawSpots : []).forEach(({ x, y }) => {
      const z = this.pickups.create(x, y, 'zpaw').setDepth(3);
      z.kind = 'paw';
      this.tweens.add({ targets: z, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.pickupShine(z);
    });
    // Taken on contact; only crates wait for Down.
    this.physics.add.overlap(this.player, this.pickups, (_, it) => { if (it.active) this.collect(it); });

    // Food that has been thrown.
    this.tossed = this.physics.add.group();
    this.physics.add.collider(this.tossed, this.solids);
    this.physics.add.collider(this.tossed, this.platforms);
    if (this.wildGroup) {
      this.physics.add.overlap(this.tossed, this.wildGroup, (f, zs) => {
        const z = zs.zebonky;
        if (z.fed || !f.active) return;
        this.eatFood(f);
        z.feed();
      });
    }
  }

  // A soft glow and sparkles rising from behind a pickup, so it reads as
  // something to grab. Both go when it's taken (collect).
  // A warning sign on the ground just before each pit (a gap in the bottom
  // row), so players see the drop coming.
  pitSigns(rows, cols, isSolid, isWater) {
    if (!this.textures.exists('pit-sign')) {
      // Pixel art at 4 game px a pixel: a yellow warning triangle with a "!"
      // on a wooden post.
      const W = 14;
      const H = 21;
      const px = [];
      const inTri = (x, y) => y >= 0 && y < 12 && x >= 0 && x < W && Math.abs(x - 6.5) <= (y + 1) * 0.6;
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < W; x++) {
          if (!inTri(x, y)) continue;
          const edge = !inTri(x - 1, y) || !inTri(x + 1, y) || !inTri(x, y - 1) || !inTri(x, y + 1);
          const bang = (x === 6 || x === 7) && ((y >= 4 && y <= 7) || y === 9);
          px.push([x, y, edge || bang ? '#2b1d12' : (y < 3 || x > 9 ? '#ffe680' : '#ffcf3a')]);
        }
      }
      for (let y = 12; y < H; y++) {
        px.push([5, y, '#2b1d12'], [8, y, '#2b1d12'], [6, y, '#a8693a'], [7, y, '#7a4a24']);
      }
      const S = 4;
      const cv = Object.assign(document.createElement('canvas'), { width: W * S, height: H * S });
      const g = cv.getContext('2d');
      px.forEach(([x, y, col]) => { g.fillStyle = col; g.fillRect(x * S, y * S, S, S); });
      this.textures.addCanvas('pit-sign', cv);
    }
    const bottom = rows.length - 1;
    const open = (c) => !isSolid(bottom, c) && !isWater(bottom, c);
    for (let c = 1; c < cols; c++) {
      if (!open(c) || open(c - 1)) continue;
      // Stand it on the top of the ground column just before the pit.
      let r = bottom;
      while (r > 0 && isSolid(r - 1, c - 1)) r--;
      if (!isSolid(r, c - 1)) continue;
      this.add.image((c - 1) * TILE + TILE / 2, r * TILE, 'pit-sign').setOrigin(0.5, 1).setDepth(2);
      this.signCells.add(`${c - 1},${r - 1}`);
    }
  }

  pickupShine(it) {
    if (!this.textures.exists('pickup-glow')) {
      const cv = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,250,200,1)');
      grad.addColorStop(0.3, 'rgba(255,232,120,0.8)');
      grad.addColorStop(0.65, 'rgba(255,214,80,0.3)');
      grad.addColorStop(1, 'rgba(255,210,80,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('pickup-glow', cv);
    }
    if (!this.textures.exists('pickup-spark')) {
      // A little four-pointed gold star with a light middle.
      const cv = Object.assign(document.createElement('canvas'), { width: 13, height: 13 });
      const g = cv.getContext('2d');
      g.fillStyle = '#ffcf3a';
      g.fillRect(5, 0, 3, 13);
      g.fillRect(0, 5, 13, 3);
      g.fillRect(4, 4, 5, 5);
      g.fillStyle = '#fff8d8';
      g.fillRect(6, 2, 1, 9);
      g.fillRect(2, 6, 9, 1);
      g.fillRect(5, 5, 3, 3);
      this.textures.addCanvas('pickup-spark', cv);
    }
    const glow = this.add.image(it.x, it.y, 'pickup-glow').setDepth(it.depth - 0.2)
      .setAlpha(0.9);
    this.tweens.add({ targets: glow, scale: 1.2, alpha: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const sparks = this.add.particles(it.x, it.y + 8, this.sparkTex || 'pickup-spark', {
      lifespan: 1400,
      frequency: 110,
      quantity: 1,
      x: { min: -20, max: 20 },
      speedY: { min: -55, max: -28 },
      speedX: { min: -10, max: 10 },
      scale: this.sparkTex ? { start: 1, end: 0.3 } : { start: 1.8, end: 0.5 },
      alpha: { start: 1, end: 0 },
      rotate: this.sparkTex ? 0 : { min: 0, max: 45 },
    }).setDepth(it.depth - 0.1);
    it.shine = [glow, sparks];
  }

  // Thrown food lying on the ground near a point, that no Zebonky is
  // already heading for.
  foodNear(x, y, range) {
    let best = null;
    this.tossed.getChildren().forEach((f) => {
      if (!f.active || !f.landed || Math.abs(f.y - y) > TILE * 2) return;
      if (this.wild.some((z) => z.target === f)) return;
      const d = Math.abs(f.x - x);
      if (d <= range && (!best || d < Math.abs(best.x - x))) best = f;
    });
    return best;
  }

  collect(it) {
    if (it.kind === 'paw') {
      if (!this.heal()) {
        // Leave it for later; say so once per visit, not every frame.
        if (this.time.now > (it.fullUntil || 0)) this.floatText(it.x, it.y - 30, 'Full energy', 20);
        it.fullUntil = this.time.now + 1500;
        return;
      }
      this.floatText(it.x, it.y - 30, '+1 \u26A1', 24);
      audio.sfx(this, 'energy');
    } else {
      this.food += 1;
      this.refreshHud();
      audio.sfx(this, 'food');
    }
    this.tweens.killTweensOf(it);
    (it.shine || []).forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
    it.destroy();
  }

  tossFood() {
    if (this.food <= 0) {
      this.floatText(this.player.x, this.player.y - 70, 'No food!', 22);
      return;
    }
    this.food -= 1;
    this.refreshHud();
    const dir = this.player.flipX ? -1 : 1;
    const f = this.tossed.create(this.player.x + dir * 20, this.player.y - 20, this.foodTex);
    f.setVelocity(dir * TOSS_VX, TOSS_VY).setBounce(0.25).setDragX(500).setAngularVelocity(dir * 540);
    f.setCollideWorldBounds(true);
    f.landed = false;
    f.tossedAt = this.time.now;
    audio.sfx(this, 'toss');
  }

  // Food she threw, landed at her feet (not the moment it leaves her hand).
  droppedFoodAt(p) {
    return this.tossed.getChildren().find((f) => f.active && f.landed && this.time.now - (f.tossedAt || 0) > 500
      && Math.abs(f.x - p.x) < 44 && Math.abs(f.y - p.body.bottom) < TILE) || null;
  }

  // Crouch and take it back. A Zebonky walking to it turns away.
  pickUpFood(f, time) {
    f.destroy();
    this.food += 1;
    this.refreshHud();
    audio.sfx(this, 'food');
    this.crouchUntil = time + 280;
  }

  // A Zebonky eats tossed food.
  eatFood(f) {
    if (f && f.active) {
      audio.sfx(this, 'eat');
      f.destroy();
    }
  }

  // ---------- level geometry helpers (used by the Zebonkies) ----------

  cellAt(r, c) {
    return (this.rows[r] && this.rows[r][c]) || '.';
  }

  isFloor(r, c) {
    const ch = this.cellAt(r, c);
    return !!SOLID_TEXTURES[ch] || ch === '=';
  }

  // The top of the floor in this column nearest to height y, or null when
  // there's nothing to stand on within a few tiles of it.
  floorNear(x, y) {
    const c = Math.floor(x / TILE);
    let best = null;
    for (let r = 0; r < this.rows.length; r++) {
      if (this.isFloor(r, c) && !this.isFloor(r - 1, c)) {
        const top = r * TILE;
        if (best === null || Math.abs(top - y) < Math.abs(best - y)) best = top;
      }
    }
    return best === null || Math.abs(best - y) > TILE * 3 ? null : best;
  }

  // A route between two feet positions that the player could take, as
  // points [{x, y, type}] (feet), or null if there's none.
  // With `closest`, when there's no full route it returns the route to the
  // reachable spot nearest the goal instead.
  routeBetween(x0, y0, x1, y1, closest = false) {
    const cell = (x, y) => ({ c: Math.floor(x / TILE), r: Math.floor((y - 4) / TILE) });
    const path = this.nav.find(cell(x0, y0), cell(x1, y1), closest);
    if (!path) return null;
    return path.map((p, k) => ({
      type: p.type,
      x: k === path.length - 1 && path.reached ? x1 : p.c * TILE + TILE / 2,
      y: this.nav.surface(p.r, p.c) ? p.r * TILE + 30 : (p.r + 1) * TILE,
    }));
  }

  // Is this point in water?
  isWaterAt(x, y) {
    return this.water.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
  }

  // Solid floor or a platform right under these feet?
  // Junior Explorer's pit rescue: carry her up and over to the first ground
  // past the pit, on the side she was heading. False if there's none to find.
  liftAcross(p) {
    const feet = this.safe.feet ?? this.safe.y + 52;
    const dir = Math.sign(p.x - this.safe.x) || (p.flipX ? -1 : 1);
    const c0 = Math.floor(p.x / TILE);
    for (let k = 1; k <= 16; k++) {
      const c = c0 + dir * k;
      if (c < 0 || c >= this.rows[0].length) break;
      const x = c * TILE + TILE / 2;
      const top = this.floorNear(x, feet);
      if (top === null || this.floorNear(x + dir * TILE, top) === null) continue;   // needs room to land
      this.lifting = true;
      p.body.enable = false;
      p.setVelocity(0, 0);
      p.setAcceleration(0, 0);
      p.setPosition(p.x, this.worldH + 40);
      this.floatText(x, top - 120, 'Up you go!', 26);
      this.tweens.add({
        targets: p, x, y: top - 72, duration: 900, ease: 'Sine.InOut',
        onComplete: () => {
          p.body.enable = true;
          p.setVelocity(0, 0);
          this.lifting = false;
          this.wild.forEach((z) => { if (z.fed) z.catchUpAt(x, top, p.flipX); });
        },
      });
      return true;
    }
    return false;
  }

  floorUnder(x, feetY) {
    return this.isFloor(Math.floor((feetY + 4) / TILE), Math.floor(x / TILE));
  }

  floatText(x, y, msg, size = 26, duration = 900) {
    const t = this.add.text(x, y, msg, heading(size, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 7,
    })).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration, ease: duration > 900 ? 'Sine.In' : 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ---------- art set ----------

  // A picture from the art set for this role, varied by position.
  artTexture(group, role, r, c) {
    if (!group) return null;
    const files = roleFiles(group, role) || group[role];
    if (!files || !files.length) return null;
    const key = texKey(this.artName, pick(files, c, r));
    return this.textures.exists(key) ? key : null;
  }

  // Auto-tiled solid ground. Returns false when the set has no art for it.
  // Solid tiles joined (through other solid tiles) to the bottom row of the
  // level. Anything else is floating in the air.
  findGrounded(rows, cols) {
    const solid = (r, c) => !!SOLID_TEXTURES[(rows[r] && rows[r][c]) || '.'];
    const seen = new Set();
    const queue = [];
    const last = rows.length - 1;
    for (let c = 0; c < cols; c++) if (solid(last, c)) { seen.add(`${c},${last}`); queue.push([last, c]); }
    while (queue.length) {
      const [r, c] = queue.pop();
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        const k = `${nc},${nr}`;
        if (nr >= 0 && nr <= last && nc >= 0 && nc < cols && !seen.has(k) && solid(nr, nc)) {
          seen.add(k);
          queue.push([nr, nc]);
        }
      });
    }
    return seen;
  }

  // A tile-sized frame of a bigger picture, made once per spot.
  skinFrame(key, name, sx, sy, w, h) {
    const t = this.textures.get(key);
    if (!t.has(name)) t.add(name, 0, sx, sy, w, h);
    return name;
  }

  // A ground tile on an open side: its slice of the rock wall with the
  // side's edge drawn in and the corners rounded (cleared, then outlined)
  // where that side meets an open top or bottom. Made once per kind.
  skinEdgeTile(skin, rock, frameName, sx, sy, openL, openR, openT, openB) {
    const key = `${rock}:${frameName}:${+openL}${+openR}${+openT}${+openB}`;
    if (this.textures.exists(key)) return key;
    const k = (f) => texKey(this.artName, f);
    const cv = Object.assign(document.createElement('canvas'), { width: TILE, height: TILE });
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(this.textures.get(rock).getSourceImage(), sx, sy, TILE, TILE, 0, 0, TILE, TILE);
    if (openL) g.drawImage(this.textures.get(k(skin.edge_left)).getSourceImage(), 0, 0);
    if (openR) g.drawImage(this.textures.get(k(skin.edge_right)).getSourceImage(), 0, 0);
    // Rounding, in art pixels (4 game px): 3 cleared on the corner row, then 2, then 1.
    const P = 4;
    const cut = [3, 2, 1];
    const outline = 'rgb(44,38,56)';
    const corner = (left, top) => {
      cut.forEach((n, i) => {
        const row = top ? i : TILE / P - 1 - i;
        const x0 = left ? 0 : TILE - n * P;
        g.clearRect(x0, row * P, n * P, P);
        g.fillStyle = outline;
        g.fillRect(left ? n * P : TILE - (n + 1) * P, row * P, P, P);
      });
    };
    if (openL && openT) corner(true, true);
    if (openR && openT) corner(false, true);
    if (openL && openB) corner(true, false);
    if (openR && openB) corner(false, false);
    this.textures.addCanvas(key, cv);
    return key;
  }

  // Seamless ground (an art set's ground "skin", tools/make_floor_ground.py):
  // each tile shows the rock wall's slice for its place in the level, so
  // rocks run across tile edges; moss lies along the top and hangs a little
  // over the tile below; open sides get a dark edge.
  drawSkin(skin, isSolid, r, c, x, y) {
    const k = (f) => texKey(this.artName, f);
    const parts = ['rock', 'moss', 'moss_left', 'moss_right', 'edge_left', 'edge_right'];
    if (!parts.every((n) => this.textures.exists(k(skin[n])))) return false;
    const [rw, rh] = skin.rock_tiles;
    const rock = k(skin.rock);
    const openL = !isSolid(r, c - 1);
    const openR = !isSolid(r, c + 1);
    const openT = !isSolid(r - 1, c);
    const openB = !isSolid(r + 1, c);
    // A surface tile shows the cap (the boulder row drawn under the moss),
    // if the skin has one; the rest show their slice of the rock wall.
    const capKey = skin.cap && k(skin.cap);
    const useCap = openT && capKey && this.textures.exists(capKey);
    const src = useCap ? capKey : rock;
    const sx = useCap ? (c % skin.cap_tiles) * TILE : (c % rw) * TILE;
    const sy = useCap ? 0 : (r % rh) * TILE;
    const frameName = this.skinFrame(src, useCap ? `c${c % skin.cap_tiles}` : `s${c % rw}_${r % rh}`, sx, sy, TILE, TILE);
    // Tiles on an open side get their own picture, with the edge drawn in
    // and the corners rounded off where a side meets an open top or bottom.
    const img = openL || openR
      ? this.add.image(x, y, this.skinEdgeTile(skin, src, frameName, sx, sy, openL, openR, openT, openB))
      : this.add.image(x, y, src, frameName);
    // A bank (beside water) draws in front of the water tucked under it.
    if (this.bankCells && this.bankCells.has(`${c},${r}`)) img.setDepth(6);
    // A little darker each row down from the third, so there's no hard line.
    let depth = 0;
    while (depth < 6 && isSolid(r - depth - 1, c)) depth++;
    const shade = Math.round(255 * Math.max(0.8, 1 - 0.05 * Math.max(0, depth - 2)));
    if (shade < 255) img.setTint((shade << 16) | (shade << 8) | shade);
    if (openT) {
      const left = x - TILE / 2;
      const top = r * TILE - (skin.moss_top || 0);
      let moss;
      if (openL) moss = this.add.image(left, top, k(skin.moss_left));
      else if (openR) moss = this.add.image(left, top, k(skin.moss_right));
      else {
        const mk = k(skin.moss);
        const mh = this.textures.get(mk).getSourceImage().height;
        const m = c % skin.moss_tiles;
        moss = this.add.image(left, top, mk, this.skinFrame(mk, `m${m}`, m * TILE, 0, TILE, mh));
      }
      moss.setOrigin(0, 0).setDepth(this.bankCells && this.bankCells.has(`${c},${r}`) ? 6.5 : 0.5);
    }
    return true;
  }

  drawArtSolid(ch, isSolid, r, c, x, y, at) {
    // Ground floating in the air is treetops, if the art set has them.
    const canopy = this.art && this.art.canopy;
    if (ch === '#' && canopy && !this.grounded.has(`${c},${r}`)) {
      const open = [!isSolid(r - 1, c), !isSolid(r + 1, c), !isSolid(r, c - 1), !isSolid(r, c + 1)];
      const files = canopy[open.map((o) => (o ? 1 : 0)).join('')];
      // Each tile's leaves are the slice for its spot on a 2 x 2 grid, so
      // neighbours join without a seam.
      const key = files && texKey(this.artName, files[(r % 2) * 2 + (c % 2)]);
      if (key && this.textures.exists(key)) {
        this.add.image(x, y, key);
        return true;
      }
    }
    const set = this.art && this.art.sets && this.art.sets[TERRAIN_SETS[ch]];
    if (!set) return false;
    if (set.skin && this.drawSkin(set.skin, isSolid, r, c, x, y)) return true;
    let role = solidRole(isSolid, r, c);
    // Deep ground: a few tiles under the surface the dirt turns to stone.
    if (role === 'fill' && set.deep) {
      let depth = 0;
      while (depth < (set.deep_from || 3) && isSolid(r - depth - 1, c)) depth++;
      if (depth >= (set.deep_from || 3)) role = 'deep';
    }
    const key = this.artTexture(set, role, r, c);
    if (!key) return false;
    this.add.image(x, y, key);
    // Little extras on open grass: tufts, pebbles, flowers.
    const scatter = (this.artist && this.artist.dressing) ? [] : this.art.scatter || [];
    if (role.startsWith('top') && scatter.length && at(r - 1, c) === '.'
        && tileHash(c + 101, r + 7) < (this.art.scatter_chance || 0)) {
      const sk = texKey(this.artName, pick(scatter, c + 13, r));
      if (this.textures.exists(sk)) this.add.image(x, r * TILE + 6, sk).setOrigin(0.5, 1).setDepth(1);
    }
    return true;
  }

  // Background layers from the art set. Each repeats across the level,
  // every other copy mirrored so the join always matches.
  buildArtBackdrop(worldW, worldH) {
    this.art.background.forEach((layer, i) => {
      if (layer.column) {
        this.buildBackdropColumn(layer, i, worldW, worldH);
        return;
      }
      if (layer.pieces) {
        this.buildBackdropPieces(layer, i, worldW, worldH);
        return;
      }
      const key = texKey(this.artName, layer.file);
      if (!this.textures.exists(key)) return;
      // A whole-level picture (from the designer's 1:1 guide) is locked to
      // the level and never repeats.
      if (layer.whole) {
        this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-10 + i);
        return;
      }
      const sf = layer.scroll ?? 0.35;
      const src = this.textures.get(key).getSourceImage();
      const top = layer.anchor === 'top';
      // Tall (vertical) levels: a backdrop shorter than the level is pinned
      // to the screen top to bottom, so climbing never runs off the end of
      // it. One painted at the level's full height scrolls with it instead.
      const tall = worldH > MAP_H + TILE && src.height < worldH;
      const scale = tall ? MAP_H / src.height : 1;
      const w = src.width * scale;
      const span = (worldW - MAP_W) * sf + MAP_W + w;
      // Bottom-anchored layers reach the camera's lowest view, so pits in
      // the bottom row look down into more jungle.
      const y = tall ? MAP_H : top ? (layer.offset || 0) : worldH + BOTTOM_ROOM - (layer.offset || 0);
      for (let n = 0, x = 0; x < span; n++, x += w) {
        this.add.image(x, y, key).setOrigin(0, tall || !top ? 1 : 0).setScale(scale)
          .setScrollFactor(sf, tall ? 0 : 1).setDepth(-10 + i)
          .setFlipX(!!layer.mirror_repeat && n % 2 === 1);
      }
    });
  }

  // A wide background cut into pieces (Chris's biome backgrounds,
  // tools/make_biome_artset.py): laid side by side, the whole repeating
  // across the level, bottom-anchored, scrolling slower for parallax.
  buildBackdropPieces(layer, i, worldW, worldH) {
    const sf = layer.scroll ?? 0.3;
    const span = (worldW - MAP_W) * sf + MAP_W;
    let y = worldH + BOTTOM_ROOM - (layer.offset || 0);
    // A picture shorter than the level would show flat sky above it at the
    // top. It scrolls slower up and down instead, just enough that the
    // camera never sees past its top, and its bottom still meets the
    // camera's lowest view.
    const lowest = Math.max(worldH + BOTTOM_ROOM, MAP_H) - MAP_H;
    let sfy = 1;
    if (layer.h && layer.h < worldH + BOTTOM_ROOM && lowest > 0) {
      sfy = Math.max(0, Math.min(1, (layer.h - MAP_H) / lowest));
      y = MAP_H + lowest * sfy - (layer.offset || 0);
    }
    for (let n = 0, x0 = 0; x0 < span; n++, x0 += layer.w) {
      layer.pieces.forEach((file, p) => {
        const key = texKey(this.artName, file);
        const x = x0 + p * layer.piece_w;
        if (x > span || !this.textures.exists(key)) return;
        this.add.image(x, y, key).setOrigin(0, 1).setScrollFactor(sf, sfy).setDepth(-10 + i);
      });
    }
  }

  // The artist's art handed over by the designer: pictures by URL, loaded
  // now and placed when they arrive. The background repeats across the
  // level with the same parallax as an art set's; the dressing pieces sit
  // 1:1 with the level, behind the ground's edge and the player.
  loadArtistArt(worldW, worldH) {
    const a = this.artist;
    const keys = [];
    const queue = (key, url) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      this.load.image(key, url);
      keys.push(key);
    };
    const bgPieces = (a.background && a.background.pieces) || [];
    bgPieces.forEach((p, i) => queue(`artist-bg-${i}`, p.url));
    (a.dressing || []).forEach((d, i) => queue(`artist-dress-${i}`, d.url));
    if (!keys.length) return;
    this.load.once('complete', () => {
      if (!this.sys.isActive()) return;
      // Pixel art: sharp pixels, so edges never blend with see-through neighbours.
      keys.forEach((k) => this.textures.exists(k) && this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST));
      // The whole background at 1:1, then copies after it for as far as
      // the parallax needs.
      if (bgPieces.length) {
        const w = a.background.w;
        const sf = ARTIST_BG_SCROLL;
        const span = (worldW - MAP_W) * sf + MAP_W;
        for (let x0 = 0; x0 < span; x0 += w) {
          bgPieces.forEach((p, i) => {
            if (this.textures.exists(`artist-bg-${i}`)) {
              this.add.image(x0 + p.x, worldH, `artist-bg-${i}`).setOrigin(0, 1).setScrollFactor(sf, 1).setDepth(-10);
            }
          });
        }
      }
      (a.dressing || []).forEach((d, i) => {
        if (this.textures.exists(`artist-dress-${i}`)) this.add.image(d.x, 0, `artist-dress-${i}`).setOrigin(0, 0).setDepth(-1);
      });
    });
    this.load.start();
  }

  // A flat block for the "blocks" look, with a faint edge so tiles can be
  // counted.
  block(x, y, size, color, alpha = 1) {
    return this.add.rectangle(x, y, size, size, color, alpha).setStrokeStyle(1, 0x000000, 0.18);
  }

  // A plain coloured texture, made once (the blocks look's platforms need a
  // texture for their physics image).
  blockTexture(key, w, h, color) {
    if (!this.textures.exists(key)) {
      const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = cv.getContext('2d');
      g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.strokeRect(0.5, 0.5, w - 1, h - 1);
      this.textures.addCanvas(key, cv);
    }
    return key;
  }

  // Foreground from the art set: one picture the height of the screen, with
  // leaves along the bottom and branches along the top. It's pinned to the
  // screen's edges, slides past faster than the level, sits in front of
  // everything but the HUD and buttons, and is blurred here so the art can
  // be painted sharp.
  buildForeground(worldW) {
    this.art.foreground.forEach((layer, i) => {
      const key = texKey(this.artName, layer.file);
      if (!this.textures.exists(key)) return;
      const src = this.textures.get(key).getSourceImage();
      // The second axis (`cover_top`, `cover_bottom`: screen y the plants
      // reach up to at the level's top and at its bottom). The whole band
      // is drawn just big enough that sliding it up never shows its bottom
      // edge (the user, 2026-10-25: "just scale the whole band up").
      const drop0 = layer.bottom_drop || 0;
      const f = layer.content_top ?? 0.75;
      const top0 = layer.cover_top ?? null;
      const rise = top0 === null ? 0 : top0 - (layer.cover_bottom ?? top0);
      const scale = top0 === null ? MAP_H / src.height
        : (MAP_H + rise + 8 - top0) / (src.height * (1 - f));
      const y0 = top0 === null ? 0 : top0 - drop0 - f * src.height * scale;
      // Blur is given in screen pixels; the picture may be painted larger.
      const tex = this.blurredTexture(key, (layer.blur ?? 6) / scale, !!layer.mirror_repeat);
      const w = src.width * scale;
      const sf = layer.scroll ?? 1.6;
      const span = (worldW - MAP_W) * sf + MAP_W + w;
      // bottom_drop (screen pixels) lowers the bottom half only, so the
      // leaves sit lower without moving the branches at the top.
      const drop = layer.bottom_drop || 0;
      const half = src.height / 2;
      const parts = [];
      for (let n = 0, x = 0; x < span; n++, x += w) {
        [[0, y0], [half, y0 + drop]].forEach(([cropY, dy]) => {
          const img = this.add.image(x, dy, tex).setOrigin(0, 0).setScale(scale)
            .setCrop(0, cropY, src.width, half)
            .setScrollFactor(sf, 0).setDepth(15 + i).setAlpha(layer.alpha ?? 1)
            .setFlipX(!!layer.mirror_repeat && n % 2 === 1);
          parts.push([img, dy]);
        });
      }
      // The lower the camera goes, the higher it sits.
      if (rise) {
        const cam = this.cameras.main;
        const slide = () => {
          const most = cam.getBounds().height - cam.height;
          const t = most > 0 ? Phaser.Math.Clamp(cam.scrollY / most, 0, 1) : 0;
          parts.forEach(([img, dy]) => img.setY(dy - rise * t));
        };
        this.events.on('postupdate', slide);
        this.events.once('shutdown', () => this.events.off('postupdate', slide));
      }
    });
  }

  // A blurred copy of a picture, made once per level load. Its neighbours
  // (flipped, for a mirrored layer) go either side first and its top and
  // bottom rows are stretched outward, so the blur doesn't fade the joins
  // or the screen edges.
  blurredTexture(key, px, mirror) {
    const out = `${key}:blur${Math.round(px)}`;
    if (px < 0.5) return key;
    if (this.textures.exists(out)) return out;
    const img = this.textures.get(key).getSourceImage();
    const w = img.width;
    const h = img.height;
    const pad = Math.ceil(px * 3);
    const canvas = (cw, ch) => Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    const wide = canvas(w * 3, h + pad * 2);
    const g = wide.getContext('2d');
    [0, 1, 2].forEach((n) => {
      g.save();
      if (mirror && n !== 1) {
        g.translate(n * w + w, 0);
        g.scale(-1, 1);
        g.drawImage(img, 0, pad);
      } else {
        g.drawImage(img, n * w, pad);
      }
      g.restore();
    });
    g.drawImage(wide, 0, pad, w * 3, 1, 0, 0, w * 3, pad);
    g.drawImage(wide, 0, pad + h - 1, w * 3, 1, 0, pad + h, w * 3, pad);
    const soft = canvas(wide.width, wide.height);
    const sg = soft.getContext('2d');
    if ('filter' in sg) {
      sg.filter = `blur(${px}px)`;
      sg.drawImage(wide, 0, 0);
    } else {
      // No canvas filters (older Safari): shrink and grow back instead.
      const f = Math.max(1, px / 2);
      const small = canvas(Math.ceil(wide.width / f), Math.ceil(wide.height / f));
      small.getContext('2d').drawImage(wide, 0, 0, small.width, small.height);
      sg.imageSmoothingQuality = 'high';
      sg.drawImage(small, 0, 0, soft.width, soft.height);
    }
    const final = canvas(w, h);
    final.getContext('2d').drawImage(soft, w, pad, w, h, 0, 0, w, h);
    this.textures.addCanvas(out, final);
    return out;
  }

  // Flat-vector jungle dressing, for art sets with a "dressing" entry:
  // trunks in a layer between the backdrop and the level, plants growing
  // from behind the ground's top edge, vines and ferns hanging under ledges
  // and platforms. Scenery only, all behind the player.
  buildDressing(rows, at, isSolid, worldW, worldH) {
    const d = this.art && this.art.dressing;
    if (!d || (this.artist && this.artist.dressing)) return;
    const k = (f) => texKey(this.artName, f);
    const has = (f) => !!f && this.textures.exists(k(f));
    if (has(d.trunk)) {
      // Spans what this layer shows while the camera crosses the level.
      const sf = d.trunk_scroll ?? 0.6;
      const spanW = (worldW - MAP_W) * sf + MAP_W;
      const spanH = (worldH - MAP_H) * sf + MAP_H;
      const every = (d.trunk_every || 6) * TILE;
      const tw = this.textures.get(k(d.trunk)).getSourceImage().width;
      for (let n = 0, x = every * 0.4; x < spanW; n++, x += every * (0.7 + tileHash(n, 3) * 0.6)) {
        const w = 70 + tileHash(n, 9) * 50;
        this.add.tileSprite(x, 0, tw, spanH, k(d.trunk)).setOrigin(0.5, 0)
          .setScale(w / tw, 1).setScrollFactor(sf).setDepth(-6);
      }
    }
    const plants = (d.ground_plants || []).filter(has);
    const hangers = (d.hangers || []).filter(has);
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * TILE + TILE / 2;
      const open = (rr) => rr >= 0 && rr < rows.length && at(rr, c) === '.';
      if (plants.length && isSolid(r, c) && open(r - 1) && this.grounded.has(`${c},${r}`)
          && tileHash(c + 211, r + 17) < (d.ground_chance || 0)) {
        const h = tileHash(c + 5, r + 211);
        const key = k(pick(plants, c + 3, r));
        const scale = 0.8 + h * 0.4;
        const w = this.textures.get(key).getSourceImage().width * scale;
        // The whole plant stands on this stretch of ground: slide it in
        // from a ledge's end, or leave it out if the stretch is too short.
        const surface = (cc) => isSolid(r, cc) && (r === 0 || at(r - 1, cc) === '.');
        let lo = c;
        let hi = c;
        while (lo > 0 && surface(lo - 1)) lo--;
        while (hi < row.length - 1 && surface(hi + 1)) hi++;
        const left = lo * TILE + w / 2;
        const right = (hi + 1) * TILE - w / 2;
        const px = Phaser.Math.Clamp(x + (h - 0.5) * 24, left, right);
        // Never over a sign, a door or the exit standing on this ground (the
        // user, 2026-10-25: a crystal behind a warning sign).
        let clear = true;
        for (let cc = Math.floor((px - w / 2) / TILE) - 1; cc <= Math.floor((px + w / 2) / TILE) + 1; cc++) {
          if ('<>^[]!SGD'.includes(at(r - 1, cc)) || '<>^[]!SGD'.includes(at(r - 2, cc))
            || (this.signCells && this.signCells.has(`${cc},${r - 1}`))) clear = false;
        }
        if (left <= right && clear) {
          this.add.image(px, r * TILE + 10, key)
            .setOrigin(0.5, 1).setScale(scale).setFlipX(h > 0.5).setDepth(-1);
        }
      }
      if (hangers.length && (isSolid(r, c) || ch === '=') && open(r + 1)
          && tileHash(c + 307, r + 41) < (d.hang_chance || 0)) {
        // The whole hanger stays under the ledge, never past its ends. Under
        // a platform it hangs in front, its mossy top on the grass's front
        // edge (they're brighter than his platforms, the user, 2026-10-25);
        // under ground it tucks up behind the dirt.
        const front = ch === '=';
        const top = front ? r * TILE + 20 : (r + 1) * TILE - 40;
        const key = k(pick(hangers, c + 7, r));
        const w = this.textures.get(key).getSourceImage().width;
        const under = (cc) => (isSolid(r, cc) || at(r, cc) === '=') && open(r + 1) && cc >= 0 && cc < row.length;
        let lo = c;
        let hi = c;
        while (under(lo - 1)) lo--;
        while (under(hi + 1)) hi++;
        const left = lo * TILE + w / 2 + 6;
        const right = (hi + 1) * TILE - w / 2 - 6;
        if (left <= right) {
          const px = Phaser.Math.Clamp(x + (tileHash(c, r + 9) - 0.5) * 20, left, right);
          this.add.image(px, top, key).setOrigin(0.5, 0).setDepth(front ? 0.6 : -1);
        }
      }
    }));
  }

  // A fern patch now and then along a platform's top. Decoration only.
  decoratePlatform(x, r, c) {
    const decor = this.art && this.art.platform_decor;
    if (this.artist && this.artist.dressing) return;
    if (!decor || !decor.length || tileHash(c + 31, r + 5) >= (this.art.platform_decor_chance || 0)) return;
    const key = texKey(this.artName, pick(decor, c, r));
    // Its top edge sits level with the plank's top, so the moss drapes
    // over the front of the plank.
    if (this.textures.exists(key)) this.add.image(x, r * TILE + 1, key).setOrigin(0.5, 0).setDepth(1);
  }

  // A background built as a column: canopy on top, a trunk slice repeated
  // as many times as the level is tall, ferns at the bottom. The ferns stand
  // on the level's floor line; the column's own ground strip stays below it.
  buildBackdropColumn(layer, i, worldW, worldH) {
    const col = layer.column;
    const k = (name) => texKey(this.artName, col[name]);
    if (!['top', 'mid', 'bottom'].every((n) => this.textures.exists(k(n)))) return;
    const size = (n) => this.textures.get(k(n)).getSourceImage();
    const w = size('bottom').width;
    const sf = layer.scroll ?? 0.35;
    const span = (worldW - MAP_W) * sf + MAP_W + w;
    // Stack upward from the floor until the canopy reaches the top.
    const bottomY = worldH - (col.ground_line || 0);
    const pieces = [['bottom', bottomY]];
    let y = bottomY;
    while (y - size('top').height > 0) {
      y -= size('mid').height;
      pieces.push(['mid', y]);
    }
    pieces.push(['top', y - size('top').height]);
    for (let n = 0, x = 0; x < span; n++, x += w) {
      pieces.forEach(([name, py]) => {
        this.add.image(x, py, k(name)).setOrigin(0, 0).setScrollFactor(sf, 1).setDepth(-10 + i)
          .setFlipX(!!layer.mirror_repeat && n % 2 === 1);
      });
    }
  }

  // ---------- hidden doors ----------

  // Two cells with the same digit are a pair. Nothing marks them; standing
  // in one shows a little hint, and Up takes you to the other.
  buildDoors(doorCells) {
    this.doors = {};
    Object.values(doorCells).forEach((cells) => {
      if (cells.length !== 2) return;
      const [a, b] = cells;
      this.doors[`${a.c},${a.r}`] = b;
      this.doors[`${b.c},${b.r}`] = a;
    });
    this.doorHint = this.add.text(0, 0, '\u2191', heading(34, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 8,
    })).setOrigin(0.5).setDepth(8).setVisible(false);
    this.tweens.add({ targets: this.doorHint, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
    this.grabHint = this.add.text(0, 0, '\u2193', heading(34, COLORS.yellowCss, {
      stroke: COLORS.inkCss, strokeThickness: 8,
    })).setOrigin(0.5).setDepth(8).setVisible(false);
    this.tweens.add({ targets: this.grabHint, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
  }

  doorUnder(p) {
    const c = Math.floor(p.x / TILE);
    const r = Math.floor((p.y + 10) / TILE);
    return this.doors[`${c},${r}`] || null;
  }

  goThroughDoor(to) {
    this.inDoor = true;
    const p = this.player;
    p.setVelocity(0, 0);
    p.setAcceleration(0, 0);
    p.body.enable = false;
    this.doorHint.setVisible(false);
    this.btnDoor.setVisible(false);
    this.tweens.add({
      targets: p, alpha: 0, scaleX: 0.6, duration: DOOR_FADE_MS,
      onComplete: () => {
        this.cameras.main.fadeOut(DOOR_FADE_MS, 43, 29, 18);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          p.setPosition(to.c * TILE + TILE / 2, (to.r + 1) * TILE - 32);
          this.safe = { x: p.x, y: p.y - 4 };
          this.cameras.main.fadeIn(DOOR_FADE_MS, 43, 29, 18);
          this.tweens.add({
            targets: p, alpha: 1, scaleX: 1, duration: DOOR_FADE_MS,
            onComplete: () => { p.body.enable = true; this.inDoor = false; },
          });
        });
      },
    });
  }

  // Solid tiles become as few, as large, invisible boxes as possible.
  // One box per tile leaves seams that snag the player when sliding up a
  // wall (riding the waterfall) or along a floor.
  buildSolidBoxes(rows) {
    const runsFor = (row) => {
      const runs = [];
      let startCol = -1;
      for (let c = 0; c <= row.length; c++) {
        const solid = c < row.length && !!SOLID_TEXTURES[row[c]];
        if (solid && startCol < 0) startCol = c;
        if (!solid && startCol >= 0) {
          runs.push(`${startCol}-${c - 1}`);
          startCol = -1;
        }
      }
      return runs;
    };
    let open = {}; // run key -> first row
    const addBox = (key, r0, r1) => {
      const [a, b] = key.split('-').map(Number);
      const w = (b - a + 1) * TILE;
      const h = (r1 - r0 + 1) * TILE;
      const zone = this.add.zone(a * TILE + w / 2, r0 * TILE + h / 2, w, h);
      this.physics.add.existing(zone, true);
      this.solids.add(zone);
    };
    rows.forEach((row, r) => {
      const runs = runsFor(row);
      const next = {};
      runs.forEach((k) => { next[k] = k in open ? open[k] : r; });
      Object.keys(open).forEach((k) => { if (!(k in next)) addBox(k, open[k], r - 1); });
      open = next;
    });
    Object.keys(open).forEach((k) => addBox(k, open[k], rows.length - 1));
  }

  buildBackdrop(worldW, worldH) {
    for (let x = -100; x < worldW; x += 420) {
      this.add.image(x, worldH - 60, 'bg-hill').setOrigin(0, 1).setScrollFactor(0.35, 1)
        .setScale(1 + ((x / 420) % 3) * 0.25);
    }
    for (let x = 80; x < worldW; x += 560) {
      this.add.image(x, 90 + ((x / 560) % 3) * 50, 'bg-cloud').setScrollFactor(0.15, 1);
    }
  }

  spawnTreasure(x, y, index) {
    const item = LEVELS[this.levelId].items[index];
    if (!item || (!this.test && state.hasTreasure(this.levelId, item.id))) return;
    // Mystery crates sit on the tile's floor.
    const t = this.treasures.create(x, y + TILE / 2 - 30, 'crate');
    t.itemIndex = index;
  }

  touchTreasure(t) {
    if (t.taken) return;
    t.taken = true;
    t.body.enable = false;
    this.player.setVelocity(0, Math.min(this.player.body.velocity.y, 0));
    startQuiz(this, this.levelId, t.itemIndex, (correct) => {
      this.tweens.killTweensOf(t);
      if (correct) {
        this.tweens.add({
          targets: t, y: t.y - 80, scale: 1.4, alpha: 0, duration: 450, ease: 'Cubic.Out',
          onComplete: () => t.destroy(),
        });
      } else {
        this.tweens.add({
          targets: t, alpha: 0, angle: 90, scale: 0.3, duration: 400,
          onComplete: () => t.destroy(),
        });
      }
      this.refreshHud();
    });
  }

  // Reaching the secret door: it swings open on its left hinge to show a
  // dark doorway, the explorer steps in and fades, then the level ends.
  openSecretDoor() {
    if (this.done) return;
    this.done = true;                 // no more input while it opens
    const p = this.player;
    const foot = p.body.bottom - p.y;
    p.body.enable = false;
    p.anims.stop();
    const d = this.secret;
    if (d.dressed) {
      // The dressed door: the green spark opens out into rings, then she
      // steps into the doorway and is gone.
      const db = d.dressed;
      const feet = d.y + db.frameHeight / 2;
      this.tweens.add({ targets: p, y: feet - foot, x: d.x, duration: 260, ease: 'Quad.Out' });
      audio.sfx(this, 'door');
      d.setDepth(3);                  // she goes in behind the arch and its plants
      let k = 0;
      this.time.addEvent({
        delay: 70, repeat: db.frames - 1,
        callback: () => {
          d.setFrame(k);
          k += 1;
          if (k === Math.floor(db.frames * 0.6)) {
            this.tweens.add({
              targets: p, alpha: 0, scale: 0.85, duration: 380, ease: 'Sine.In',
              onComplete: () => { this.done = false; this.exit('secret'); },
            });
          }
        },
      });
      return;
    }
    const w = d.displayWidth;
    const h = d.displayHeight;
    // Touched it mid-jump (coming up over the falls, say): land at its foot.
    this.tweens.add({ targets: p, y: d.y + h / 2 - foot, duration: 200, ease: 'Quad.In' });
    audio.sfx(this, 'door');
    this.add.rectangle(d.x, d.y + 2, w * 0.82, h * 0.9, 0x1b120b).setDepth(3);
    d.setDepth(4).setOrigin(0, 0.5).setX(d.x - w / 2);
    p.setDepth(5);
    this.tweens.add({
      targets: d, scaleX: 0.12, duration: 420, ease: 'Cubic.Out',
      onComplete: () => {
        p.setDepth(3.5);              // in the doorway, behind the open door
        this.tweens.add({
          targets: p, x: d.x + w / 2, alpha: 0, scale: 0.85, duration: 380, ease: 'Sine.In',
          onComplete: () => { this.done = false; this.exit('secret'); },
        });
      },
    });
  }

  // Reaching an exit: a big message, then a tap (or Enter or Space) moves on.
  // The goal goes back to the map; the secret door goes to the bonus round.
  // A test run plays its level again instead of touching the map.
  exit(kind) {
    if (this.done) return;
    this.done = true;
    this.player.body.enable = false;
    const secret = kind === 'secret';
    if (!secret) audio.sfx(this, 'level-end');
    const shade = this.add.rectangle(0, 0, MAP_W, MAP_H, COLORS.ink, 0.35).setOrigin(0)
      .setScrollFactor(0).setDepth(50).setAlpha(0);
    const msg = this.add.text(MAP_W / 2, MAP_H / 2 - 30, secret ? 'You found a bonus level door!' : 'Level completed!',
      heading(64, COLORS.yellowCss, { stroke: COLORS.inkCss, strokeThickness: 12 }))
      .setOrigin(0.5).setScrollFactor(0).setDepth(51).setScale(0.6).setAlpha(0);
    const tap = this.add.text(MAP_W / 2, MAP_H / 2 + 50, 'Tap to continue', text(24, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({ targets: msg, scale: 1, alpha: 1, duration: 320, ease: 'Back.Out' });
    this.tweens.add({ targets: tap, alpha: 1, duration: 300, delay: 600 });
    this.tweens.add({ targets: tap, alpha: 0.4, duration: 700, delay: 900, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.player, y: this.player.y - 30, duration: 250, yoyo: true, repeat: 2 });

    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      const levelData = this.test ? this.scene.settings.data : null;
      const run = this.runResults();
      // The bonus level door goes to the bonus level, which ends on the level
      // ending screen; the goal goes straight to it (scenes/LevelEnd.js).
      if (!secret && !this.test) state.completeLevel(this.levelId, kind);
      this.cameras.main.fadeOut(300, 43, 29, 18);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (secret) this.scene.start('Bonus', { levelId: this.levelId, levelData, run });
        else this.scene.start('LevelEnd', { levelId: this.levelId, kind: 'normal', run, levelData });
      });
    };
    // A short wait first, so a held jump doesn't skip the message.
    this.time.delayedCall(600, () => {
      shade.setInteractive({ useHandCursor: true });
      shade.on('pointerup', go);
      ['ENTER', 'SPACE'].forEach((k) => this.input.keyboard.once(`keydown-${k}`, go));
    });
  }

  leave() {
    if (this.done) return;
    if (this.test) { this.scene.restart(); return; }
    this.done = true;
    leaveLevel(this, this.levelId);
  }

  // Water droplets where the player hits the surface. A big drop is a cannonball.
  splash(x, surfaceY, speed) {
    if (speed < 150 || Number.isNaN(surfaceY)) return;
    const big = speed > 650;
    audio.sfx(this, 'splash', { volume: big ? 0.7 : 0.45 });
    const n = big ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const drop = this.add.circle(x, surfaceY, Phaser.Math.Between(4, big ? 10 : 6), 0xffffff).setDepth(6);
      const angle = Phaser.Math.FloatBetween(-2.6, -0.5);
      const dist = Phaser.Math.Between(40, big ? 150 : 70);
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * dist,
        y: surfaceY + Math.sin(angle) * dist,
        alpha: 0,
        duration: Phaser.Math.Between(350, 650),
        ease: 'Cubic.Out',
        onComplete: () => drop.destroy(),
      });
    }
    if (big) {
      const t = this.add.text(x, surfaceY - 70, 'Cannonball!', heading(34, COLORS.yellowCss, {
        stroke: COLORS.inkCss, strokeThickness: 8,
      })).setOrigin(0.5).setDepth(7).setScale(0.5);
      this.tweens.add({ targets: t, scale: 1, y: t.y - 30, duration: 300, ease: 'Back.Out' });
      this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
      this.cameras.main.shake(160, 0.006);
    }
  }

  // ---------- HUD ----------

  buildHud(lvl) {
    // Energy: the Z-bolt bar. Spent bolts are the grey copy laid on top.
    const bar = this.cache.json.get('zbar');
    if (this.band.energyBar) {
      const full = this.add.image(12, 8, 'zbar-full').setOrigin(0).setScrollFactor(0).setDepth(20);
      const bolts = bar.bolts.slice(0, this.maxEnergy);
      // Fewer bolts than the picture has (Pioneer): cut the bar after the last one.
      // The bar's rounded end is moved up to close it after the last bolt.
      if (bolts.length < bar.bolts.length) {
        const last = bolts[bolts.length - 1];
        const cut = Math.round((last.x + last.w + bar.bolts[bolts.length].x) / 2);
        const capFrom = bar.bolts[bar.bolts.length - 1].x + bar.bolts[bar.bolts.length - 1].w - 4;
        full.setCrop(0, 0, cut, bar.height);
        this.add.image(12 - (capFrom - cut), 8, 'zbar-full').setOrigin(0).setScrollFactor(0).setDepth(20)
          .setCrop(capFrom, 0, bar.width - capFrom, bar.height);
      }
      this.spentBolts = bolts.map((b) => this.add.image(12, 8, 'zbar-spent').setOrigin(0)
        .setCrop(b.x - 2, 0, b.w + 4, bar.height).setScrollFactor(0).setDepth(21).setVisible(false));
      // The bar's printed portrait is the first explorer's face; every
      // character covers it with her own head and shoulders, from her
      // first idle frame.
      {
        const cx = 12 + 45;
        const cy = 8 + 42;
        const key = `${this.cid}-portrait`;
        if (!this.textures.exists(key)) {
          const D = 62;
          const tex = this.textures.createCanvas(key, D, D);
          const ctx = tex.getContext();
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#e8cf98';
          ctx.beginPath();
          ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.clip();
          // Head and shoulders: the top of the first idle frame, doubled.
          ctx.drawImage(this.textures.get(`${this.cid}-idle`).getSourceImage(), 14, 2, 43, 43, -12, -2, 86, 86);
          tex.refresh();
        }
        this.add.image(cx, cy, key).setScrollFactor(0).setDepth(21);
      }
    }

    // Level name and the five crates.
    const g = this.add.graphics().setScrollFactor(0).setDepth(20);
    const pw = 440;
    const px = MAP_W / 2 - pw / 2;
    g.fillStyle(COLORS.ink, 0.9);
    g.fillRoundedRect(px, 22, pw, 52, 14);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(px, 18, pw, 52, 14);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRoundedRect(px, 18, pw, 52, 14);
    this.add.text(px + 16, 44, lvl.name, heading(20)).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    this.hudPips = this.add.graphics().setScrollFactor(0).setDepth(21);

    // Wild Zebonkies tamed so far (the tamed star needs all of them).
    this.tamedText = this.add.text(MAP_W / 2, 92, '', heading(18, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 6,
    })).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    // Currency (a placeholder name), left of the food.
    this.add.image(MAP_W - 300, 44, currencyIcon(this)).setScrollFactor(0).setDepth(21);
    this.currencyText = this.add.text(MAP_W - 278, 44, '', heading(26, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 7,
    })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    // The letters of ZEBONKY in this level, found ones lit (only in a level
    // that has them).
    this.letterHud = [];
    if (this.letterSpots && this.letterSpots.length) {
      LETTERS.split('').forEach((ch, i) => {
        this.letterHud.push(this.add.text(MAP_W / 2 + (i - 3) * 28, 122, ch, heading(22, COLORS.yellowCss, {
          stroke: COLORS.inkCss, strokeThickness: 6,
        })).setOrigin(0.5).setScrollFactor(0).setDepth(21));
      });
    }

    // Food carried.
    this.add.image(MAP_W - 190, 44, this.foodTex).setScrollFactor(0).setDepth(21);
    this.foodText = this.add.text(MAP_W - 162, 44, 'x0', heading(26, COLORS.parchmentCss, {
      stroke: COLORS.inkCss, strokeThickness: 7,
    })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    this.refreshHud();

    const map = this.add.text(MAP_W - 24, 26, 'Map', text(20, COLORS.inkCss, {
      backgroundColor: COLORS.parchmentCss, padding: { x: 16, y: 8 },
    })).setOrigin(1, 0).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    map.on('pointerup', () => this.leave());
    musicButton(this, MAP_W - 108, 104);
    soundButton(this, MAP_W - 50, 104);
    audio.music(this);
    audio.preloadSfx(this);
  }

  // A wild Zebonky ate: count it, and the tamed star once all have.
  onZebonkyFed() {
    this.refreshHud();
    if (!this.wild.length || !this.wild.every((z) => z.fed)) return;
    if (this.test || state.hasTamedAll(this.levelId)) return;
    state.markTamed(this.levelId);
    this.floatText(this.player.x, this.player.y - 110, 'Every Zebonky tamed! ★', 28);
  }

  refreshHud() {
    if (this.spentBolts) this.spentBolts.forEach((img, i) => img.setVisible(i >= this.energy));
    if (this.foodText) this.foodText.setText(`x${this.food}`);
    if (this.currencyText) this.currencyText.setText(`x${currency()}`);
    if (this.letterHud && this.letterHud.length) {
      const found = lettersFound(this.levelId);
      this.letterHud.forEach((t, i) => t.setAlpha(found.includes(LETTERS[i]) ? 1 : 0.3));
    }
    if (this.tamedText && this.wild) {
      const fed = this.wild.filter((z) => z.fed).length;
      const done = this.wild.length && (fed === this.wild.length || state.hasTamedAll(this.levelId));
      this.tamedText.setText(this.wild.length ? `Zebonkies tamed ${fed}/${this.wild.length}${done ? '  ★' : ''}` : '');
    }
    const g = this.hudPips;
    g.clear();
    const items = LEVELS[this.levelId].items;
    items.forEach((it, i) => {
      const x = MAP_W / 2 + 208 - (items.length - i) * 26;
      const y = 44;
      const have = state.hasTreasure(this.levelId, it.id);
      g.fillStyle(COLORS.ink, 1);
      g.fillRoundedRect(x - 11, y - 11, 22, 22, 6);
      g.fillStyle(have ? 0xffc93c : 0xd8c49a, 1);
      g.fillRoundedRect(x - 8, y - 8, 16, 16, 4);
    });
  }

  // On-screen buttons for phones and tablets; they also work with a mouse.
  buildTouchControls() {
    const y = MAP_H - 80;
    const hold = (img, key) => {
      img.setScrollFactor(0).setAlpha(0.75).setInteractive();
      img.on('pointerdown', () => { this.touch[key] = true; img.setAlpha(1); if (key === 'jump') this.jumpPressedAt = this.time.now; });
      const up = () => { this.touch[key] = false; img.setAlpha(0.75); };
      img.on('pointerup', up);
      img.on('pointerout', up);
    };
    hold(this.add.image(80, y, 'btn-left'), 'left');
    hold(this.add.image(190, y, 'btn-right'), 'right');
    hold(this.add.image(MAP_W - 90, y - 8, 'btn-jump'), 'jump');
    // Toss food.
    const toss = this.add.circle(MAP_W - 210, y, 44, COLORS.parchment).setStrokeStyle(4, COLORS.ink)
      .setScrollFactor(0).setAlpha(0.8).setInteractive();
    this.add.image(MAP_W - 210, y, this.foodTex).setScale(1.2).setScrollFactor(0);
    toss.on('pointerdown', () => { this.touchToss = true; toss.setAlpha(1); });
    toss.on('pointerup', () => toss.setAlpha(0.8));
    toss.on('pointerout', () => toss.setAlpha(0.8));
    // Each button's keys under it, so the keyboard is learnt from the
    // screen (the user, 2026-10-25).
    const keyLabel = (x, label) => this.add.text(x, y + 50, label, text(16, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.7)', padding: { x: 6, y: 2 },
    })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
    keyLabel(80, '← or A');
    keyLabel(190, '→ or D');
    keyLabel(MAP_W - 210, 'X · K · F');
    keyLabel(MAP_W - 90, 'Z · J · Space');
    // Shown only while standing in a hidden door.
    this.btnDoor = this.add.image(MAP_W - 90, y - 120, 'btn-jump').setScale(0.8).setTint(0xffc93c)
      .setScrollFactor(0).setAlpha(0.85).setVisible(false).setInteractive();
    this.btnDoor.on('pointerdown', () => { this.touchDoor = true; });
    // Shown only while standing at a crate or pickup: the Down action.
    this.btnGrab = this.add.image(MAP_W - 210, y - 120, 'btn-jump').setScale(0.8).setFlipY(true).setTint(0xffc93c)
      .setScrollFactor(0).setAlpha(0.85).setVisible(false).setInteractive();
    this.btnGrab.on('pointerdown', () => { this.touchGrab = true; });
    this.input.addPointer(2);
  }

  // At a vine's top: onto the edge of the platform beside it (the side
  // the vine hangs against first), feet on its top. False if there is none.
  climbOntoEdge(lo, hi, r) {
    const p = this.player;
    const empty = (rr, cc) => !this.isFloor(rr, cc) && !this.vines.has(`${cc},${rr}`);
    const floor = (rr, cc) => this.isFloor(rr, cc);
    const sides = [hi + 1, lo - 1].sort((a, b) => (floor(r, b) || floor(r + 1, b)) - (floor(r, a) || floor(r + 1, a)));
    for (const cc of sides) {
      for (let rr = r - 2; rr <= r + 1; rr++) {
        if (empty(rr, cc) && empty(rr - 1, cc) && floor(rr + 1, cc)) {
          const x = cc * TILE + TILE / 2 + (cc > hi ? -12 : 12);
          // Feet just above the floor's top (the body's bottom is this far
          // below her middle), so she lands on it rather than in it.
          const feet = p.body.offset.y + p.body.height - p.displayHeight * p.originY;
          p.body.reset(x, (rr + 1) * TILE - feet - 2);
          p.setVelocity(0, 0);
          p.setFlipX(cc < lo);
          return true;
        }
      }
    }
    return false;
  }

  // ---------- inspect mode ----------

  // Inspection mode: the level as normal (crates, Zebonkies, food, HUD), but
  // no explorer: a pink and white marker flies anywhere instead (Up and Down
  // too, no gravity, through walls) and the camera follows it. Drag the
  // scene or use the arrows or WASD; Shift is faster. The panel shows the
  // marker's tile column and row, for notes. Esc or Map goes back to the map.
  startInspect(lvl) {
    this.player.setVisible(false);
    this.player.body.enable = false;
    const m = this.add.container(this.start.x, this.start.y - 40).setDepth(30);
    m.add(this.add.circle(0, 0, 20, 0xff3b6b, 0.85).setStrokeStyle(4, 0xffffff));
    m.add(this.add.circle(0, 0, 3, 0xffffff));
    this.marker = m;
    this.cameras.main.stopFollow();
    this.cameras.main.startFollow(m, true, 0.18, 0.18);
    this.cameras.main.setDeadzone(0, 0);
    this.inspectKeys = this.input.keyboard.addKeys('SHIFT');
    const panel = this.add.text(14, 112, '', text(16, '#ffffff', {
      backgroundColor: 'rgba(43,29,18,0.8)', padding: { x: 10, y: 6 }, lineSpacing: 2,
    })).setScrollFactor(0).setDepth(40);
    this.inspectPanel = () => {
      const c = Math.floor(m.x / TILE);
      const r = Math.floor(m.y / TILE);
      panel.setText(`Inspection: column ${c}, row ${r}
Drag, or arrows / WASD (Shift is faster)`);
    };
    this.inspectPanel();
    // Dragging moves the scene under the finger (or mouse).
    this.input.on('pointermove', (pt) => {
      if (!pt.isDown) return;
      const zoom = this.cameras.main.zoom;
      m.x = Phaser.Math.Clamp(m.x - (pt.x - pt.prevPosition.x) / zoom, 0, this.physics.world.bounds.width);
      m.y = Phaser.Math.Clamp(m.y - (pt.y - pt.prevPosition.y) / zoom, 0, this.worldH);
      this.inspectPanel();
    });
  }

  inspectUpdate(delta) {
    const k = this.keys;
    const speed = (this.inspectKeys.SHIFT.isDown ? 1800 : 600) * (delta / 1000);
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const m = this.marker;
    m.x = Phaser.Math.Clamp(m.x + dx * speed, 0, this.physics.world.bounds.width);
    m.y = Phaser.Math.Clamp(m.y + dy * speed, 0, this.worldH);
    if (dx || dy) this.inspectPanel();
  }

  // ---------- movement ----------

  update(time, delta) {
    if (this.showcase) {
      if (this.showcaseZebonky) this.showcaseZebonky.update(time);
      return;
    }
    if (this.explorerTour) {
      if (this.explorerTourActor) this.explorerTourActor.update(time);
      return;
    }
    if (this.inspect) {
      this.inspectUpdate(delta);
      // Everything else runs as normal around the marker.
      const p = this.player;
      p.body.reset(this.marker.x, this.marker.y);
      this.wild.forEach((z) => z.update(time, p));
      if (this.guide) this.guide.update(time, p);
      return;
    }
    if (this.done || this.inDoor || !this.player.body.enable) return;
    const p = this.player;
    const k = this.keys;
    const onFloor = p.body.blocked.down || p.body.touching.down;

    // Zebonkies and food.
    this.wild.forEach((z) => z.update(time, p));
    if (this.companion) this.companion.update();
    if (this.guide) this.guide.update(time, p);
    this.tossed.getChildren().forEach((f) => {
      if (!f.landed && f.body.blocked.down) {
        f.landed = true;
        f.setAngularVelocity(0).setAngle(0);
      }
      if (f.y > this.worldH + 200) f.destroy();
    });
    if ([k.X, k.K, k.F].some((key) => Phaser.Input.Keyboard.JustDown(key)) || this.touchToss) this.tossFood();
    this.touchToss = false;

    // Hidden door underfoot, or standing at the bonus level door: Up (or the
    // door button) goes through instead of jumping.
    const door = onFloor ? this.doorUnder(p) : null;
    const atSecret = this.atSecret;
    this.atSecret = false;
    this.doorHint.setVisible(!!door || atSecret);
    this.btnDoor.setVisible(!!door || atSecret);
    if (door || atSecret) {
      this.doorHint.setPosition(p.x, p.y - 62);
      const up = Phaser.Input.Keyboard.JustDown(k.UP) || Phaser.Input.Keyboard.JustDown(k.W) || this.touchDoor;
      this.touchDoor = false;
      if (up && atSecret) { this.openSecretDoor(); return; }
      if (up) { this.goThroughDoor(door); return; }
    }
    this.touchDoor = false;

    // At a crate: Down (or the touch button) opens it. Next to food she
    // threw that has landed: Down crouches and picks it back up.
    const item = this.nearItem && this.nearItem.active && !this.nearItem.taken ? this.nearItem : null;
    this.nearItem = null;
    const landedFood = !item && onFloor ? this.droppedFoodAt(p) : null;
    this.grabHint.setVisible(!!(item || landedFood));
    this.btnGrab.setVisible(!!(item || landedFood));
    if (item || landedFood) {
      this.grabHint.setPosition(p.x, p.y - 62);
      const grab = Phaser.Input.Keyboard.JustDown(k.DOWN) || Phaser.Input.Keyboard.JustDown(k.S) || this.touchGrab;
      if (grab) {
        this.touchGrab = false;
        if (landedFood) this.pickUpFood(landedFood, time);
        else if (item.itemIndex !== undefined) this.touchTreasure(item);
        else this.collect(item);
        return;
      }
    }
    this.touchGrab = false;

    // Flying off a Zebonky's back keeps its speed until landing.
    p.setDragX(time < this.flingUntil && !onFloor ? 0 : SLIDE_DRAG);

    const left = k.LEFT.isDown || k.A.isDown || this.touch.left;
    const right = k.RIGHT.isDown || k.D.isDown || this.touch.right;
    const down = k.DOWN.isDown || k.S.isDown;
    const up = k.UP.isDown || k.W.isDown;
    // Jump is Z, J or Space (or the touch button). Up is for hidden doors.
    const jumpHeld = k.SPACE.isDown || k.Z.isDown || k.J.isDown || this.touch.jump;
    const jumpPressed = [k.SPACE, k.Z, k.J].some((key) => Phaser.Input.Keyboard.JustDown(key));

    const vx = p.body.velocity.x;
    if (left && !right) {
      p.setAccelerationX(vx > 20 ? -TURN_ACCEL : -ACCEL);
      p.setFlipX(true);
    } else if (right && !left) {
      p.setAccelerationX(vx < -20 ? TURN_ACCEL : ACCEL);
      p.setFlipX(false);
    } else {
      p.setAccelerationX(0);
    }

    if (jumpPressed) this.jumpPressedAt = time;
    const wantsJump = time - this.jumpPressedAt <= JUMP_BUFFER_MS;

    // Down + Jump on a platform drops through it instead of jumping.
    const onPlatform = onFloor && this.cellAt(Math.floor((p.body.bottom + 2) / TILE), Math.floor(p.x / TILE)) === '=';
    let dropped = false;
    if (down && wantsJump && onPlatform) {
      this.dropUntil = time + 260;
      p.setVelocityY(150);
      this.jumpPressedAt = -1000;
      this.lastGrounded = -1000;
      dropped = true;
    }

    const c = Math.floor(p.x / TILE);
    const r = Math.floor(p.y / TILE);
    const inCurrent = this.current.has(`${c},${r}`);
    const inWater = !inCurrent && this.water.has(`${c},${r}`);
    // Vines: she holds on (the user, 2026-10-25). Up or Down on a vine
    // grabs it; then she stays on it, Up and Down climb, Jump leaps off
    // (sideways with Left or Right). Climbing past the top puts her on the
    // edge of the platform beside it; past the bottom, she lets go. Touch
    // has no Up: holding Jump grabs and climbs, Left or Right steps off.
    const touchClimb = this.touch.jump;
    const vineAt = (cc, rr) => !inCurrent && !inWater && this.vines.has(`${cc},${rr}`);
    if (!this.climbing && vineAt(c, r) && time > (this.climbFreeAt || 0) && (up || down || touchClimb)) {
      this.climbing = true;
      this.jumpPressedAt = -1000;
    }
    if (this.climbing && !vineAt(c, r)) this.climbing = false;
    const onVine = !!this.climbing;

    if (onVine) {
      p.body.setGravityY(-this.physics.world.gravity.y);
      p.setMaxVelocity(RUN_SPEED, 1400);
      p.setAccelerationX(0);
      p.setVelocityX(0);
      // Hold on at the vine's strand, clear of any wall beside it.
      let lo = c;
      let hi = c;
      while (this.vines.has(`${lo - 1},${r}`)) lo--;
      while (this.vines.has(`${hi + 1},${r}`)) hi++;
      // The strand hangs against the wall or platform beside the vine
      // (found as the vine's art finds it: this row, then down, then up).
      const hw = p.body.width / 2 + 1;
      let side = 0;
      for (const dir of [1, -1]) {
        for (let rr = r; !side && this.vines.has(`${c},${rr}`); rr += dir) {
          if (this.isFloor(rr, hi + 1)) side = 1;
          else if (this.isFloor(rr, lo - 1)) side = -1;
        }
      }
      const strandX = side > 0 ? (hi + 1) * TILE : side < 0 ? lo * TILE : ((lo + hi + 1) / 2) * TILE;
      p.x = Phaser.Math.Clamp(strandX, lo * TILE + hw, (hi + 1) * TILE - hw);
      if (this.rig && side) {
        // A rig explorer faces the vine, hung off the wall with the vine
        // between her knees and hands (where it runs in her climb frames).
        const ex = this.cache.json.get(this.cid);
        p.setFlipX(side < 0);
        p.x = Phaser.Math.Clamp(strandX - side * ((ex.vineX || 46) + 10 - ex.frameWidth / 2), lo * TILE + 2, (hi + 1) * TILE - 2);
      }
      const climbUp = up || touchClimb;
      const atTop = !this.vines.has(`${c},${r - 1}`);
      const atBottom = !this.vines.has(`${c},${r + 1}`);
      const leap = jumpPressed && !touchClimb;
      const stepOff = touchClimb && (left || right);
      if (leap || stepOff) {
        this.climbing = false;
        this.climbFreeAt = time + 350;
        p.setVelocityY(leap ? -JUMP_SPEED * 0.85 : 0);
        p.setVelocityX(right ? RUN_SPEED : left ? -RUN_SPEED : 0);
        if (leap) audio.sfx(this, 'jump');
        this.jumpPressedAt = -1000;
      } else if (climbUp && atTop && p.body.top <= r * TILE + 4 && this.climbOntoEdge(lo, hi, r)) {
        this.climbing = false;
        this.climbFreeAt = time + 350;
      } else if (down && atBottom && p.body.bottom >= (r + 1) * TILE - 2) {
        this.climbing = false;
        this.climbFreeAt = time + 350;
      } else {
        let vy = 0;
        if (climbUp) vy = atTop && p.body.top <= r * TILE + 4 ? 0 : -CLIMB_SPEED;
        else if (down) vy = CLIMB_SPEED;
        p.setVelocityY(Phaser.Math.Linear(p.body.velocity.y, vy, 0.3));
      }
      this.jumpPressedAt = -1000;
      this.wasInWater = false;
    } else if (inCurrent) {
      // Riding the uphill waterfall.
      p.body.setGravityY(0);
      p.setVelocityY(Phaser.Math.Linear(p.body.velocity.y, -CURRENT_LIFT, 0.2));
      p.setMaxVelocity(RUN_SPEED, 1400);
      this.boostUntil = time + 450;
      this.wasInWater = false;
      // At the top of the falls, Jump hops her off, up onto a ledge beside it.
      if (wantsJump && !this.current.has(`${c},${r - 1}`)) {
        p.setVelocityY(-JUMP_SPEED);
        audio.sfx(this, 'jump');
        this.jumpPressedAt = -1000;
      }
    } else if (inWater) {
      // Water holds you up: you rise to the surface on your own and float
      // there, head and shoulders out, bobbing a little. Down dives.
      p.body.setGravityY(-this.physics.world.gravity.y);
      p.setMaxVelocity(SWIM_SPEED, 1400);
      const surfaceY = this.surfaceRow[c] !== undefined ? this.surfaceRow[c] * TILE : null;
      if (!this.wasInWater) this.splash(p.x, surfaceY ?? p.y, p.body.velocity.y);
      const vy = p.body.velocity.y;
      if (down) {
        p.setVelocityY(Phaser.Math.Linear(vy, SWIM_DIVE, 0.12));
      } else if (surfaceY !== null) {
        // A rig explorer sits in up to her chin: treading water (not swimming
        // along) a little lower, swimming a touch higher (as in the tour).
        const tread = !this.rig ? 0 : Math.abs(p.body.velocity.x) <= 40 ? 8 : -4;
        const floatY = surfaceY + 6 + tread + Math.sin(time / 320) * 3;
        const below = p.y - floatY;
        if (below > 6) p.setVelocityY(Phaser.Math.Linear(vy, -FLOAT_RISE, 0.08));
        else p.setVelocityY(Phaser.Math.Linear(vy, below * -4, 0.25));
      } else {
        p.setVelocityY(Phaser.Math.Linear(vy, -FLOAT_RISE, 0.08));
      }
      if (wantsJump) {
        const nearSurface = this.surfaceRow[c] !== undefined && p.y - this.surfaceRow[c] * TILE < 44;
        p.setVelocityY(nearSurface ? -SWIM_HOP_OUT : -SWIM_STROKE);
        this.strokeUntil = time + 500;
        if (nearSurface) this.boostUntil = time + 400;
        this.jumpPressedAt = -1000;
      }
      // Paddling sounds for as long as she swims: moving, diving or stroking.
      audio.loop(this, 'swim', Math.abs(p.body.velocity.x) > 40 || down || time < (this.strokeUntil || 0));
      this.wasInWater = true;
    } else {
      p.body.setGravityY(0);
      p.setMaxVelocity(RUN_SPEED, 1400);
      this.wasInWater = false;
    }
    if (!inWater) audio.loop(this, 'swim', false);

    if (onFloor) {
      this.lastGrounded = time;
      // Only remember spots with floor under the middle of the player, not
      // a toe on a ledge edge, so a pit respawn never lands over the pit.
      if (p.body.blocked.down && !inWater && this.floorUnder(p.x, p.body.bottom)) {
        this.safe = { x: p.x, y: p.y - 4, feet: p.body.bottom };
      }
    }

    const canJump = !inWater && !onVine && time - this.lastGrounded <= COYOTE_MS;
    if (canJump && wantsJump && !dropped) {
      // Pressed against a wall, she sits a pixel inside it, and going up
      // she'd catch the corner of the wall tile above as a ceiling (no jump
      // at the foot of a ledge). Step her clear of the wall first.
      const b = p.body;
      const wall = (x) => this.physics.overlapRect(x, b.top + 6, 2, b.height - 12, false, true).length > 0;
      const nudge = wall(b.right - 1) ? -2 : wall(b.left - 1) ? 2 : 0;
      if (nudge) {
        p.x += nudge;
        b.x += nudge;
        p.setVelocityX(0);
      }
      p.setVelocityY(-JUMP_SPEED);
      audio.sfx(this, 'jump');
      this.lastGrounded = -1000;
      this.jumpPressedAt = -1000;
    }
    // Let go early for a short hop (not while the current or a hop-out is lifting you).
    const boosted = time < (this.boostUntil || 0);
    if (!jumpHeld && !boosted && !inWater && !onVine && p.body.velocity.y < -250) p.setVelocityY(p.body.velocity.y * 0.85);

    this.falls.forEach((f) => { f.tilePositionY += delta * 0.35; });
    this.updateTunnels();
    this.updateLetters();

    // Picture: in the air the jump frame follows her speed (rising, top of
    // the arc, falling); on the ground she walks or stands.
    if (this.rig) {
      this.rigPicture(time, onFloor, onVine, inWater, down);
    } else if (!onFloor) {
      const vy = p.body.velocity.y;
      const f = vy < -450 ? 1 : vy < -150 ? 2 : vy < 150 ? 3 : vy < 450 ? 4 : 5;
      p.anims.stop();
      p.setTexture(`${this.cid}-jump`, f);
    } else if ((down && Math.abs(p.body.velocity.x) <= 30) || time < (this.crouchUntil || 0)) {
      p.anims.stop();
      p.setTexture(`${this.cid}-crouch`, 2);
    } else if (Math.abs(p.body.velocity.x) > 30) {
      if (p.anims.currentAnim?.key !== `${this.cid}-walk` || !p.anims.isPlaying) p.play(`${this.cid}-walk`);
      // Her steps quicken with her speed: slow as she sets off.
      p.anims.timeScale = Phaser.Math.Clamp(Math.abs(p.body.velocity.x) / RUN_SPEED, 0.55, 1);
      // A footstep as each heel lands (her walk frames 0 and 2), never the same
      // sound twice in a row.
      const frame = p.anims.currentFrame ? p.anims.currentFrame.index - 1 : -1;
      if (frame !== this.walkFrame && this.stepFrames.includes(frame) && !inWater && p.body.blocked.down) {
        let n;
        do n = Phaser.Math.Between(0, 4); while (n === this.lastStep);
        this.lastStep = n;
        audio.sfx(this, `step-${n}`, { detune: Phaser.Math.Between(-80, 80) });
      }
      this.walkFrame = frame;
    } else if (p.anims.currentAnim?.key !== `${this.cid}-idle` || !p.anims.isPlaying) {
      p.anims.timeScale = 1;
      p.play(`${this.cid}-idle`);
    }

    // Fell in a pit: pop back to the last solid ground, one Z-bolt down.
    // Junior Explorer is lifted across to the far side instead.
    if (p.y > this.worldH + 120 && this.band.pitLift && !this.lifting && this.liftAcross(p)) return;
    if (p.y > this.worldH + 120 && !this.lifting) {
      p.setVelocity(0, 0);
      p.setAcceleration(0, 0);
      // A step back from the edge if there's floor there, else the spot itself.
      const back = this.safe.x - (p.flipX ? -40 : 40);
      const feet = this.safe.feet ?? this.safe.y + 52;
      const x = this.floorUnder(back, feet) ? back : this.safe.x;
      p.setPosition(x, this.safe.y - 20);
      this.cameras.main.flash(200, 255, 255, 255);
      // Tamed Zebonkies come back with you.
      this.wild.forEach((z) => { if (z.fed) z.catchUpAt(x, feet, p.flipX); });
      this.hurt();
    }
  }
}
