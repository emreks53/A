/* Shot list and gloss (modern-Turkish meaning) list.
   Shot boundaries sit in the breathing pauses of the narration. A shot's `trans` describes how it
   enters: the previous shot keeps rendering (past its nominal end) for `dur` seconds while this one
   comes in.
   Glosses appear GLOSS_LEAD seconds before the first phoneme of the word (forced-aligned onset). */
(function () {
  const E = window.E;

  E.TOTAL = 100.0; // seconds (narration ends 93.87, photoreal ending to 100)

  E.SHOTS = [
    { id: 's01', start: 0.0,   trans: null },
    { id: 's02', start: 2.55,  trans: { type: 'zoom', dur: 0.75, cx: 540, cy: 1010 } },
    { id: 's03', start: 5.85,  trans: { type: 'bleed', dur: 0.8, cx: 300, cy: 400 } },
    { id: 's04', start: 10.35, trans: { type: 'zoom', dur: 0.7, cx: 540, cy: 760 } },
    { id: 's05', start: 14.85, trans: { type: 'cut' } },
    { id: 's06', start: 18.75, trans: { type: 'cut' } },
    { id: 's07', start: 24.7,  trans: { type: 'bleed', dur: 0.9, cx: 700, cy: 800 } },
    { id: 's08', start: 31.55, trans: { type: 'cut' } },
    { id: 's09', start: 36.7,  trans: { type: 'bleed', dur: 0.8, cx: 540, cy: 800 } },
    { id: 's10', start: 44.65, trans: { type: 'cut' } },
    { id: 's11', start: 47.65, trans: { type: 'bleed', dur: 1.0, cx: 540, cy: 300 } },
    { id: 's12', start: 53.6,  trans: { type: 'cut' } },
    { id: 's13', start: 58.45, trans: { type: 'cut' } },
    { id: 's14', start: 63.75, trans: { type: 'bleed', dur: 0.8, cx: 540, cy: 1100 } },
    { id: 's15', start: 67.7,  trans: { type: 'fade', dur: 0.45 } },
    { id: 's16', start: 72.65, trans: { type: 'bleed', dur: 0.8, cx: 540, cy: 900 } },
    { id: 's17', start: 77.45, trans: { type: 'bleed', dur: 0.7, cx: 790, cy: 700 } },
    { id: 's18', start: 82.45, trans: { type: 'cut' } },
    { id: 's19', start: 86.4,  trans: { type: 'cut' } },
    { id: 's20', start: 90.55, trans: { type: 'fade', dur: 0.5 } },
    { id: 'end', start: 94.35, trans: { type: 'fade', dur: 1.0 } },
  ];
  E.SHOTS.forEach((s, i) => {
    const next = E.SHOTS[i + 1];
    s.end = next ? next.start : E.TOTAL;
    s.dur = s.end - s.start;
    // how long past its end this shot must keep rendering (while the next one transitions in)
    s.tail = next && next.trans && next.trans.type !== 'cut' ? next.trans.dur || 0 : 0;
  });

  E.GLOSS_LEAD = 0.05;

  /* from/to: word index range in E.WORDS that the meaning belongs to.
     tone: 'light' text for dark backgrounds. y: optional centre line override. */
  E.GLOSSES = [
    { from: 4, to: 4, text: 'konaklama yeridir' },
    { from: 9, to: 10, text: 'boy aynasıdır' },
    { from: 33, to: 33, text: 'sayfadır' },
    { from: 38, to: 40, text: 'amel defterimize' },
    { from: 59, to: 59, text: 'geçici' },
    { from: 60, to: 60, text: 'sonlu' },
    { from: 70, to: 70, text: 'ayna' },
    { from: 76, to: 80, text: 'Allah’ın isimlerinin nakışlarına' },
    { from: 83, to: 85, text: 'isimlerin yansımasına' },
    { from: 86, to: 87, text: 'geçer' },
    { from: 95, to: 95, text: 'geçici' },
    { from: 99, to: 100, text: 'anlayıp' },
    { from: 103, to: 103, text: 'şiddetli' },
    { from: 110, to: 110, text: 'hislerimizi' },
    { from: 114, to: 114, text: 'meyvesi' },
    { from: 118, to: 118, text: 'âhirete ait' },
    { from: 119, to: 119, text: 'faydalarına' },
    { from: 128, to: 129, text: 'dönüşür', hold: 67.85 },   // gone before the night ink floods in (s15)
    { from: 131, to: 136, text: 'Allah’ı unuttular, Allah da onlara kendilerini unutturdu; işte onlar fasıklardır',
      tone: 'light', verse: true, hold: 74.35 },
    { from: 138, to: 139, text: 'sahip olup', tone: 'light' },
    { from: 143, to: 143, text: 'yok oluşunu', tone: 'light' },
    { from: 149, to: 149, text: 'genel', tone: 'light' },
    { from: 155, to: 155, text: 'ölümsüz', tone: 'light' },
    { from: 160, to: 160, text: 'şiddetli', tone: 'light' },
    { from: 161, to: 162, text: 'hisler', tone: 'light' },
  ];
})();
