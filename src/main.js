import { MAP_W, MAP_H } from './data/world.js?v=bb8c89c';
import { state } from './state.js?v=bb8c89c';
import { audio } from './audio.js?v=bb8c89c';
import { BootScene } from './scenes/Boot.js?v=bb8c89c';
import { OverworldScene } from './scenes/Overworld.js?v=bb8c89c';
import { PlatformerScene } from './scenes/Platformer.js?v=bb8c89c';
import { QuizScene } from './scenes/Quiz.js?v=bb8c89c';
import { BonusScene } from './scenes/Bonus.js?v=bb8c89c';
import { BonusRoomScene } from './scenes/BonusRoom.js?v=bb8c89c';
import { SaveMenuScene } from './scenes/SaveMenu.js?v=bb8c89c';
import { CharacterMenuScene } from './scenes/CharacterMenu.js?v=bb8c89c';
import { LevelEndScene } from './scenes/LevelEnd.js?v=bb8c89c';
import { takeLinkSave } from './savecode.js?v=bb8c89c';

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
    scene: [BootScene, OverworldScene, PlatformerScene, QuizScene, BonusScene, BonusRoomScene, SaveMenuScene, CharacterMenuScene, LevelEndScene],
  });
  audio.init(window.game);
  pauseWhileUpright(window.game);
}

// While index.html's "Turn your phone sideways" screen shows, the game
// stops (2026-11-20), so a bonus room's clock doesn't run behind it. The
// loop sleeps: Phaser 4's own pause (game.onHidden) only notes the time and
// relies on the browser not drawing a hidden tab, which an upright phone
// still does. Waking resets the clock, so nothing jumps.
function pauseWhileUpright(game) {
  if (!window.matchMedia) return;
  const upright = window.matchMedia('(orientation: portrait) and (hover: none) and (pointer: coarse)');
  let asleep = false;
  const sync = () => {
    if (upright.matches && !asleep) { asleep = true; game.loop.sleep(); game.sound.pauseAll(); }
    else if (!upright.matches && asleep) { asleep = false; game.loop.wake(); game.sound.resumeAll(); }
  };
  if (upright.addEventListener) upright.addEventListener('change', sync);
  else upright.addListener(sync);
  // Older phones are patchy about that change event; these are not.
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  // The first frame, not 'ready': Phaser starts its loop after 'ready'.
  game.events.once('poststep', () => setTimeout(sync, 0));
}

start();
