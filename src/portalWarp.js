// The see-through middle of a portal (the user, 2026-11-04: "make the center
// of the portals transparent, but have them warp the location behind them";
// the look "kind of like what we have done with the portal's edges", with a
// biome-coloured glow). The portal art's middle is clear
// (tools/portal/make_portal.py); behind it the scene drawn so far is caught
// (a CaptureFrame) and drawn back inside the portal by a small shader,
// swirled the way the rim sways: each ring turns round and back, out of step
// with the next (so it curls), with smaller eddies along it, and breathes in
// and out a little. It works in steps of 2 px, like the art.
//
// The capture needs the camera drawn to its own framebuffer
// (`forceComposite`), so that's on only while the portal is on screen. With
// no WebGL (the canvas renderer) the middle is just the glow.

const FRAG = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uCapture;
uniform sampler2D uMask;
uniform vec2 uRes;       // the framebuffer, px
uniform vec2 uSize;      // the portal frame, game px
uniform vec2 uHalf;      // the ring box's half size, game px (as in make_portal.py)
uniform float uZoom;
uniform float uTime;     // s
uniform float uLoop;     // the portal animation's loop, s
uniform float uPull;     // 0..1: stronger while she's drawn in
uniform vec3 uGlow;
varying vec2 outTexCoord;
const float TAU = 6.2831853;

void main () {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);    // 0,0 top left
  float m = texture2D(uMask, uv).a;
  if (m < 0.5) { gl_FragColor = vec4(0.0); return; }
  // From the middle in game px, in 2 px steps (the art's pixels).
  vec2 p = (uv - 0.5) * uSize;
  p = (floor(p / 2.0) + 0.5) * 2.0;
  vec2 n = p / uHalf;
  float rho = max(abs(n.x), abs(n.y));
  float a = atan(n.y, n.x) / TAU;
  float ph = uTime / uLoop;
  // The rim's sway (make_portal.py swirl()), stronger in here, plus more
  // turn toward the middle while she's pulled in.
  float da = (0.055 + 0.25 * uPull) * sin(TAU * (ph + 2.2 * rho))
           + 0.02 * sin(TAU * (2.0 * ph + 5.0 * a))
           + uPull * 0.6 * (1.0 - rho);
  float r2 = rho * (1.0 + 0.05 * sin(TAU * (2.0 * ph + 3.0 * rho)) - 0.35 * uPull * (1.0 - rho));
  float a2 = (a - da) * TAU;
  vec2 d = vec2(cos(a2), sin(a2));
  vec2 q = d * (r2 / max(max(abs(d.x), abs(d.y)), 0.0001)) * uHalf;
  vec2 off = (q - p) * uZoom;
  vec2 at = (gl_FragCoord.xy + vec2(off.x, -off.y)) / uRes;
  vec3 col = texture2D(uCapture, clamp(at, 0.0, 1.0)).rgb;
  // The biome's glow: stronger toward the rim, and two faint arms turning
  // (as the old painted inside had).
  float arms = pow(0.5 + 0.5 * sin(TAU * (2.0 * a + 1.6 * rho - ph)), 6.0) * (1.0 - rho);
  float g = 0.2 + 0.35 * smoothstep(0.3, 1.0, rho) + 0.12 * uPull;
  col = mix(col, uGlow, g) + uGlow * 0.22 * arms;
  gl_FragColor = vec4(col, 1.0);
}
`;

let uid = 0;

function hexToVec(hex) {
  const v = parseInt((hex || '#a080ff').slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

// The warp for one portal sprite. `pt` is the art set's portal entry,
// `maskKey` the texture of its clear middle (portal_inside.png).
export function addPortalWarp(scene, sprite, pt, maskKey) {
  if (!scene.textures.exists(maskKey)) return null;
  const glow = hexToVec(pt.glow);
  const depth = sprite.depth;
  const webgl = scene.renderer && scene.renderer.gl && Phaser.GameObjects.CaptureFrame && Phaser.GameObjects.Shader;
  if (!webgl) {
    const img = scene.add.image(sprite.x, sprite.y, maskKey).setDepth(depth - 0.01)
      .setTint(Phaser.Display.Color.GetColor(glow[0] * 255, glow[1] * 255, glow[2] * 255)).setAlpha(0.55);
    return { img, update() { img.setVisible(sprite.visible); } };
  }
  const cam = scene.cameras.main;
  const key = `portal-capture-${uid++}`;
  const capture = scene.add.captureFrame(key).setDepth(depth - 0.02);
  const W = pt.frameWidth;
  const H = pt.frameHeight;
  const loop = (pt.frames || 24) / (pt.fps || 10);
  const warp = {
    pull: 0,
    capture,
    shader: null,
    update() {},
  };
  const shader = scene.add.shader({
    name: 'PortalWarp',
    fragmentSource: FRAG,
    setupUniforms: (set, dc) => {
      set('uCapture', 0);
      set('uMask', 1);
      set('uRes', [dc.width, dc.height]);
      set('uSize', [W, H]);
      // the ring box: the source's 51 x 81 frame, drawn at 2x
      set('uHalf', [W / 2 - 17, H / 2 - 17]);
      set('uZoom', cam.zoom);
      set('uTime', scene.time.now / 1000);
      set('uLoop', loop);
      set('uPull', warp.pull);
      set('uGlow', glow);
    },
  }, sprite.x, sprite.y, W, H, [key, maskKey]).setDepth(depth - 0.01);
  warp.shader = shader;
  // Only while it's on screen: the capture and the camera's framebuffer.
  warp.update = () => {
    shader.setPosition(sprite.x, sprite.y);
    const v = cam.worldView;
    const on = sprite.visible && sprite.x + W / 2 > v.x && sprite.x - W / 2 < v.right
      && sprite.y + H / 2 > v.y && sprite.y - H / 2 < v.bottom;
    shader.setVisible(on);
    capture.setVisible(on);
    cam.forceComposite = on;
  };
  warp.update();
  scene.events.on('postupdate', warp.update);
  scene.events.once('shutdown', () => {
    scene.events.off('postupdate', warp.update);
    cam.forceComposite = false;
  });
  return warp;
}
