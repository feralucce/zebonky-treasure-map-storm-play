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
  }

  create() {
    this.scene.start('Overworld');
  }
}
