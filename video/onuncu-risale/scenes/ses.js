// Ses efekti işaretleri (tek yer): sfx(zaman sn, tür, kazanç dB, ek). tools/sfx-list.mjs → data/sfx.json → tools/sfx.py
// Müzik yok: ezgi, akortlu zil/çan, basamaklı yükselen perde dizisi, tonlu zemin yok. Hepsi gürültüden (fırça, kâğıt,
// hava, su, yaprak). Konuşma her zaman baskın; sfx.py efektleri konuşma altında kısar ve sonda -14 LUFS'e getirir.
// Kazanç: dokunuş/geçiş türlerinde ≈ tepe dBFS; zemin türlerinde (air, air-dusk, room-warm, air-soft, paradise,
// room-window, water) kanal başı RMS = -20 dBFS + kazanç. Zamanlar karelerde görülen olaya göre (kelime: data/baslangic.json).
// Kümelerdeki küçük zaman/kazanç/bant sapmaları elle verilmiştir (belirlenimci; düzenli ritim ya da perde dizisi oluşmasın).
'use strict';
(() => {
  // ---------------- zeminler (çok kısık, konuşma altında ayrıca kısılır)
  sfx(0.10, 'air', -25, { dur: 10.85, a: 0.5, r: 0.55 });          // Perde 1: sabah çayırı (dalışta söner)
  sfx(10.90, 'room-warm', -25, { dur: 4.85, a: 0.3, r: 0.35 });    // Perde 2: sıcak iç mekân (sofra)
  sfx(15.45, 'air-dusk', -24, { dur: 2.0, a: 0.3, r: 0.25 });      // Perde 3: akşam esintisi (silmeyle biter)
  sfx(17.25, 'air-soft', -27, { dur: 10.35, a: 0.3, r: 0.5 });     // Perde 4: soyut zemin, yumuşak hava
  sfx(27.55, 'paradise', -26, { dur: 9.2, a: 1.0, r: 0.2 });       // Perde 5: cennet havası
  sfx(28.45, 'water', -18, { dur: 8.3, a: 0.9, r: 0.25 });         // ırmak (28.53'te görünür) → ziyafet sonuna dek
  sfx(32.95, 'water', -21, { dur: 3.8, a: 0.25, r: 0.2, close: 1 }); // ziyafet: öndeki dere, daha yakın
  sfx(36.50, 'room-window', -18, { dur: 5.0, a: 0.35, r: 0.45 });  // Perde 6: oda + pencere havası, 41.05-41.5 kararmayla söner

  // ---------------- Perde 1 — Dünya
  sfx(0.11, 'brush', -18, { dur: 0.17 }); sfx(0.19, 'brush-big', -19, { dur: 0.2 }); sfx(0.275, 'brush', -22, { dur: 0.15 }); // açılış darbeleri (kareler 0.13-0.37)
  sfx(2.45, 'whoosh-soft', -21, { dur: 1.6 });                     // kamera geri/yukarı (2.42-4.08)
  // madalyonlar belirir (st = 4.18 + i·0.09; görünür st+0.05): yumuşak boya dokunuşları
  [[4.29, -27, 1150], [4.385, -29.5, 820], [4.47, -28, 1380], [4.565, -30.5, 950], [4.655, -27.5, 1240], [4.745, -30, 760]]
    .forEach(([t, g, fc]) => sfx(t, 'dab', g, { fc }));
  sfx(9.45, 'brush-ring', -25, { dur: 0.5 });                      // nar madalyonuna fırçayla halka (9.45-9.93)
  sfx(10.40, 'whoosh-in', -19, { dur: 0.8 });                      // madalyona dalış
  // ---------------- Perde 2 — Lezzet
  sfx(10.95, 'whoosh-out', -23, { dur: 0.9 });
  sfx(14.55, 'leaves', -31, { dur: 2.8 });                         // sararan yapraklar düşer (14.5 → 17.4)
  // ---------------- Perde 4 — Nimetler ve vücut
  sfx(17.24, 'brush-big', -20, { dur: 0.22 }); sfx(17.31, 'brush', -21, { dur: 0.17 }); sfx(17.385, 'brush', -23, { dur: 0.15 }); // silme (17.23-17.47)
  // nimetler belirir (st = 17.62 + i·0.085): 11 nimetin 6'sına düzensiz dokunuş
  [[17.70, -30, 900], [17.87, -32, 1300], [17.955, -31, 780], [18.125, -33, 1100], [18.38, -31.5, 1450], [18.55, -33.5, 850]]
    .forEach(([t, g, fc]) => sfx(t, 'dab', g, { fc }));
  sfx(18.27, 'airy', -30, { dur: 0.9 });                           // ihsas: noktalı yaylar
  sfx(20.43, 'whoosh-deep', -24, { dur: 1.2 });                    // zemin çivit, şemaya geçiş
  // duyu madalyonları (görünür 22.37 / 22.50 / 22.63 / 22.73 / 22.87): keçe dokunuşu, burun sessiz (düzenli ritim olmasın)
  [[22.425, -31], [22.548, -33], [22.792, -32], [22.897, -34]].forEach(([t, g]) => sfx(t, 'tap', g));
  // kalp: görüntüdeki nabızlar tHis+0.25 / +0.62 / +1.3 (tHis = 22.934)
  sfx(23.175, 'heart', -21, { v: 'lub', pan: 0 }); sfx(23.545, 'heart', -24, { v: 'dub', pan: 0 }); sfx(24.225, 'heart', -25, { v: 'lub', pan: 0 });
  sfx(24.73, 'sweep', -31, { dur: 0.9 });                          // aza: uzuvlarda ışık süpürmesi
  // aletler nimetlerine bağlanır (nimet parlar: 25.71 / 25.87 / 26.03 / 26.19 / 26.35): kısa fırça
  [[25.668, -30], [25.84, -32.5], [25.99, -31], [26.162, -33], [26.31, -32]].forEach(([t, g]) => sfx(t, 'flick', g));
  sfx(27.45, 'rise', -22, { dur: 2.0 });                           // yukarı yükseliş
  // ---------------- Perde 5 — Âhiret
  sfx(28.15, 'airy', -30, { dur: 1.3 });                           // bulut kuşağından geçiş
  sfx(32.60, 'whoosh-in', -27, { dur: 0.7 });                      // revağa dalış (ziyafet 33.05)
  sfx(33.45, 'foliage', -31, { dur: 1.7 });                        // dal salkımlarını indirir (33.5-34.95)
  // ---------------- Perde 6 — Kaynak
  sfx(36.52, 'brush', -24, { dur: 0.16 }); sfx(36.585, 'brush-big', -23, { dur: 0.2 }); sfx(36.66, 'brush', -26, { dur: 0.15 }); // fotoğraf açılır (36.53-36.77)
  sfx(37.0, 'paper', -36, { dur: 0.45 });                          // kaynak yazısı belirirken kâğıda çok hafif dokunuş
})();
