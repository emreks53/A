// Oku akışının video listesi: content/oku/videolar.json derleme anında denetlenir ve "virtual:oku-videolar"
// modülü olarak uygulamaya verilir. Her video için ayrıca paylaşım sayfası (v/<id>/index.html) üretilir:
// "Neşret" ile paylaşılan bağlantı bu sayfadır; mesajlaşma uygulamaları önizlemeyi buradan çizer, sayfa da
// ziyaretçiyi hemen uygulamadaki videoya (#/oku/<id>) yönlendirir.
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { etiketYazisi, KULLIYAT, menbaYazisi, paylasimAdresi, tipografik, type Video } from '../src/oku/ortak.ts';

export type { Video };

const SANAL = 'virtual:oku-videolar';
const COZULMUS = '\0' + SANAL;
const KIMLIK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Akis {
  /** Sitenin kök adresi, "/" ile biter; paylaşım bağlantıları buna göre kurulur */
  site: string;
  videolar: Video[];
}

function hata(dosya: string, mesaj: string): never {
  throw new Error(`[oku-videolar] ${dosya}: ${mesaj}`);
}

function metin(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * MP4 dosyasının süresi (saniye): "moov" kutusundaki "mvhd" başlığından okunur. Hızlı başlatmalı (+faststart)
 * dosyada moov baştadır; değilse dosyanın sonuna kadar bakılır. Bulunamazsa null.
 */
export function mp4Suresi(yol: string): number | null {
  const fd = openSync(yol, 'r');
  try {
    const boyut = statSync(yol).size;
    const oku = (konum: number, uzunluk: number) => {
      const b = Buffer.alloc(uzunluk);
      readSync(fd, b, 0, uzunluk, konum);
      return b;
    };
    // Kutuları [bas, son) aralığında gezer; istenen türdeki ilk kutunun içeriğinin başını ve sonunu verir.
    const bul = (tur: string, bas: number, son: number): [number, number] | null => {
      let k = bas;
      while (k + 8 <= son) {
        const b = oku(k, 16);
        let uzunluk = b.readUInt32BE(0);
        const ad = b.toString('latin1', 4, 8);
        let baslik = 8;
        if (uzunluk === 1) {
          uzunluk = Number(b.readBigUInt64BE(8));
          baslik = 16;
        } else if (uzunluk === 0) uzunluk = son - k;
        if (uzunluk < baslik) return null;
        if (ad === tur) return [k + baslik, k + uzunluk];
        k += uzunluk;
      }
      return null;
    };
    const moov = bul('moov', 0, boyut);
    const mvhd = moov && bul('mvhd', moov[0], moov[1]);
    if (!mvhd) return null;
    const b = oku(mvhd[0], 32);
    const surum = b.readUInt8(0);
    const olcek = surum === 1 ? b.readUInt32BE(20) : b.readUInt32BE(12);
    const sure = surum === 1 ? Number(b.readBigUInt64BE(24)) : b.readUInt32BE(16);
    // Süresi yazılmamış (parçalı, ör. empty_moov) MP4'te süre 0 ya da "bilinmiyor"dur: geçerli sayılmaz.
    const bilinmiyor = sure === 0 || (surum === 0 && sure === 0xffffffff);
    return olcek > 0 && !bilinmiyor ? sure / olcek : null;
  } finally {
    closeSync(fd);
  }
}

export function akisOku(jsonYolu: string, publicDizini: string): Akis {
  let ham: unknown;
  try {
    ham = JSON.parse(readFileSync(jsonYolu, 'utf8'));
  } catch (e) {
    hata(jsonYolu, `okunamadı ya da geçerli JSON değil (${(e as Error).message})`);
  }
  const a = ham as { site?: unknown; videolar?: unknown };
  if (!metin(a.site) || !/^https:\/\/[^\s]+\/$/.test(a.site)) hata(jsonYolu, '"site" https:// ile başlayıp "/" ile biten bir adres olmalı');
  if (!Array.isArray(a.videolar) || !a.videolar.length) hata(jsonYolu, '"videolar" boş olmayan bir liste olmalı');
  const kitaplar: readonly string[] = KULLIYAT;

  const kimlikler = new Set<string>();
  const videolar = a.videolar.map((x, i): Video => {
    const v = x as Record<string, unknown>;
    const yer = `videolar[${i}]`;
    if (!metin(v.id) || !KIMLIK.test(v.id)) hata(jsonYolu, `${yer}.id küçük harf, rakam ve tireden oluşmalı (ör. "ihlas")`);
    if (kimlikler.has(v.id)) hata(jsonYolu, `"${v.id}" kimliği iki kez kullanılmış`);
    kimlikler.add(v.id);
    if (!metin(v.baslik)) hata(jsonYolu, `${yer}.baslik gerekli (geçtiği yer, ör. "On Yedinci Lem'a'dan")`);
    if (!metin(v.kitap) || !kitaplar.includes(v.kitap)) hata(jsonYolu, `${yer}.kitap Risale-i Nur Külliyatı'ndan biri olmalı: ${KULLIYAT.join(', ')}`);
    if (!metin(v.bolum)) hata(jsonYolu, `${yer}.bolum gerekli (kitaptaki bölüm, ör. "On Yedinci Lem'a")`);
    if (v.kisim !== undefined && !metin(v.kisim)) hata(jsonYolu, `${yer}.kisim metin olmalı (ör. "Altıncı Mesele")`);
    if (v.sayfa !== undefined && !(Number.isInteger(v.sayfa) && (v.sayfa as number) > 0)) hata(jsonYolu, `${yer}.sayfa pozitif bir tam sayı olmalı`);
    const et = v.etiketler;
    if (!Array.isArray(et) || et.length !== 3) hata(jsonYolu, `${yer}.etiketler tam üç etiket olmalı (ör. ["ihlas", "muhabbet", "kurtuluş"])`);
    for (const e of et) {
      if (!metin(e) || /[#\s]/.test(e) || e !== e.toLocaleLowerCase('tr')) hata(jsonYolu, `${yer}.etiketler: "${String(e)}" küçük harfle, boşluksuz ve "#" olmadan yazılmalı`);
    }
    if (new Set(et).size !== 3) hata(jsonYolu, `${yer}.etiketler birbirinden farklı olmalı`);
    for (const alan of ['video', 'kapak', 'onizleme'] as const) {
      const yol = v[alan];
      if (!metin(yol) || yol.startsWith('/') || yol.includes('..')) hata(jsonYolu, `${yer}.${alan} public/ altına göre bir yol olmalı`);
      // (paylaşım sayfasındaki adreslerde ve çevrimdışı önbellekte sorun çıkmasın: yalnız güvenli karakterler)
      if (!/^[a-z0-9][a-z0-9._/-]*$/.test(yol)) hata(jsonYolu, `${yer}.${alan}: "${yol}" yalnız küçük harf, rakam, "-", "_", "." ve "/" içermeli`);
      if (!existsSync(resolve(publicDizini, yol))) hata(jsonYolu, `${yer}.${alan}: public/${yol} bulunamadı`);
    }
    if (v.kunye !== undefined && (!Array.isArray(v.kunye) || !v.kunye.every(metin))) hata(jsonYolu, `${yer}.kunye metinlerden oluşan bir liste olmalı`);
    const sure = mp4Suresi(resolve(publicDizini, v.video as string));
    if (sure === null) hata(jsonYolu, `${yer}.video: public/${v.video} geçerli bir MP4 değil ya da süresi yazılmamış (ffmpeg -movflags +faststart ile yeniden yazın)`);
    return {
      id: v.id,
      baslik: v.baslik.trim(),
      kitap: v.kitap,
      bolum: v.bolum.trim(),
      ...(metin(v.kisim) ? { kisim: v.kisim.trim() } : {}),
      ...(v.sayfa !== undefined ? { sayfa: v.sayfa as number } : {}),
      etiketler: et as string[],
      sure: Math.round(sure * 10) / 10,
      video: v.video as string,
      kapak: v.kapak as string,
      onizleme: v.onizleme as string,
      ...(Array.isArray(v.kunye) && v.kunye.length ? { kunye: v.kunye as string[] } : {}),
    };
  });
  return { site: a.site, videolar };
}

function kacir(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** v/<id>/index.html: bağlantı önizlemesi (Open Graph) ve uygulamadaki videoya yönlendirme */
export function paylasimSayfasi(site: string, v: Video): string {
  const adres = paylasimAdresi(site, v.id);
  const hedef = `../../#/oku/${v.id}`;
  const aciklama = tipografik(`Nur-u Hakikat'te izleyin. Menba: ${menbaYazisi(v)} · ${etiketYazisi(v.etiketler)}`);
  const baslik = tipografik(v.baslik);
  const m = (ozellik: string, deger: string) => `    <meta property="${ozellik}" content="${kacir(deger)}" />`;
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${kacir(baslik)} · Nur-u Hakikat</title>
    <meta name="description" content="${kacir(aciklama)}" />
    <meta name="theme-color" content="#5AA2EC" />
    <link rel="canonical" href="${kacir(adres)}" />
    <link rel="icon" href="../../icons/favicon.ico" sizes="48x48" />
${[
  m('og:type', 'video.other'),
  m('og:site_name', 'Nur-u Hakikat'),
  m('og:locale', 'tr_TR'),
  m('og:title', baslik),
  m('og:description', aciklama),
  m('og:url', adres),
  m('og:image', site + v.onizleme),
  m('og:image:width', '720'),
  m('og:image:height', '1280'),
  m('og:image:alt', baslik),
  m('og:video', site + v.video),
  m('og:video:secure_url', site + v.video),
  m('og:video:type', 'video/mp4'),
  m('og:video:width', '720'),
  m('og:video:height', '1280'),
].join('\n')}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${kacir(baslik)}" />
    <meta name="twitter:image" content="${kacir(site + v.onizleme)}" />
    <meta http-equiv="refresh" content="0; url=${kacir(hedef)}" />
    <script>location.replace(${JSON.stringify(hedef)});</script>
  </head>
  <body>
    <p><a href="${kacir(hedef)}">${kacir(baslik)}: Nur-u Hakikat’te izleyin</a></p>
  </body>
</html>
`;
}

export function okuVideolar(dosya = 'content/oku/videolar.json'): Plugin {
  let kok = process.cwd();
  let publicDizini = resolve(kok, 'public');
  const yol = () => resolve(kok, dosya);
  return {
    name: 'oku-videolar',
    configResolved(config) {
      kok = config.root;
      publicDizini = config.publicDir || resolve(kok, 'public');
    },
    resolveId(id) {
      return id === SANAL ? COZULMUS : undefined;
    },
    load(id) {
      if (id !== COZULMUS) return undefined;
      this.addWatchFile(yol());
      const akis = akisOku(yol(), publicDizini);
      return [
        `export const site = ${JSON.stringify(akis.site)};`,
        `export const videolar = ${JSON.stringify(akis.videolar)};`,
        '',
      ].join('\n');
    },
    generateBundle() {
      const akis = akisOku(yol(), publicDizini);
      for (const v of akis.videolar) {
        this.emitFile({ type: 'asset', fileName: `v/${v.id}/index.html`, source: paylasimSayfasi(akis.site, v) });
      }
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(yol());
      server.watcher.on('change', (f) => {
        if (resolve(f) !== yol()) return;
        const modul = server.moduleGraph.getModuleById(COZULMUS);
        if (modul) server.moduleGraph.invalidateModule(modul);
        server.ws.send({ type: 'full-reload' });
      });
      // Geliştirirken paylaşım sayfaları da açılabilsin
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/v\/([a-z0-9-]+)\/?(?:index\.html)?(?:\?.*)?$/);
        if (!m) return next();
        const akis = akisOku(yol(), publicDizini);
        const v = akis.videolar.find((x) => x.id === m[1]);
        if (!v) return next();
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(paylasimSayfasi(akis.site, v));
      });
    },
  };
}
