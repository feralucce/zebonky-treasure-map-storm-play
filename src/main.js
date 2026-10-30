import { MAP_W, MAP_H } from './data/world.js?v=80f9bd6';
import { state } from './state.js?v=80f9bd6';
import { audio } from './audio.js?v=80f9bd6';
import { BootScene } from './scenes/Boot.js?v=80f9bd6';
import { OverworldScene } from './scenes/Overworld.js?v=80f9bd6';
import { PlatformerScene } from './scenes/Platformer.js?v=80f9bd6';
import { QuizScene } from './scenes/Quiz.js?v=80f9bd6';
import { BonusScene } from './scenes/Bonus.js?v=80f9bd6';
import { SaveMenuScene } from './scenes/SaveMenu.js?v=80f9bd6';
import { CharacterMenuScene } from './scenes/CharacterMenu.js?v=80f9bd6';
import { LevelEndScene } from './scenes/LevelEnd.js?v=80f9bd6';
import { takeLinkSave } from './savecode.js?v=80f9bd6';

state.load();
// Opened from a save link: the map asks before loading it.
state.pendingLoad = takeLinkSave();

async function start() {
  // Make sure the brand fonts are ready before Phaser draws any text.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 24px Nunito'),
        document.fonts.load('800 24px Poppins'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (e) {
    // Fall back to system fonts.
  }

  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: MAP_W,
    height: MAP_H,
    backgroundColor: '#2b1d12',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 3 },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 1900 }, debug: false },
    },
    scene: [BootScene, OverworldScene, PlatformerScene, QuizScene, BonusScene, SaveMenuScene, CharacterMenuScene, LevelEndScene],
  });
  audio.init(window.game);
}

start();
