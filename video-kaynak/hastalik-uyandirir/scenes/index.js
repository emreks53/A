// Sahne zaman çizelgesi. Her sahne kendi dosyasında (scenes/sNN.js): { init?, draw(ctx, t, lt, sc), sfx? }.
// Zamanlar ses kaydındaki duraklara oturtuldu (timing.json). trans: önceki sahneden bu sahneye geçiş.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../engine/core');

const LIST = [
  { id: 's01', start: 0.0, end: 2.6, title: 'Ey tahammülsüz hasta!' },
  { id: 's02', start: 2.6, end: 7.1, title: 'İnsan bu dünyaya keyif sürmek ve lezzet almak için gelmediğine,', trans: { type: 'paint', dur: 0.7, dir: 1 } },
  { id: 's03', start: 7.1, end: 9.9, title: 'mütemadiyen gelenlerin gitmesi', trans: { type: 'cut' } },
  { id: 's04', start: 9.9, end: 12.5, title: 've gençlerin ihtiyarlaşması', trans: { type: 'paint', dur: 0.6, dir: 1, seed: 6 } },
  { id: 's05', start: 12.5, end: 17.3, title: 've mütemadiyen zeval ve firakta yuvarlanması şahittir.', trans: { type: 'paint', dur: 0.6, dir: -1, seed: 5 } },
  { id: 's06', start: 17.3, end: 22.1, title: 'Hem insan, zîhayatın en mükemmeli en yükseği', trans: { type: 'paint', dur: 0.8, dir: 1, seed: 8 } },
  { id: 's07', start: 22.1, end: 24.3, title: 've cihazatça en zengini', trans: { type: 'cut' } },
  { id: 's08', start: 24.3, end: 27.3, title: 'belki zîhayatların sultanı hükmünde iken,', trans: { type: 'cut' } },
  { id: 's09', start: 27.3, end: 32.0, title: 'geçmiş lezzetleri ve gelecek belaları düşünmek vasıtasıyla,', trans: { type: 'paint', dur: 0.7, dir: -1, seed: 11 } },
  { id: 's10', start: 32.0, end: 35.5, title: 'hayvana nisbeten en edna bir derecede', trans: { type: 'cut' } },
  { id: 's11', start: 35.5, end: 39.6, title: 'ancak kederli, meşakkatli bir hayat geçiriyor.', trans: { type: 'paint', dur: 0.6, dir: -1, seed: 12 } },
  { id: 's12', start: 39.6, end: 48.2, title: 'Demek insan, bu dünyaya yalnız güzel yaşamak için ve rahatla ve safa ile ömür geçirmek için gelmemiştir.', trans: { type: 'paint', dur: 0.8, dir: 1, seed: 14 } },
  { id: 's13', start: 48.2, end: 51.7, title: 'Belki azîm bir sermaye elinde bulunan insan,', trans: { type: 'cut' } },
  { id: 's14', start: 51.7, end: 58.5, title: 'burada ticaret ile ebedî daimî bir hayatın saadetine çalışmak için gelmiştir.', trans: { type: 'cut' } },
  { id: 's15', start: 58.5, end: 62.5, title: 'Onun eline verilen sermaye de ömürdür.', trans: { type: 'paint', dur: 0.7, dir: -1, seed: 17 } },
  { id: 's16', start: 62.5, end: 71.5, title: 'Eğer hastalık olmazsa sıhhat ve âfiyet gaflet verir, dünyayı hoş gösterir, âhireti unutturur.', trans: { type: 'paint', dur: 0.8, dir: 1, seed: 19 } },
  { id: 's17', start: 71.5, end: 74.8, title: 'Kabri ve ölümü hatırına getirmek istemiyor,', trans: { type: 'cut' } },
  { id: 's18', start: 74.8, end: 79.7, title: 'sermaye-i ömrünü bâd-i heva boş yere sarf ettiriyor.', trans: { type: 'paint', dur: 0.6, dir: 1, seed: 21 } },
  { id: 's19', start: 79.7, end: 83.3, title: 'Hastalık ise birden gözünü açtırır.', trans: { type: 'cut' } },
  { id: 's20', start: 83.3, end: 85.7, title: 'Vücuduna ve cesedine der ki:', trans: { type: 'cut' } },
  { id: 's21', start: 85.7, end: 90.5, title: '"Lâyemut değilsin, başıboş değilsin, bir vazifen var.', trans: { type: 'cut' } },
  { id: 's22', start: 90.5, end: 93.8, title: 'Gururu bırak, seni yaratanı düşün,', trans: { type: 'cut' } },
  { id: 's23', start: 93.8, end: 97.6, title: 'kabre gideceğini bil, öyle hazırlan."', trans: { type: 'paint', dur: 0.5, dir: -1, seed: 25 } },
  { id: 's24', start: 97.6, end: 105.6, title: 'İşte hastalık bu nokta-i nazardan hiç aldatmaz bir nâsih ve ikaz edici bir mürşiddir.', trans: { type: 'paint', dur: 0.9, dir: 1, seed: 23 } },
  { id: 's25', start: 105.6, end: 110.5, title: 'Ondan şekva değil belki bu cihette ona teşekkür etmek,', trans: { type: 'paint', dur: 0.7, dir: -1, seed: 29 } },
  { id: 's26', start: 110.5, end: 114.7, title: 'eğer fazla ağır gelse sabır istemek gerektir.', trans: { type: 'dissolve', dur: 0.5 } },
  { id: 's27', start: 114.7, end: 122.0, title: 'Kaynak: Risale-i Nur · Lem’alar · Yirmi Beşinci Lem’a · 240. Sayfa', trans: { type: 'dissolve', dur: 1.0 } },
];
const END = LIST[LIST.length - 1].end;

function placeholder(meta) {
  const G = require('../engine/gloss');
  return {
    draw(ctx, t, lt) {
      G.loadFonts();
      const r = C.rng(meta.id);
      ctx.fillStyle = C.mix('#2457B8', '#E2582E', r.next()); ctx.fillRect(0, 0, C.W, C.H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '64px "Garamond SemiBold"';
      ctx.fillText(meta.id, C.W / 2, 600);
      ctx.font = '40px "Garamond Italic"';
      const words = meta.title.split(' '); let line = '', y = 760;
      for (const w of words) { if (ctx.measureText(line + w).width > 900) { ctx.fillText(line, C.W / 2, y); y += 56; line = ''; } line += w + ' '; }
      ctx.fillText(line, C.W / 2, y);
      ctx.fillText(`${lt.toFixed(2)} s`, C.W / 2, y + 120);
    },
  };
}

const SCENES = LIST.map((m) => {
  const f = path.join(__dirname, m.id + '.js');
  let mod = null;
  if (fs.existsSync(f)) {
    try { mod = require(f); } catch (e) { console.error(`[${m.id}] yüklenemedi: ${e.message}`); mod = placeholder(Object.assign({}, m, { title: 'HATA: ' + e.message })); }
  } else mod = placeholder(m);
  return Object.assign({}, m, mod, { start: m.start, end: m.end, id: m.id, trans: m.trans || mod.trans });
});

// t anında görünen sahne(ler): geçiş penceresinde [önceki, sonraki(p)]
function active(t) {
  t = C.clamp(t, 0, END - 1e-6);
  let i = SCENES.findIndex((s) => t >= s.start && t < s.end);
  if (i < 0) i = SCENES.length - 1;
  const cur = SCENES[i];
  const nxt = SCENES[i + 1];
  // geçişin yarısı önceki sahnenin sonunda, yarısı sonrakinin başında
  if (nxt && nxt.trans && nxt.trans.dur && t > nxt.start - nxt.trans.dur / 2) {
    return [{ sc: cur }, { sc: nxt, p: (t - (nxt.start - nxt.trans.dur / 2)) / nxt.trans.dur }];
  }
  if (cur.trans && cur.trans.dur && t < cur.start + cur.trans.dur / 2 && i > 0) {
    return [{ sc: SCENES[i - 1] }, { sc: cur, p: (t - (cur.start - cur.trans.dur / 2)) / cur.trans.dur }];
  }
  return [{ sc: cur }];
}
function byId(id) { return SCENES.find((s) => s.id === id); }

// son işlem ayarı: kaynak sahnesinde (gerçekçi fotoğraf) tuval dokusu ve saten parlama kalkar
function finishOpts(t) {
  const s27 = LIST[LIST.length - 1];
  const p = C.clamp((t - (s27.start - 0.5)) / 1.0);
  return { weave: 0.32 * (1 - p), sheen: 1 - p, vignette: 0.8 * (1 - p) };
}

module.exports = { SCENES, LIST, END, active, byId, finishOpts };
