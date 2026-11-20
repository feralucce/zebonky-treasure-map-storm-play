// Phones and tablets (2026-11-20): a screen with no mouse to hover. The
// keyboard labels under the on-screen buttons ("← or A", "X · K · F") are
// hidden there, since there's no keyboard to learn. A Surface or a laptop
// with a touch screen still has a mouse or pen, so it keeps the labels.
export const TOUCH_ONLY = typeof window !== 'undefined' && !!window.matchMedia
  && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
