/* engine test card: watercolour washes + man in several views/poses. Activated with location.hash = '#test' */
(function () {
  const E = window.E;
  const def = {
    draw(L, lt) {
      const P = E.P;
      E.skyWash(L.paint, E.shade(P.cerulean, 0.25), E.shade(P.ochre, 0.55), { mid: E.shade(P.skyWash, 0.4) });
      // hills
      E.wash(L.paint, E.wobblyShape([[-50, 1500], [300, 1380], [700, 1430], [1130, 1350], [1130, 1950], [-50, 1950]], { seed: 4, amp: 10 }), P.sap, { mode: 'over' });
      E.wash(L.paint, E.wobblyShape([[-50, 1620], [400, 1560], [1130, 1600], [1130, 1950], [-50, 1950]], { seed: 6, amp: 8 }), P.leaf, { alpha: 0.7 });
      E.bloom(L.paint, 800, 300, 140, P.ochre, { alpha: 0.5 });
      E.wash(L.paint, E.blob(820, 330, 70, { seed: 2, irr: 0.05 }), P.gamboge, { mode: 'over' });
      E.glow(L.light, 820, 330, 260, '#FFE9B0', 0.5);
      E.wash(L.paint, E.blob(250, 420, 120, { rx: 190, ry: 60, seed: 3, irr: 0.2 }), '#ffffff', { mode: 'over', alpha: 0.85, soft: 6 });
      // men: side stand, side walk, front, back, side embrace
      const g = 1560;
      E.man.shadow(L, 170, g, 380);
      E.man.draw(L, { x: 170, y: g, h: 380, view: 'side', pose: E.man.pose.stand() });
      E.man.shadow(L, 420, g, 380);
      E.man.draw(L, { x: 420, y: g, h: 380, view: 'side', pose: E.man.pose.walk((lt * 0.9) % 1) });
      E.man.shadow(L, 650, g, 380);
      E.man.draw(L, { x: 650, y: g, h: 380, view: 'front', pose: E.man.pose.fStand() });
      E.man.shadow(L, 880, g, 380);
      E.man.draw(L, { x: 880, y: g, h: 380, view: 'back', pose: E.man.pose.fStand() });
      // big one
      E.man.shadow(L, 300, 1180, 520);
      E.man.draw(L, { x: 300, y: 1180, h: 520, view: 'side', facing: 1, pose: E.man.pose.hold(1) });
      E.man.draw(L, { x: 760, y: 1180, h: 520, view: 'front', pose: E.man.pose.fHeart(1) });
      E.pencil(L.ink, [[60, 1700], [500, 1690], [1020, 1710]], { w: 2, a: 0.4 });
      E.note(L.ink, 'hayat', 540, 1780, { size: 56 });
    },
  };
  E.scene('_test', def);
  if (location.hash === '#test') E.SCENES.s01 = def;
})();
