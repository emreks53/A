/* Preview sheets for engine/props-b.js (objects & symbols).
   Render:  DM_HASH=solo=_props_b node tools/render.cjs stills --times 0.5,2,4 --out <dir>
   Sheets by local time (u = lt - 10·sheet animates each sheet over 10 s):
     lt   0–10  sheet 0   OVERVIEW: all 14 props at once
     lt  10–20  sheet 1   mirror (reflect/shine, round arch, night, small) + hourglasses
     lt  20–30  sheet 2   mirror + hourglass LARGE
     lt  30–40  sheet 3   page, reed pen, inkWrite/scriptLine, books
     lt  40–50  sheet 4   heart-light states, reflection, thorns, nakış states
     lt  50–60  sheet 5   ribbons + lanterns
     lt  60–70  sheet 6   pedestal + statue (shaded, grow), pedestals, stone(path), calligraphy frames (day / night)
     lt  70–80  sheet 7   heart LARGE (light → dark + thorns) + reflection
     lt  80–90  sheet 8   nakış LARGE on a mirror globe
     lt  90–100 sheet 9   book LARGE (open, pages, two leaf turns: flip 0→2, pages2 writes the new spread)
     lt 100–110 sheet 10  page + reed pen LARGE (writing)
     lt 110–120 sheet 11  night: lantern, statue on pedestal, calligraphy frame, hourglass, mirror whose
                          reflection fades out (reflectAlpha) */
(function () {
  const E = window.E;
  const P = E.P;
  const label = (L, txt, x, y, size = 30) => E.note(L.ink, txt, x, y, { size, alpha: 0.55 });

  function bg(L, night = 0) {
    if (night) {
      E.skyWash(L.paint, '#3A4670', '#25304F', { mid: '#2F3B60', seed: 9, mottle: 0.2 });
    } else {
      E.skyWash(L.paint, E.shade(P.skyWash, 0.55), E.shade(P.ochre, 0.7), { mid: E.shade(P.paper, 0.2), seed: 3, mottle: 0.18 });
    }
  }

  const sheets = [
    // ---------------- sheet 0: OVERVIEW (all props) ----------------
    (L, u) => {
      bg(L);
      const PR = E.props;
      // floor line for the standing props
      E.wash(L.paint, E.wobblyShape([[-40, 760], [1120, 750], [1120, 820], [-40, 830]], { seed: 3, amp: 5 }), E.shade(P.ochre, 0.5), { alpha: 0.55 });
      // 1 mirror (with reflection + sweeping gleam)
      PR.mirror(L, 150, 770, 640, { t: u, shine: (u % 4) / 3, reflect: (L2, r) => {
        E.man.draw(L2, { x: r.x + r.w * 0.55, y: r.y + r.h * 0.985, h: r.h * 0.78, view: 'side', facing: -1, pose: E.man.pose.stand() });
      } });
      label(L, 'mirror', 150, 800);
      // 2 hourglass (sand runs over the 10 s)
      PR.hourglass(L, 410, 770, 330, { t: u, sand: 0.85 - u * 0.075, flow: 1, glow: 0.5 });
      label(L, 'hourglass', 410, 800);
      // 10 lantern
      PR.lantern(L, 410, 0, 230, { t: u, lit: 1, chain: 60 });
      // 7 heart-light (+ dark + thorns)
      PR.heartLight(L, 650, 150, 85, { t: u, glow: 0.9 });
      PR.heartLight(L, 900, 150, 75, { t: u, glow: 0.5, dark: E.ep(u, 1, 4), thorns: E.ep(u, 3, 7) });
      label(L, 'heartLight', 775, 270);
      // 3 page (border draws, lines) + 6 book
      PR.page(L, 660, 520, 190, 250, { rot: -0.06, t: u, border: E.ep(u, 0.3, 3), lines: E.ep(u, 2.5, 4), curl: 0.35 });
      PR.book(L, 900, 560, 115, 155, { open: E.ep(u, 0.5, 3), t: u, glow: 0.7, pages: E.ep(u, 2.5, 8), flip: E.ep(u, 8, 9.6) });
      label(L, 'page', 660, 680); label(L, 'book', 900, 680);
      // 8 nakış (blooming) + 14 calligraphy frame
      PR.nakis(L, 250, 1050, 190, { reveal: E.ep(u, 0.3, 7, 'inOutSine'), t: u, glow: 0.7 });
      label(L, 'nakis', 250, 1255);
      PR.calligraphyFrame(L, 760, 930, 500, 130, { reveal: E.ep(u, 0.3, 3), t: u });
      label(L, 'calligraphyFrame', 760, 930);
      // 4 reed pen + 5 inkWrite
      const st = PR.scriptLine(940, 1160, 580, { size: 30, seed: 4 });
      const head = PR.inkWrite(L, st, E.ep(u, 0.5, 8, 'linear'), { width: 8, seed: 3 });
      const hp = head || [940, 1160];
      PR.reedPen(L, hp[0], hp[1], 230, { angle: -1.05, ink: 1, t: u, glow: 0.3 });
      label(L, 'reedPen · inkWrite', 760, 1220);
      // 9 ribbons
      ['#D2553A', '#E0A43A', P.rose].forEach((c, i) => {
        PR.ribbon(L, PR.ribbonPath(80, 1350 + i * 55, 1000, 1300 + i * 75, { seed: i + 3, curl: [0.2, 0.7, 0.3][i], amp: 0.07 }),
          { p: E.ep(u, 0.5 + i * 0.6, 3 + i * 0.6), width: 46 - i * 6, color: c, t: u, glow: 0.4, seed: i + 1 });
      });
      label(L, 'ribbon', 540, 1590);
      // 13 pedestal + 12 statue (stone), 11 thorns, stone(path)
      PR.pedestal(L, 170, 1760, 200, 150, { seed: 3 });
      PR.statue(L, { x: 170, y: 1760, h: 210, view: 'side', facing: 1, pose: E.man.pose.proud(1) }, { p: 1, grow: E.ep(u, 0.5, 4) });
      label(L, 'pedestal · statue', 170, 1885);
      const blob = E.blob(460, 1760, 80, { seed: 3, irr: 0.25 });
      E.wash(L.paint, blob, P.terracotta, { mode: 'over' });
      PR.stone(L, blob, { p: E.ep(u, 1, 4), seed: 4, bounds: { x: 370, y: 1670, w: 180, h: 180 } });
      label(L, 'stone', 460, 1885);
      PR.thorns(L, 700, 1760, 85, { p: E.ep(u, 0.5, 5), t: u, seed: 5 });
      label(L, 'thorns', 700, 1885);
      PR.mirror(L, 920, 1880, 260, { t: u, night: 1, shine: ((u + 2) % 4) / 3 });
      label(L, 'night', 920, 1600);
    },
    // ---------------- sheet 1: mirror + hourglass ----------------
    (L, u) => {
      bg(L);
      // ground
      E.wash(L.paint, E.wobblyShape([[-40, 1180], [1120, 1170], [1120, 1260], [-40, 1270]], { seed: 3, amp: 6 }), E.shade(P.ochre, 0.55), { alpha: 0.6 });
      const man = (L2, r) => {
        E.man.draw(L2, { x: r.x + r.w * 0.5, y: r.y + r.h * 0.97, h: r.h * 0.86, view: 'side', facing: -1, pose: E.man.pose.stand(), alpha: 0.9 });
        E.glow(L2.light, r.x + r.w / 2, r.y + r.h * 0.5, r.h * 0.5, '#FFE3B5', 0.25);
      };
      E.man.shadow(L, 170, 1190, 300);
      E.man.draw(L, { x: 170, y: 1190, h: 300, view: 'side', facing: 1, pose: E.man.pose.stand() });
      E.props.mirror(L, 420, 1190, 560, { t: u, shine: (u % 4) / 3, reflect: man });
      E.props.mirror(L, 780, 1190, 560, { t: u, arch: 'round' });
      label(L, 'mirror · reflect + shine', 420, 1230);
      label(L, "arch:'round'", 780, 1230);
      // small + night
      E.wash(L.paint, E.rrect(30, 1300, 500, 560, 30), '#33406A', { mode: 'over' });
      E.props.mirror(L, 160, 1800, 420, { t: u, night: 1, shine: ((u + 1.5) % 4) / 3 });
      E.props.mirror(L, 330, 1800, 200, { t: u, night: 0.5 });
      E.props.mirror(L, 460, 1800, 110, { t: u });
      // hourglasses
      E.props.hourglass(L, 650, 1820, 420, { t: u, sand: 0.7 - u * 0.05, flow: 1, glow: 0.6 });
      E.props.hourglass(L, 880, 1820, 300, { t: u, sand: 0.15, flow: 1, speed: 2 });
      E.props.hourglass(L, 880, 1440, 180, { t: u, sand: 1, flow: 0 });
      E.props.hourglass(L, 990, 1640, 120, { t: u, sand: 0, flow: 0, night: 1 });
      label(L, 'hourglass', 650, 1860);
    },
    // ---------------- sheet 2: mirror + hourglass LARGE ----------------
    (L, u) => {
      bg(L);
      E.props.mirror(L, 330, 1700, 1500, { t: u, shine: (u % 5) / 4 });
      E.props.hourglass(L, 850, 1100, 620, { t: u, sand: 0.55, flow: 1, glow: 0.7 });
      E.wash(L.paint, E.rrect(650, 1200, 420, 700, 30), '#323E66', { mode: 'over' });
      E.props.hourglass(L, 850, 1800, 540, { t: u, sand: 0.25, flow: 1, night: 1, glow: 0.4 });
    },
    // ---------------- sheet 3: page, reed pen, ink, book ----------------
    (L, u) => {
      bg(L);
      const cyc = (u % 5) / 5;
      E.props.page(L, 280, 330, 440, 560, { rot: -0.05, t: u, border: E.ep(u % 5, 0.2, 2.5), lines: E.ep(u % 5, 2, 3.5),
        content: (L2, r) => {
          E.wash(L2.paint, E.blob(r.x + r.w * 0.5, r.y + r.h * 0.55, r.w * 0.28, { seed: 4 }), P.sap, { alpha: 0.6 });
          E.wash(L2.paint, E.rrect(r.x + r.w * 0.38, r.y + r.h * 0.5, r.w * 0.24, r.h * 0.18, 4), P.terracotta, { alpha: 0.7 });
        } });
      label(L, 'page · border/lines/content', 280, 650);
      E.props.page(L, 800, 330, 380, 480, { rot: 0.06, t: u, border: 1, lines: 1, curl: 0.5 + 0.5 * Math.sin(u), lift: 0 });
      label(L, 'curl', 800, 610);
      // pens + writing
      const pts = E.props.scriptLine(980, 840, 560, { size: 34, seed: 3 });
      E.props.inkWrite(L, pts, cyc * 1.2, { width: 9, seed: 2 });
      E.props.inkWrite(L, [[120, 760], [200, 730], [300, 790], [400, 720], [480, 770]], cyc * 1.3, { width: 14, color: P.crimson });
      const head = E.props.inkWrite(L, E.props.scriptLine(980, 930, 560, { size: 26, seed: 5 }), cyc * 1.2, { width: 7, seed: 9 });
      if (head) E.props.reedPen(L, head[0], head[1], 300, { angle: -1.05, ink: 1, t: u });
      E.props.reedPen(L, 120, 1000, 380, { angle: -0.5, glow: 0.9, t: u });
      E.props.reedPen(L, 160, 900, 160, { angle: -2.6, ink: 0.5, t: u });
      label(L, 'reedPen · inkWrite · scriptLine', 540, 1010);
      // books
      E.props.book(L, 280, 1250, 300, 380, { open: 0, t: u });
      E.props.book(L, 760, 1260, 280, 360, { open: E.ep(u % 5, 0.3, 2.2), t: u, glow: 0.8, pages: E.ep(u % 5, 2, 4.5), flip: E.ep(u % 5, 3.6, 4.8) });
      E.props.book(L, 280, 1700, 240, 300, { open: 0.35, t: u });
      E.props.book(L, 760, 1710, 240, 300, { open: 0.75, t: u, cover: '#3F5A86', rtl: false });
      label(L, 'book · open / pages / flip / glow', 540, 1520);
    },
    // ---------------- sheet 4: heart-light, thorns, nakis ----------------
    (L, u) => {
      bg(L);
      E.props.heartLight(L, 200, 220, 110, { t: u, glow: 0.9 });
      E.props.heartLight(L, 540, 220, 110, { t: u, glow: 0.6, dark: 0.5 });
      E.props.heartLight(L, 880, 220, 110, { t: u, glow: 0.5, dark: 1, thorns: E.ep(u % 5, 0.2, 3) });
      label(L, 'heartLight · glow / dark / thorns', 540, 380);
      // reflection over water
      E.wash(L.paint, E.rrect(60, 420, 460, 330, 20), '#7FA7CF', { alpha: 0.6 });
      E.props.heartLight(L, 290, 590, 100, { t: u, reflection: true, glow: 0.8 });
      E.props.heartLight(L, 720, 600, 60, { t: u, glow: 0.8 });
      E.props.thorns(L, 900, 600, 90, { p: E.ep(u % 5, 0, 3.5), t: u, seed: 5 });
      label(L, 'reflection · small · thorns', 540, 780);
      // nakis: growing + full
      E.props.nakis(L, 300, 1100, 270, { reveal: E.ep(u % 6, 0.2, 5.2, 'inOutSine'), t: u, glow: 0.7 });
      // on a silver mirror globe, clipped
      const clip = new Path2D(); clip.arc(790, 1100, 230, 0, Math.PI * 2);
      E.wash(L.paint, clip, '#C3CCD9', { mode: 'over' });
      E.wash(L.paint, clip, '#9AA6BC', { grad: { from: [700, 1000], r: 320, c2: '#7A869E' }, alpha: 0.5 });
      E.props.nakis(L, 790, 1100, 300, { reveal: 1, t: u, glow: 0.8, clip });
      E.props.nakis(L, 300, 1620, 200, { reveal: 1, t: u, glow: 0.5, color: P.gold });
      E.props.nakis(L, 790, 1620, 110, { reveal: 1, t: u, glow: 0.5 });
      label(L, 'nakis · reveal / clip / small', 540, 1880);
    },
    // ---------------- sheet 5: ribbons + lanterns ----------------
    (L, u) => {
      bg(L);
      const cols = ['#D2553A', '#E0A43A', P.rose];
      const paths = [
        E.props.ribbonPath(120, 820, 960, 160, { seed: 1, curl: 0.25 }),
        E.props.ribbonPath(120, 900, 960, 380, { seed: 2, curl: 0.8 }),
        E.props.ribbonPath(140, 980, 940, 640, { seed: 5, curl: 0.5 }),
      ];
      paths.forEach((pts, i) => E.props.ribbon(L, pts, { p: E.ep(u % 5, 0.2 + i * 0.5, 2.2 + i * 0.5), width: 70 - i * 10, color: cols[i], t: u, glow: 0.5, seed: i + 1 }));
      label(L, 'ribbon · ribbonPath (curl 0.25 / 0.8 / 0.5)', 540, 1060);
      // lanterns
      E.wash(L.paint, E.rrect(20, 1110, 1040, 780, 30), '#3A4670', { mode: 'over' });
      E.props.lantern(L, 200, 1130, 420, { t: u, lit: 1 });
      E.props.lantern(L, 470, 1130, 300, { t: u + 1, lit: 0.6, color: P.rose, night: 0.5 });
      E.props.lantern(L, 690, 1130, 220, { t: u + 2, lit: 0, color: '#4E7FB0' });
      E.props.lantern(L, 880, 1130, 120, { t: u + 3, lit: 1, color: P.viridian, chain: 140 });
      E.props.lantern(L, 880, 1500, 90, { t: u + 3, lit: 1 });
      label(L, 'lantern · lit / colour / small', 540, 1860);
    },
    // ---------------- sheet 6: stone, statue, pedestal, calligraphy frame ----------------
    (L, u) => {
      bg(L);
      // pedestal + statue (petrifying from the feet up)
      E.props.pedestal(L, 270, 860, 300, 260, { seed: 3 });
      const grow = E.ep(u % 5, 0.3, 3.5);
      E.man.shadow(L, 270, 860, 420, 0.3, 0.8);
      E.props.statue(L, { x: 270, y: 860, h: 420, view: 'side', facing: 1, pose: E.man.pose.proud(1) }, { p: 1, grow, seed: 2 });
      label(L, 'pedestal + statue (grow)', 270, 1160);
      E.props.pedestal(L, 730, 880, 240, 240, { seed: 5, ornament: true });
      E.props.pedestal(L, 950, 980, 110, 140, { seed: 6, night: 0.6 });
      label(L, 'pedestal · ornament / night', 800, 1160);
      // stone over an arbitrary path
      const blob = E.blob(760, 560, 150, { seed: 3, irr: 0.25 });
      E.wash(L.paint, blob, P.terracotta, { mode: 'over' });
      E.props.stone(L, blob, { p: E.ep(u % 5, 0, 2), seed: 4, bounds: { x: 600, y: 400, w: 320, h: 320 } });
      label(L, 'stone(path)', 760, 760);
      // calligraphy frames: day cartouche, night rules
      E.props.calligraphyFrame(L, 540, 1330, 860, 230, { reveal: E.ep(u % 5, 0.2, 2.8), t: u });
      E.wash(L.paint, E.rrect(40, 1490, 1000, 380, 24), '#26314F', { mode: 'over' });
      E.props.calligraphyFrame(L, 540, 1680, 820, 200, { reveal: E.ep(u % 5, 0.5, 3), t: u, night: 1, style: 'rules' });
      E.props.calligraphyFrame(L, 540, 1680, 600, 120, { reveal: 1, t: u, night: 1 });
    },
    // ---------------- sheet 7: heart LARGE (light → dark + thorns), reflection ----------------
    (L, u) => {
      bg(L);
      const dk = E.ep(u, 5, 8);
      E.props.heartLight(L, 540, 560, 330, { t: u, glow: 0.95 - 0.4 * dk, dark: dk, thorns: E.ep(u, 6, 9.5) });
      E.wash(L.paint, E.rrect(0, 1150, 1080, 770, 0), '#6F97BE', { alpha: 0.75 });
      E.wash(L.paint, E.rrect(0, 1150, 1080, 160, 0), '#5D84AE', { alpha: 0.4, soft: 20 });
      E.props.heartLight(L, 540, 1500, 260, { t: u, reflection: true, glow: 0.9 });
    },
    // ---------------- sheet 8: nakis LARGE on a mirror globe ----------------
    (L, u) => {
      bg(L);
      const globe = new Path2D(); globe.arc(540, 820, 500, 0, Math.PI * 2);
      E.wash(L.paint, globe, '#CDD5E0', { mode: 'over' });
      E.wash(L.paint, globe, '#8E9BB3', { grad: { from: [420, 680], r: 640, c2: '#6E7C98' }, alpha: 0.55 });
      E.props.nakis(L, 540, 820, 560, { reveal: E.ep(u, 0.3, 7, 'inOutSine'), t: u, glow: 0.8, clip: globe });
      E.pencil(L.ink, globe, { a: 0.4 });
      E.props.nakis(L, 270, 1580, 220, { reveal: 1, t: u, seed: 2 });
      E.props.nakis(L, 800, 1580, 220, { reveal: E.ep(u, 1, 5), t: u, night: 1, color: '#E8C677' });
    },
    // ---------------- sheet 9: book LARGE ----------------
    (L, u) => {
      bg(L);
      E.props.book(L, 540, 700, 470, 600, { open: E.ep(u, 0.3, 2), t: u, glow: E.ep(u, 1.5, 3) * 0.9, pages: E.seg(u, 2, 4.6),
        flip: E.ep(u, 4.7, 6) + E.ep(u, 8.4, 9.6), pages2: u < 8.4 ? E.seg(u, 6, 8.3) : 0 });
      E.props.book(L, 300, 1500, 300, 380, { open: 0, t: u });
      E.props.book(L, 780, 1500, 300, 380, { open: 0.5, t: u });
    },
    // ---------------- sheet 10: page + pen LARGE, writing ----------------
    (L, u) => {
      bg(L);
      E.props.page(L, 540, 760, 860, 1080, { rot: -0.03, t: u, border: E.ep(u, 0.2, 3), lines: E.ep(u, 2.5, 4), glow: 0.6, curl: E.ep(u, 8, 9.5) * 0.6, lift: 0 });
      const lines = [];
      for (let i = 0; i < 6; i++) lines.push(E.props.scriptLine(790, 520 + i * 90, 300, { size: 40, seed: 11 + i }));
      let head = null;
      lines.forEach((st, i) => { const pp = E.seg(u, 4 + i * 0.6, 4.6 + i * 0.6); if (pp > 0) { const h2 = E.props.inkWrite(L, st, pp, { width: 11, seed: i }); if (pp < 1 && h2) head = h2; } });
      const hp = head || [810, 470];
      E.props.reedPen(L, hp[0], hp[1], 560, { angle: -1.0, ink: 1, glow: 0.5, t: u });
    },
    // ---------------- sheet 11: night — lantern, statue, calligraphy, hourglass LARGE ----------------
    (L, u) => {
      bg(L, 1);
      E.props.lantern(L, 250, 0, 600, { t: u, lit: 1, chain: 110 });
      E.props.pedestal(L, 770, 900, 320, 260, { seed: 3, night: 0.7 });
      E.props.statue(L, { x: 770, y: 900, h: 540, view: 'front', pose: E.man.pose.fStand() }, { p: 1, grow: E.ep(u, 0.5, 4), seed: 3, night: 0.7 });
      E.props.calligraphyFrame(L, 540, 1330, 940, 250, { reveal: E.ep(u, 0.3, 3), t: u, night: 1 });
      E.props.hourglass(L, 200, 1890, 330, { t: u, sand: 0.12, flow: 1, night: 1, glow: 0.5 });
      E.props.mirror(L, 560, 1890, 330, { t: u, night: 1, shine: ((u + 1) % 5) / 4, reflectAlpha: 1 - E.ep(u, 4, 7), reflect: (L2, r) => {
        E.man.draw(L2, { x: r.x + r.w * 0.5, y: r.y + r.h * 0.97, h: r.h * 0.8, view: 'front', pose: E.man.pose.fStand(), tint: '#34497A', tintAmt: 0.45 });
      } });
      label(L, 'reflectAlpha', 560, 1910, 26);
      E.props.lantern(L, 900, 1500, 160, { t: u + 2, lit: 0.8, night: 1, chain: 60 });
    },
  ];

  E.scene('_props_b', {
    draw(L, lt) {
      const i = Math.max(0, Math.min(sheets.length - 1, Math.floor(lt / 10)));
      sheets[i](L, lt - i * 10);
    },
  });
})();
