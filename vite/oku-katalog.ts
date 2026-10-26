// Oku bölümünün kitap kataloğu: content/oku/<kitap>/ klasörlerini derleme anında tarar ve
// "virtual:oku-katalog" modülünü üretir. Bölüm metinlerinin kendisi uygulamada ayrı ayrı (ihtiyaç olunca) yüklenir.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const SANAL = 'virtual:oku-katalog';
const COZULMUS = '\0' + SANAL;
const KIMLIK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface BolumOzet {
  id: string;
  baslik: string;
  /** import.meta.glob anahtarı, ör. "/content/oku/sozler/01-birinci-soz.md" */
  dosya: string;
  kelime: number;
}

export interface KitapOzet {
  id: string;
  baslik: string;
  altbaslik?: string;
  sira: number;
  ornek?: boolean;
  bolumler: BolumOzet[];
}

interface KitapJson {
  baslik?: unknown;
  altbaslik?: unknown;
  sira?: unknown;
  ornek?: unknown;
}

function hata(dosya: string, mesaj: string): never {
  throw new Error(`[oku-katalog] ${dosya}: ${mesaj}`);
}

/** Markdown işaretlerini ve dipnot tanımlarını atıp kelime sayar (okuma süresi için). */
export function kelimeSay(md: string): number {
  const metin = md
    .replace(/^\[\^[^\]]+\]:.*$/gm, ' ')
    .replace(/\[\^[^\]]+\]/g, ' ')
    .replace(/[#>*_`|\\-]+/g, ' ');
  return (metin.match(/[\p{L}\p{M}'’]+/gu) ?? []).length;
}

export function katalogOku(kokDizin: string, projeKoku: string, izle?: (dosya: string) => void): KitapOzet[] {
  if (!existsSync(kokDizin)) return [];
  izle?.(kokDizin);
  const kitaplar: KitapOzet[] = [];
  for (const ad of readdirSync(kokDizin).sort()) {
    const dizin = join(kokDizin, ad);
    if (!statSync(dizin).isDirectory()) continue;
    izle?.(dizin);
    if (!KIMLIK.test(ad)) hata(dizin, 'klasör adı yalnız küçük harf, rakam ve tire içermeli (ör. "sozler")');
    const jsonYolu = join(dizin, 'kitap.json');
    if (!existsSync(jsonYolu)) hata(dizin, 'kitap.json yok');
    izle?.(jsonYolu);
    let bilgi: KitapJson;
    try {
      bilgi = JSON.parse(readFileSync(jsonYolu, 'utf8')) as KitapJson;
    } catch (e) {
      hata(jsonYolu, `geçerli JSON değil (${(e as Error).message})`);
    }
    if (typeof bilgi.baslik !== 'string' || !bilgi.baslik.trim()) hata(jsonYolu, '"baslik" gerekli');
    if (bilgi.altbaslik !== undefined && typeof bilgi.altbaslik !== 'string') hata(jsonYolu, '"altbaslik" metin olmalı');
    if (bilgi.sira !== undefined && typeof bilgi.sira !== 'number') hata(jsonYolu, '"sira" sayı olmalı');

    const bolumler: BolumOzet[] = [];
    for (const dosyaAdi of readdirSync(dizin).filter((f) => f.endsWith('.md')).sort()) {
      const yol = join(dizin, dosyaAdi);
      izle?.(yol);
      const id = dosyaAdi.replace(/\.md$/, '').replace(/^\d+[-_.]/, '');
      if (!KIMLIK.test(id)) hata(yol, 'dosya adı "01-birinci-soz.md" biçiminde olmalı (küçük harf, rakam, tire)');
      if (bolumler.some((b) => b.id === id)) hata(yol, `"${id}" adlı başka bir bölüm var`);
      const md = readFileSync(yol, 'utf8');
      const baslik = md.match(/^#[ \t]+(.+?)[ \t]*$/m)?.[1];
      if (!baslik) hata(yol, 'bölümün ilk başlığı "# Başlık" biçiminde olmalı');
      bolumler.push({
        id,
        baslik,
        dosya: '/' + relative(projeKoku, yol).split(sep).join('/'),
        kelime: kelimeSay(md),
      });
    }
    if (!bolumler.length) hata(dizin, 'hiç bölüm (.md) yok');
    kitaplar.push({
      id: ad,
      baslik: bilgi.baslik.trim(),
      ...(typeof bilgi.altbaslik === 'string' && bilgi.altbaslik.trim() ? { altbaslik: bilgi.altbaslik.trim() } : {}),
      sira: typeof bilgi.sira === 'number' ? bilgi.sira : 1000,
      ...(bilgi.ornek === true ? { ornek: true } : {}),
      bolumler,
    });
  }
  return kitaplar.sort((a, b) => a.sira - b.sira || a.baslik.localeCompare(b.baslik, 'tr'));
}

export function okuKatalog(klasor = 'content/oku'): Plugin {
  let kok = process.cwd();
  let dizin = resolve(kok, klasor);
  return {
    name: 'oku-katalog',
    configResolved(config) {
      kok = config.root;
      dizin = resolve(kok, klasor);
    },
    resolveId(id) {
      return id === SANAL ? COZULMUS : undefined;
    },
    load(id) {
      if (id !== COZULMUS) return undefined;
      const kitaplar = katalogOku(dizin, kok, (f) => this.addWatchFile(f));
      return `export const kitaplar = ${JSON.stringify(kitaplar)};\n`;
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(dizin);
      const yenile = (dosya: string) => {
        if (!resolve(dosya).startsWith(dizin)) return;
        const modul = server.moduleGraph.getModuleById(COZULMUS);
        if (modul) server.moduleGraph.invalidateModule(modul);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', yenile);
      server.watcher.on('unlink', yenile);
      server.watcher.on('change', yenile);
    },
  };
}
