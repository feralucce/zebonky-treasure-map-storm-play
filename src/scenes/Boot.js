import { ARTSETS, texKey } from '../data/artsets.js?v=3ed34b2';
import { testParams, DRAWN } from '../data/levels.js?v=3ed34b2';
import { playableLevelId, BIOMES, MAP_W, MAP_H } from '../data/world.js?v=3ed34b2';
import { CHARACTERS } from '../data/characters.js?v=3ed34b2';
import { state } from '../state.js?v=3ed34b2';
import { COLORS, heading, text } from '../theme.js?v=3ed34b2';
import { showcaseData, showcaseArtset } from '../showcase.js?v=3ed34b2';
import { explorerTourData, tourArtset, loadTourStrips } from '../explorerTour.js?v=3ed34b2';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  // The loading splash: a progress bar that only ever moves forward (the
  // file count grows as the art set lists come in), and a note that the
  // beta loads slower than the finished game will.
  buildSplash() {
    const cx = MAP_W / 2;
    const cy = MAP_H / 2;
    const w = 620;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(cx - w / 2 - 40 + 6, cy - 150 + 8, w + 80, 300, 26);
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(cx - w / 2 - 40, cy - 150, w + 80, 300, 26);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(cx - w / 2 - 40, cy - 150, w + 80, 300, 26);
    this.add.text(cx, cy - 100, 'Getting Zebonkia ready...', heading(34)).setOrigin(0.5);
    const bar = this.add.graphics();
    const pct = this.add.text(cx, cy + 22, '0%', heading(20)).setOrigin(0.5);
    this.add.text(cx, cy + 82, 'This game is in beta, so it loads slower now than it will when it\'s finished.',
      text(17, '#6b4a2e', { align: 'center', wordWrap: { width: w } })).setOrigin(0.5);
    let shown = 0;
    const draw = (v) => {
      shown = Math.max(shown, v);
      bar.clear();
      bar.fillStyle(COLORS.ink, 1);
      bar.fillRoundedRect(cx - w / 2, cy - 32, w, 30, 15);
      bar.fillStyle(0xe8cf98, 1);
      bar.fillRoundedRect(cx - w / 2 + 4, cy - 28, w - 8, 22, 11);
      if (shown > 0.01) {
        bar.fillStyle(COLORS.green, 1);
        bar.fillRoundedRect(cx - w / 2 + 4, cy - 28, Math.max(22, (w - 8) * shown), 22, 11);
      }
      pct.setText(`${Math.round(shown * 100)}%`);
    };
    draw(0);
    this.load.on('progress', (v) => {
      // Lists add files as they arrive, so judge by files done of files known.
      const total = this.load.totalToLoad || 1;
      draw(Math.min(v, this.load.totalComplete / total));
    });
  }

  preload() {
    this.buildSplash();
    this.load.image('map', 'assets/z_map.png');
    // Each biome's close-up, for the map's zoom (tools/make_biome_closeups.py).
    this.load.json('closeups', 'assets/map/closeups.json');
    this.load.once('filecomplete-json-closeups', (key, type, data) => {
      Object.entries(data).forEach(([b, c]) => this.load.image(`closeup-${b}`, `assets/map/${c.file}`));
    });
    // The biomes' Zebonkies, shown when one joins as a companion.
    Object.values(BIOMES).forEach((b) => b.zebonky && this.load.image(`zebonky-${b.zebonky.id}`, `assets/zebonkies/${b.zebonky.id}.png`));

    // Concept art: simple rounded-box SVGs, drawn at their native size.
    [
      'player-idle', 'player-walk', 'player-jump',
      'ground', 'ground-top', 'platform',
      'treasure', 'goal', 'secret-door',
      'bg-hill', 'bg-cloud',
      'sand', 'sand-top', 'rock', 'rock-top',
      'water', 'water-top', 'waterfall', 'fin', 'sign',
      'btn-left', 'btn-right', 'btn-jump',
    ].forEach((key) => this.load.svg(key, `assets/svg/${key}.svg`));

    // Shared game sprites cut from the Zebonky reference kit.
    this.load.image('crate', 'assets/sprites/crate.png');
    this.load.image('zpaw', 'assets/sprites/zpaw.png');
    ['left', 'right', 'up', 'upleft', 'upright'].forEach((d) => this.load.svg(`sign-${d}`, `assets/sprites/sign_${d}.svg`));
    this.load.image('zbar-full', 'assets/hud/zbar_full.png');
    this.load.image('zbar-spent', 'assets/hud/zbar_spent.png');
    this.load.json('zbar', 'assets/hud/zbar.json');

    // The explorers (players): one strip of frames per animation, for every
    // character in the selector.
    CHARACTERS.forEach((c) => {
      this.load.json(c.id, c.manifest);
      this.load.once(`filecomplete-json-${c.id}`, (key, type, data) => {
        Object.entries(data.anims).forEach(([name, a]) => {
          this.load.spritesheet(`${c.id}-${name}`, `${c.base}${a.file}`,
            { frameWidth: a.frameWidth || data.frameWidth, frameHeight: a.frameHeight || data.frameHeight });
        });
      });
    });

    // Art sets: read each manifest, then queue every picture it names. A
    // showcase strip (zebonkies.html) loads only its Zebonky's own set.
    const q = new URLSearchParams(window.location.search);
    const strip = showcaseArtset(q.get('showcase')) || tourArtset(q.get('explorers'));
    // The explorer tour (index.html?explorers=girl or =boy): her new strips.
    if (tourArtset(q.get('explorers'))) loadTourStrips(this, q.get('explorers'));
    (strip ? [strip] : ARTSETS).forEach((name) => {
      const base = `assets/artsets/${name}/`;
      this.load.json(`artset:${name}`, `${base}artset.json`);
      this.load.once(`filecomplete-json-artset:${name}`, (key, type, data) => {
        const files = new Set();
        const add = (f) => f && files.add(f);
        Object.values(data.sets || {}).forEach((set) => Object.values(set)
          .filter(Array.isArray).flat().forEach(add));
        // Seamless ground: its pictures are the .png entries of the skin.
        Object.values(data.sets || {}).forEach((set) => set.skin && Object.values(set.skin)
          .filter((v) => typeof v === 'string' && v.endsWith('.png')).forEach(add));
        Object.values(data.platform || {}).flat().forEach(add);
        (data.scatter || []).forEach(add);
        (data.background || []).forEach((b) => {
          add(b.file);
          (b.pieces || []).forEach(add);
          if (b.column) ['top', 'mid', 'bottom'].forEach((k) => add(b.column[k]));
        });
        (data.foreground || []).forEach((f) => add(f.file));
        add(data.food);
        (data.foods || []).forEach(add);
        // Chris's "good vibe" sparkle in the colours of this food (tools/make_food.py).
        if (data.food && data.food.includes('/food/')) add(data.food.replace(/([^/]+)\.png$/, 'sparkle_$1.png'));
        // Water (surface and body) and the vine wall, from Chris's biome sets.
        if (data.water) [...(data.water.top || []), ...(data.water.body || []), data.water.falls,
          data.water.top_strip, data.water.body_strip].forEach(add);
        add(data.vines);
        add(data.vine_strand);
        add(data.vine_strand_top);
        (data.platform_decor || []).forEach(add);
        const dr = data.dressing || {};
        [dr.trunk, ...(dr.ground_plants || []), ...(dr.hangers || [])].forEach(add);
        Object.values(data.canopy || {}).flat().forEach(add);
        // The bonus level door (tools/make_bonus_door.py): its opening frames.
        if (data.door_bonus) {
          this.load.spritesheet(texKey(name, data.door_bonus.file), base + data.door_bonus.file,
            { frameWidth: data.door_bonus.frameWidth, frameHeight: data.door_bonus.frameHeight });
        }
        // The region's Zebonky: one strip of frames per animation.
        const z = data.zebonky;
        if (z) {
          Object.values(z.anims).forEach((a) => {
            files.delete(a.file);
            this.load.spritesheet(texKey(name, a.file), base + a.file, { frameWidth: z.frameWidth, frameHeight: z.frameHeight });
          });
        }
        files.forEach((f) => {
          const k = texKey(name, f);
          if (f.endsWith('.svg')) this.load.svg(k, base + f);
          else this.load.image(k, base + f);
        });
      });
    });

    // Levels drawn in the designer and saved into assets/levels/. Always
    // fetched fresh (the files are small): a browser's cached copy would
    // keep showing a level from before an update.
    const fresh = `?v=${Date.now()}`;
    this.load.json('drawn-levels', `assets/levels/index.json${fresh}`);
    this.load.once('filecomplete-json-drawn-levels', (key, type, list) => {
      (Array.isArray(list) ? list : []).forEach((id) => this.load.json(`drawn:${id}`, `assets/levels/${id}.json${fresh}`));
    });
  }

  create() {
    const list = this.cache.json.get('drawn-levels');
    (Array.isArray(list) ? list : []).forEach((id) => {
      const layout = this.cache.json.get(`drawn:${id}`);
      if (layout && Array.isArray(layout.rows)) DRAWN[id] = layout;
    });
    // index.html?test=1 plays the drawing the level designer just handed over.
    const test = testParams();
    // A demo drawing can borrow another level's name and questions
    // ("level" in its file), e.g. a second look at the same level.
    if (test && test.demo && DRAWN[test.layoutId] && DRAWN[test.layoutId].level) {
      test.levelId = DRAWN[test.layoutId].level;
    }
    if (test) test.levelId = playableLevelId(test.levelId);
    // index.html?inspect=1: inspection mode, the whole game with every level
    // open and no explorer (?inspect=<level id> goes straight to that level).
    // index.html?showcase=1 (or =<name>): the Zebonky showcase.
    const show = new URLSearchParams(window.location.search).get('showcase');
    // index.html?explorers=girl (or =boy): the explorer tour (src/explorerTour.js).
    const tour = new URLSearchParams(window.location.search).get('explorers');
    if (tour) {
      this.scene.start('Level', explorerTourData(tour));
      return;
    }
    if (show) {
      this.scene.start('Level', showcaseData(show === '1' ? 'shaan' : show));
      return;
    }
    const inspect = new URLSearchParams(window.location.search).get('inspect');
    if (inspect) {
      state.startInspection();
      if (inspect === '1') this.scene.start('Overworld');
      else this.scene.start('Level', { levelId: playableLevelId(inspect), inspect: true });
      return;
    }
    if (test) this.scene.start('Level', test);
    else this.scene.start('Overworld');
  }
}
