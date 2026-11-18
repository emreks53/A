// Scene registry: id -> lazy module loader. Add one line per scene.
// Render any of them with ?scene=<id> (tools/render.mjs --scene <id>).
export const scenes = {
  main: () => import('./main.js'),
  world: () => import('./world.js'),
  man: () => import('./man.js'),
  lookdev: () => import('./lookdev.js'),
  swatch: () => import('./swatch.js'),
  swatch2: () => import('./swatch2.js'),
};
