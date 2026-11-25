// Ses efekti işaretleri (tek yer): sfx(zaman sn, tür, kazanç dB, ek). tools/sfx-list.mjs → data/sfx.json → tools/sfx.py
// Müzik yok: ezgi, akortlu zil/çan, basamaklı yükselen perde dizisi, tonlu zemin yok. Hepsi gürültüden (fırça, kâğıt,
// hava, su, yaprak). Konuşma her zaman baskın; sfx.py efektleri konuşma altında kısar ve sonda -14 LUFS'e getirir.
// Kazanç: dokunuş/geçiş türlerinde ≈ tepe dBFS; zemin türlerinde (air, air-dusk, room-warm, air-soft, paradise,
// room-window, water) kanal başı RMS = -20 dBFS + kazanç. Zamanlar karelerde görülen olaya göre (kelime: data/baslangic.json).
// Kümelerdeki küçük zaman/kazanç/bant sapmaları elle verilmiştir (belirlenimci; düzenli ritim ya da perde dizisi oluşmasın).
'use strict';
(() => {
  // ---------------- zeminler (çok kısık, konuşma altında ayrıca kısılır)
  sfx(0.02, 'air', -25, { dur: 10.96, a: 0.45, r: 0.55 });         // Perde 1: sabah çayırı (dalış 10.38-10.98'de söner)
  sfx(10.92, 'room-warm', -25, { dur: 4.95, a: 0.3, r: 0.3 });     // Perde 2: sıcak iç mekân (3. perdeye geçiş 15.59-15.87)
  sfx(15.55, 'air-dusk', -24, { dur: 1.9, a: 0.35, r: 0.25 });     // Perde 3: akşam esintisi (silmeyle biter)
  sfx(17.25, 'air-soft', -27, { dur: 10.35, a: 0.3, r: 0.5 });     // Perde 4: soyut zemin, yumuşak hava
  sfx(27.55, 'paradise', -26, { dur: 9.25, a: 1.0, r: 0.3 });      // Perde 5: cennet havası (fotoğraf 36.77'de tam örter)
  sfx(28.45, 'water', -18, { dur: 8.35, a: 0.9, r: 0.3 });         // ırmak (28.53'te görünür) → ziyafet sonuna dek
  sfx(33.05, 'water', -21, { dur: 3.75, a: 0.25, r: 0.3, close: 1 }); // ziyafet (33.12-33.25 belirir): öndeki dere, daha yakın
  sfx(36.50, 'room-window', -18, { dur: 4.92, a: 0.35, r: 0.67 }); // Perde 6: oda + pencere havası, 40.75-41.42 kararmayla söner

  // ---------------- Perde 1 — Dünya
  // açılış: kuru fırça darbeleri t=0'da zaten yolda, 0.00-0.38 boyunca astarı örter
  sfx(0.0, 'brush', -20, { dur: 0.15 }); sfx(0.08, 'brush-big', -19, { dur: 0.2 }); sfx(0.175, 'brush', -21, { dur: 0.18 }); sfx(0.265, 'brush', -23, { dur: 0.14 });
  sfx(2.45, 'whoosh-soft', -21, { dur: 1.6 });                     // kamera geri/yukarı (2.42-4.08)
  // madalyonlar belirir (st = 4.18 + i·0.09; karede görünür st+0.05, tam boy st+0.10): yumuşak boya dokunuşları
  [[4.29, -25, 1150], [4.385, -27.5, 820], [4.47, -26, 1380], [4.565, -28.5, 950], [4.655, -25.5, 1240], [4.745, -28, 760]]
    .forEach(([t, g, fc]) => sfx(t, 'dab', g, { fc }));
  sfx(9.45, 'brush-ring', -25, { dur: 0.5 });                      // nar madalyonuna fırçayla halka (9.45-9.93)
  sfx(10.38, 'whoosh-in', -19, { dur: 0.62, peak: 0.85 });         // hızlanan dalış, krem kare ~10.97
  // ---------------- Perde 2 — Lezzet
  sfx(10.97, 'whoosh-out', -23, { dur: 0.85 });                    // sofra sahnesi belirir (10.97-11.14), kamera geri çekilir
  // ---------------- Perde 3 — Fânilik
  sfx(15.4, 'leaves', -31, { dur: 2.0 });                          // ağaç tacından birkaç yaprak süzülür (15.1-17.4)
  // ---------------- Perde 4 — Nimetler ve vücut
  sfx(17.24, 'brush-big', -20, { dur: 0.22 }); sfx(17.31, 'brush', -21, { dur: 0.17 }); sfx(17.385, 'brush', -23, { dur: 0.15 }); // silme (17.23-17.50)
  sfx(17.47, 'brush', -28, { dur: 0.34 });                         // adam ayaktan başa boyanır (17.47-17.80)
  // nimetler belirir (st = 17.62 + i·0.085, görünür st+0.05): 11 nimetin 6'sına düzensiz dokunuş
  [[17.70, -27.5, 900], [17.87, -29.5, 1300], [17.955, -28.5, 780], [18.125, -30.5, 1100], [18.38, -29, 1450], [18.55, -31, 850]]
    .forEach(([t, g, fc]) => sfx(t, 'dab', g, { fc }));
  sfx(18.27, 'airy', -30, { dur: 0.9 });                           // ihsas: noktalı yaylar duyulara akar
  sfx(18.94, 'breath', -32, { dur: 0.65 });                        // ifaza: nimetlerden küçük kopyalar taşar
  sfx(20.38, 'whoosh-down', -25, { dur: 1.0, peak: 0.45 });        // tarama çizgisi yukarıdan aşağı, zemin çivit (20.38-21.38)
  // duyu madalyonları (görünür 22.37 / 22.50 / 22.63 / 22.73 / 22.87): keçe dokunuşu, burun sessiz (düzenli ritim olmasın)
  [[22.425, -29], [22.548, -31], [22.792, -30], [22.897, -32]].forEach(([t, g]) => sfx(t, 'tap', g));
  // kalp: görüntüdeki nabızlar tHis+0.25 / +0.62 / +1.3 (tHis = 22.934)
  sfx(23.175, 'heart', -21, { v: 'lub', pan: 0 }); sfx(23.545, 'heart', -24, { v: 'dub', pan: 0 }); sfx(24.225, 'heart', -25, { v: 'lub', pan: 0 });
  sfx(24.73, 'sweep', -31, { dur: 1.0 });                          // aza: uzuvlarda ışık süpürmesi (24.73-25.73)
  // aletler nimetlerine bağlanır (nimet parlar: 25.71 / 25.87 / 26.03 / 26.19 / 26.35): kısa fırça
  [[25.668, -30], [25.84, -32.5], [25.99, -31], [26.162, -33], [26.31, -32]].forEach(([t, g]) => sfx(t, 'flick', g));
  sfx(27.45, 'rise', -22, { dur: 2.0 });                           // yukarı yükseliş (27.38-29.6, hız tepesi ~28.5)
  // ---------------- Perde 5 — Âhiret
  sfx(28.2, 'airy', -29, { dur: 0.85 });                           // öndeki bulut kütleleri hızla geçer (28.2-29.0)
  sfx(32.45, 'whoosh-in', -26, { dur: 0.8, peak: 0.8 });           // revağa hızlanan dalış (32.45-33.25)
  sfx(33.45, 'foliage', -31, { dur: 1.7 });                        // dal salkımlarını indirir (33.5-34.95)
  // ---------------- Perde 6 — Kaynak
  sfx(36.52, 'brush', -24, { dur: 0.16 }); sfx(36.585, 'brush-big', -23, { dur: 0.2 }); sfx(36.66, 'brush', -26, { dur: 0.15 }); // fotoğraf açılır (36.53-36.77)
  sfx(37.0, 'paper', -36, { dur: 0.45 });                          // kaynak yazısı belirirken (37.05) kâğıda çok hafif dokunuş
})();
