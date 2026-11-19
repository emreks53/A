/* man pose sheet (DM_HASH=solo=_man): lt 0-1 side poses, 1-2 walk cycle phases, 2-3 front/back poses */
(function () {
  const E = window.E;
  E.scene('_man', {
    draw(L, lt) {
      E.skyWash(L.paint, '#EEF2F6', '#F4EBDD', { mottle: 0.1 });
      const P = E.man.pose;
      const sheet = Math.floor(lt);
      let items;
      if (sheet === 0) items = [['stand', P.stand()], ['reach', P.reach(1)], ['hold', P.hold(1)], ['embrace', P.embrace(1)], ['lookUp', P.lookUp(1)], ['handOnHeart', P.handOnHeart(1)], ['kneel', P.kneel(1)], ['clutch', P.clutch(1)], ['proud', P.proud(1)]].map((x) => [...x, 'side']);
      else if (sheet === 1) items = Array.from({ length: 9 }, (_, i) => ['walk ' + (i / 9).toFixed(2), P.walk(i / 9), 'side']);
      else items = [['fStand', P.fStand(), 'front'], ['fOpen', P.fOpen(1), 'front'], ['fHeart', P.fHeart(1), 'front'], ['fHold', P.fHold(1), 'front'], ['fRaise', P.fRaise(1), 'front'], ['fHug', P.fHug(1), 'front'], ['back', P.fStand(), 'back'], ['back open', P.fOpen(1), 'back'], ['side left', P.walk(0.3), 'side-l']];
      items.forEach(([name, pose, view], i) => {
        const x = 190 + (i % 3) * 350, y = 560 + Math.floor(i / 3) * 600;
        E.man.shadow(L, x, y, 440);
        E.man.draw(L, { x, y, h: 440, view: view === 'side-l' ? 'side' : view, facing: view === 'side-l' ? -1 : 1, pose });
        E.note(L.ink, name, x, y + 40, { size: 36 });
      });
    },
  });
})();
