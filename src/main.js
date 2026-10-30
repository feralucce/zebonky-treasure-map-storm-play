import { MAP_W, MAP_H } from './data/world.js?v=c6ce4c1';
import { state } from './state.js?v=c6ce4c1';
import { audio } from './audio.js?v=c6ce4c1';
import { BootScene } from './scenes/Boot.js?v=c6ce4c1';
import { OverworldScene } from './scenes/Overworld.js?v=c6ce4c1';
import { PlatformerScene } from './scenes/Platformer.js?v=c6ce4c1';
import { QuizScene } from './scenes/Quiz.js?v=c6ce4c1';
import { BonusScene } from './scenes/Bonus.js?v=c6ce4c1';
import { SaveMenuScene } from './scenes/SaveMenu.js?v=c6ce4c1';
import { CharacterMenuScene } from './scenes/CharacterMenu.js?v=c6ce4c1';
import { LevelEndScene } from './scenes/LevelEnd.js?v=c6ce4c1';
import { takeLinkSave } from './savecode.js?v=c6ce4c1';

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
