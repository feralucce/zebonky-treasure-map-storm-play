import { ARTSETS, texKey } from '../data/artsets.js';
import { testParams, DRAWN } from '../data/levels.js';

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

    // Art sets: read each manifest, then queue every picture it names.
    ARTSETS.forEach((name) => {
      const base = `assets/artsets/${name}/`;
      this.load.json(`artset:${name}`, `${base}artset.json`);
      this.load.once(`filecomplete-json-artset:${name}`, (key, type, data) => {
        const files = new Set();
        const add = (f) => f && files.add(f);
        Object.values(data.sets || {}).forEach((set) => Object.values(set).flat().forEach(add));
        Object.values(data.platform || {}).flat().forEach(add);
        (data.scatter || []).forEach(add);
        (data.background || []).forEach((b) => add(b.file));
        files.forEach((f) => {
          const k = texKey(name, f);
          if (f.endsWith('.svg')) this.load.svg(k, base + f);
          else this.load.image(k, base + f);
        });
      });
    });

    // Levels drawn in the designer and saved into assets/levels/.
    this.load.json('drawn-levels', 'assets/levels/index.json');
    this.load.once('filecomplete-json-drawn-levels', (key, type, list) => {
      (Array.isArray(list) ? list : []).forEach((id) => this.load.json(`drawn:${id}`, `assets/levels/${id}.json`));
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
    if (test) this.scene.start('Level', test);
    else this.scene.start('Overworld');
  }
}
