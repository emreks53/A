import * as world from '../scenes/world.js';
export const DURATION = 35.6;
export async function init() { await world.init(); }
export function draw(ctx, t) { world.draw(ctx, t); }
