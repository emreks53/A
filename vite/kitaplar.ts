// Güneş'teki kitaplar: content/kitaplar/kitaplar.json derleme anında denetlenir ve "virtual:kitaplar" modülü olarak
// uygulamaya verilir. PDF'ler public/kitaplar/ altında (ya da bir https adresinde) durur; listede olmayan kitap
// rafta "yakında" görünür. Ayrıca pdf.js'nin yardımcı dosyaları (yazı tipleri, karakter eşlemleri, görüntü
// çözücüler) derlemeye pdfjs/ altında kopyalanır.
import { existsSync, openSync, readFileSync, readSync, closeSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { KULLIYAT } from '../src/oku/ortak.ts';
import { kitapKimligi, type IcindekilerOgesi, type Kitap } from '../src/gunes/ortak.ts';

export type { Kitap };

const SANAL = 'virtual:kitaplar';
const COZULMUS = '\0' + SANAL;
/** pdf.js'nin çalışma anında indirdiği yardımcı dosyaların klasörleri (node_modules/pdfjs-dist altında) */
const PDFJS_KLASORLERI = ['cmaps', 'standard_fonts', 'wasm', 'iccs'] as const;

export interface Raf {
  kaynak: string;
  kitaplar: Kitap[];
}

function hata(dosya: string, mesaj: string): never {
  throw new Error(`[kitaplar] ${dosya}: ${mesaj}`);
}

const metin = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function pdfMi(yol: string): boolean {
  const fd = openSync(yol, 'r');
  try {
    const b = Buffer.alloc(5);
    readSync(fd, b, 0, 5, 0);
    return b.toString('latin1') === '%PDF-';
  } finally {
    closeSync(fd);
  }
}

export function rafOku(jsonYolu: string, publicDizini: string): Raf {
  let ham: unknown;
  try {
    ham = JSON.parse(readFileSync(jsonYolu, 'utf8'));
  } catch (e) {
    hata(jsonYolu, `okunamadı: ${(e as Error).message}`);
  }
  const kok = ham as Record<string, unknown>;
  if (!kok || typeof kok !== 'object' || !Array.isArray(kok.kitaplar)) hata(jsonYolu, '"kitaplar" listesi gerekli');
  const kaynak = kok.kaynak === undefined ? '' : kok.kaynak;
  if (typeof kaynak !== 'string') hata(jsonYolu, '"kaynak" metin olmalı');
  const gorulen = new Set<string>();
  const kitaplar = (kok.kitaplar as unknown[]).map((ham, i): Kitap => {
    const k = ham as Record<string, unknown>;
    const yer = `kitaplar[${i}]`;
    if (!k || typeof k !== 'object') hata(jsonYolu, `${yer} bir nesne olmalı`);
    if (!metin(k.kitap) || !(KULLIYAT as readonly string[]).includes(k.kitap)) {
      hata(jsonYolu, `${yer}.kitap Risale-i Nur Külliyatı'ndan bir eser olmalı (${KULLIYAT.join(', ')})`);
    }
    if (gorulen.has(k.kitap)) hata(jsonYolu, `${yer}.kitap "${k.kitap}" iki kez yazılmış`);
    gorulen.add(k.kitap);
    const pdf = k.pdf;
    if (!metin(pdf)) hata(jsonYolu, `${yer}.pdf gerekli (public/ altına göre yol ya da https adresi)`);
    if (/^https:\/\//.test(pdf)) {
      try {
        new URL(pdf);
      } catch {
        hata(jsonYolu, `${yer}.pdf geçerli bir adres değil`);
      }
    } else {
      if (!/^[a-z0-9][a-z0-9._/-]*\.pdf$/.test(pdf) || pdf.includes('..')) {
        hata(jsonYolu, `${yer}.pdf: "${pdf}" public/ altına göre, yalnız küçük harf, rakam, "-", "_", "." ve "/" içeren bir .pdf yolu olmalı`);
      }
      const tam = resolve(publicDizini, pdf);
      if (!existsSync(tam)) hata(jsonYolu, `${yer}.pdf: public/${pdf} bulunamadı`);
      if (!pdfMi(tam)) hata(jsonYolu, `${yer}.pdf: public/${pdf} bir PDF değil`);
    }
    const sayfaFarki = k.sayfaFarki ?? 0;
    if (!Number.isInteger(sayfaFarki) || (sayfaFarki as number) < 0) hata(jsonYolu, `${yer}.sayfaFarki sıfır ya da pozitif bir tam sayı olmalı`);
    if (k.sayfaSayisi !== undefined && !(Number.isInteger(k.sayfaSayisi) && (k.sayfaSayisi as number) > 0)) {
      hata(jsonYolu, `${yer}.sayfaSayisi pozitif bir tam sayı olmalı`);
    }
    const ic = k.icindekiler ?? [];
    if (!Array.isArray(ic)) hata(jsonYolu, `${yer}.icindekiler bir liste olmalı`);
    const icindekiler = ic.map((o: unknown, j): IcindekilerOgesi => {
      const r = o as Record<string, unknown>;
      const oyer = `${yer}.icindekiler[${j}]`;
      if (!r || !metin(r.baslik)) hata(jsonYolu, `${oyer}.baslik gerekli`);
      if (!Number.isInteger(r.sayfa) || (r.sayfa as number) < 1) hata(jsonYolu, `${oyer}.sayfa basılı sayfa numarası (1 ya da büyük) olmalı`);
      if (k.sayfaSayisi !== undefined && (r.sayfa as number) + (sayfaFarki as number) > (k.sayfaSayisi as number)) {
        hata(jsonYolu, `${oyer}.sayfa kitabın sayfa sayısını aşıyor`);
      }
      const derinlik = r.derinlik ?? 0;
      if (!Number.isInteger(derinlik) || (derinlik as number) < 0 || (derinlik as number) > 3) hata(jsonYolu, `${oyer}.derinlik 0-3 arası olmalı`);
      return { baslik: r.baslik.trim(), sayfa: r.sayfa as number, derinlik: derinlik as number };
    });
    return {
      kitap: k.kitap,
      kimlik: kitapKimligi(k.kitap),
      pdf,
      ...(k.sayfaSayisi !== undefined ? { sayfaSayisi: k.sayfaSayisi as number } : {}),
      sayfaFarki: sayfaFarki as number,
      icindekiler,
    };
  });
  const sira = (k: Kitap) => (KULLIYAT as readonly string[]).indexOf(k.kitap);
  kitaplar.sort((a, b) => sira(a) - sira(b));
  return { kaynak: kaynak.trim(), kitaplar };
}

/** pdf.js yardımcı dosyalarının listesi: [derlemedeki yol, diskteki yol] */
function pdfjsDosyalari(kok: string): [string, string][] {
  const taban = resolve(kok, 'node_modules/pdfjs-dist');
  const liste: [string, string][] = [];
  for (const klasor of PDFJS_KLASORLERI) {
    const dizin = join(taban, klasor);
    if (!existsSync(dizin)) continue;
    for (const ad of readdirSync(dizin)) {
      if (/^LICENSE/.test(ad) || ad.endsWith('_nowasm_fallback.js')) continue;
      liste.push([`pdfjs/${klasor}/${ad}`, join(dizin, ad)]);
    }
  }
  return liste;
}

export function kitaplarEklentisi(): Plugin {
  let kok = process.cwd();
  let publicDizini = resolve(kok, 'public');
  // Uçtan uca denemeler kendi listesiyle derler (KITAPLAR_JSON); öbür durumlarda content/ altındaki liste.
  const yol = () => resolve(kok, process.env.KITAPLAR_JSON || 'content/kitaplar/kitaplar.json');
  return {
    name: 'kitaplar',
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
      const raf = rafOku(yol(), publicDizini);
      return [`export const kaynak = ${JSON.stringify(raf.kaynak)};`, `export const kitaplar = ${JSON.stringify(raf.kitaplar)};`, ''].join('\n');
    },
    generateBundle() {
      for (const [ad, dosya] of pdfjsDosyalari(kok)) this.emitFile({ type: 'asset', fileName: ad, source: readFileSync(dosya) });
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(yol());
      server.watcher.on('change', (f) => {
        if (resolve(f) !== yol()) return;
        const modul = server.moduleGraph.getModuleById(COZULMUS);
        if (modul) server.moduleGraph.invalidateModule(modul);
        server.ws.send({ type: 'full-reload' });
      });
      const harita = new Map(pdfjsDosyalari(kok));
      server.middlewares.use((req, res, next) => {
        const ad = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '');
        const dosya = harita.get(ad);
        if (!dosya) return next();
        res.setHeader('Content-Type', ad.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        res.end(readFileSync(dosya));
      });
    },
  };
}
