import { ARTSETS, texKey } from '../data/artsets.js';
import { testParams, DRAWN } from '../data/levels.js';
import { playableLevelId } from '../data/world.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('map', 'assets/z_map.png');

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

    // The explorer (player): one strip of frames per animation.
    this.load.json('explorer', 'assets/player/explorer.json');
    this.load.once('filecomplete-json-explorer', (key, type, data) => {
      Object.entries(data.anims).forEach(([name, a]) => {
        this.load.spritesheet(`explorer-${name}`, `assets/player/${a.file}`,
          { frameWidth: data.frameWidth, frameHeight: data.frameHeight });
      });
    });

    // Art sets: read each manifest, then queue every picture it names.
    ARTSETS.forEach((name) => {
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
          if (b.column) ['top', 'mid', 'bottom'].forEach((k) => add(b.column[k]));
        });
        (data.foreground || []).forEach((f) => add(f.file));
        add(data.food);
        (data.platform_decor || []).forEach(add);
        const dr = data.dressing || {};
        [dr.trunk, ...(dr.ground_plants || []), ...(dr.hangers || [])].forEach(add);
        Object.values(data.canopy || {}).flat().forEach(add);
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
    if (test) this.scene.start('Level', test);
    else this.scene.start('Overworld');
  }
}
