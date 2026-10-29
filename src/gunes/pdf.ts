// Okuyucunun PDF katmanı. pdf.js (ve işçisi) yalnız bir kitap açılınca yüklenir; sayfalar basıldığı gibi, cihazın
// piksel yoğunluğunda çizilir (metne dokunulmaz).
import { Capacitor } from '@capacitor/core';
import { site } from 'virtual:oku-videolar';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type { PDFDocumentProxy, PDFPageProxy };

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsSozu: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  // önce eksik özellikler tamamlanır, sonra pdf.js; işçi ayrı derlenmiş bir dosyadır
  pdfjsSozu ??= import('./pdf-yamalar')
    .then(() => Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('./pdf-isci.ts?worker&url')]))
    .then(([m, isci]) => {
      m.GlobalWorkerOptions.workerSrc = isci.default;
      return m;
    })
    .catch((e) => {
      pdfjsSozu = null;
      throw e;
    });
  return pdfjsSozu;
}

/** PDF'in indirileceği adres. Telefon uygulamasında PDF'ler pakete konmaz, siteden okunur. */
export function pdfAdresi(pdf: string): string {
  if (/^https:\/\//.test(pdf)) return pdf;
  if (Capacitor.isNativePlatform()) return new URL(pdf, site).href;
  return new URL(import.meta.env.BASE_URL + pdf, location.href).href;
}

const varlik = (klasor: string) => new URL(`${import.meta.env.BASE_URL}pdfjs/${klasor}/`, location.href).href;

export interface KitapYukleme {
  belge: Promise<PDFDocumentProxy>;
  /** İndirme ilerlemesi (0-1; toplam bilinmiyorsa çağrılmaz) */
  ilerleme(f: (oran: number) => void): void;
  iptal(): void;
}

/** Kitap neden açılamadı (okuyucudaki yazı buna göre) */
export type HataNedeni = 'ag' | 'yok' | 'bozuk' | 'cihaz';

export function hataNedeni(e: unknown): HataNedeni {
  const h = (e ?? {}) as { name?: string; message?: string; status?: number; missing?: boolean };
  const mesaj = String(h.message ?? '');
  if (h.name === 'InvalidPDFException' || h.name === 'FormatError') return 'bozuk';
  if (h.missing || h.status === 404) return 'yok';
  // (WebKit ve Firefox, okuyucu dosyaları inemeyince "module script failed" / "dynamically imported module" der)
  if (h.name === 'ResponseException' || /fetch|network|load failed|internet|offline|aborted|importing a module script failed|dynamically imported module/i.test(mesaj)) return 'ag';
  // eksik bir özellik ya da çözülemeyen sözdizimi (eski tarayıcı)
  if (e instanceof TypeError || e instanceof SyntaxError || e instanceof ReferenceError) return 'cihaz';
  if (/is not a function|is not defined|is not a constructor|undefined is not|Unexpected token|SyntaxError|TypeError/i.test(mesaj)) return 'cihaz';
  return 'ag';
}

/** Bayt aralığı parçası (pdf.js'in istediği ölçü) */
const PARCA = 1 << 18;

const bekle = (ms: number, sinyal: AbortSignal) =>
  new Promise<void>((tamam) => {
    const t = setTimeout(tamam, ms);
    sinyal.addEventListener('abort', () => (clearTimeout(t), tamam()), { once: true });
  });
/** Bağlantı yokken (navigator.onLine) gelene dek bekler */
const baglantiyiBekle = (sinyal: AbortSignal) =>
  navigator.onLine
    ? Promise.resolve()
    : new Promise<void>((tamam) => {
        const bitti = () => (removeEventListener('online', bitti), tamam());
        addEventListener('online', bitti);
        sinyal.addEventListener('abort', bitti, { once: true });
      });

/** Kitabın parçaları bizim üzerimizden iner (pdf.js istedikçe):
 *  - Başka kaynaktaki PDF'te (telefon uygulamasında sitedeki PDF'ler; listede https:// adresi) tarayıcı
 *    "Accept-Ranges" başlığını göstermez (GitHub Pages izin vermez); pdf.js bayt aralığını kendisi bulamaz ve dosyanın
 *    tamamını indirmeden ilk sayfayı açamazdı.
 *  - pdf.js inemeyen bir parçayı bir daha istemez: bağlantı bir an koparsa o sayfalar hiç çizilmezdi. Burada her parça
 *    inene dek (bağlantı yokken gelmesi beklenerek) yeniden denenir. Dördüncü denemede `hata` çağrılır (kitap daha
 *    açılmadıysa okuyucu "Yeniden dene" gösterir); denemeler kitap kapanana dek sürer.
 *  Uzunluk HEAD ile (Content-Length her kaynaktan okunur), ilk parça bir aralık isteğiyle alınır; sunucu 206 ile yanıt
 *  vermiyorsa null (pdf.js'in kendi yüklemesi). */
async function aralikTasiyici(
  m: PdfJs,
  adres: string,
  sinyal: AbortSignal,
  hata: (e: unknown) => void,
): Promise<InstanceType<PdfJs['PDFDataRangeTransport']> | null> {
  try {
    const bas = await fetch(adres, { method: 'HEAD', signal: sinyal });
    const uzunluk = Number(bas.headers.get('content-length'));
    if (!bas.ok || !Number.isInteger(uzunluk) || uzunluk <= 2 * PARCA) return null;
    const ilk = await fetch(adres, { headers: { Range: `bytes=0-${PARCA - 1}` }, signal: sinyal });
    if (ilk.status !== 206) {
      void ilk.body?.cancel();
      return null;
    }
    const ilkVeri = new Uint8Array(await ilk.arrayBuffer());
    // (sıkıştırılmış ya da başka bir yanıt: düz yüklemeye dön)
    if (ilkVeri.length !== PARCA || new TextDecoder().decode(ilkVeri.subarray(0, 5)) !== '%PDF-') return null;
    const parcaAl = async (bas_: number, son: number): Promise<Uint8Array> => {
      for (let deneme = 0; ; deneme++) {
        await baglantiyiBekle(sinyal);
        if (sinyal.aborted) throw new DOMException('İptal', 'AbortError');
        try {
          const r = await fetch(adres, { headers: { Range: `bytes=${bas_}-${son - 1}` }, signal: sinyal });
          if (r.status !== 206) {
            void r.body?.cancel();
            throw Object.assign(new Error(`Aralık yanıtı ${r.status}`), { status: r.status });
          }
          return new Uint8Array(await r.arrayBuffer());
        } catch (e) {
          if (sinyal.aborted) throw e;
          if (deneme === 3) hata(e);
          await bekle(1000 * 2 ** Math.min(deneme, 3), sinyal);
        }
      }
    };
    class Tasiyici extends m.PDFDataRangeTransport {
      requestDataRange(bas_: number, son: number): void {
        parcaAl(bas_, son).then(
          (veri) => !sinyal.aborted && this.onDataRange(bas_, veri),
          () => undefined, // (yalnız kitap kapanınca)
        );
      }
    }
    return new Tasiyici(uzunluk, ilkVeri);
  } catch {
    // (ör. tarayıcı aralık isteğini ön denetime soktu, sunucu reddetti)
    return null;
  }
}

export function kitapYukle(pdf: string): KitapYukleme {
  let gorev: PDFDocumentLoadingTask | null = null;
  let dinleyici: ((oran: number) => void) | null = null;
  const iptalci = new AbortController();
  // parçalar uzun süre inemezse kitap açılırken hata verilir (açıldıktan sonra bunun etkisi yoktur)
  let aktarimHatasiVer: (e: unknown) => void = () => undefined;
  const aktarimHatasi = new Promise<never>((_, red) => (aktarimHatasiVer = red));
  aktarimHatasi.catch(() => undefined);
  const belge = pdfjs().then(async (m) => {
    const adres = pdfAdresi(pdf);
    const tasiyici = await aralikTasiyici(m, adres, iptalci.signal, (e) => aktarimHatasiVer(e));
    if (iptalci.signal.aborted) throw new DOMException('İptal', 'AbortError');
    gorev = m.getDocument({
      ...(tasiyici ? { range: tasiyici } : { url: adres }),
      cMapUrl: varlik('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: varlik('standard_fonts'),
      wasmUrl: varlik('wasm'),
      iccUrl: varlik('iccs'),
      // Büyük kitaplarda yalnız açılan sayfaların parçaları indirilir (sunucu bayt aralığı destekliyorsa); dosyanın
      // tamamı arkada akıtılmaz (disableStream olmadan pdf.js ilk isteği sonuna dek okur).
      disableAutoFetch: true,
      disableStream: true,
      rangeChunkSize: PARCA,
    });
    gorev.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (total > 0) dinleyici?.(Math.min(1, loaded / total));
    };
    return Promise.race([gorev.promise, aktarimHatasi]);
  });
  return {
    belge,
    ilerleme(f) {
      dinleyici = f;
    },
    iptal() {
      iptalci.abort();
      void gorev?.destroy();
    },
  };
}

/** Sayfanın kutuya sığdırılmış ölçüsü (CSS px) */
export function sigdir(sayfa: PDFPageProxy, genislik: number, yukseklik: number): { olcek: number; genislik: number; yukseklik: number } {
  const vp = sayfa.getViewport({ scale: 1 });
  const olcek = Math.min(genislik / vp.width, yukseklik / vp.height);
  return { olcek, genislik: vp.width * olcek, yukseklik: vp.height * olcek };
}

/** Bir tuvalde en çok bu kadar piksel (telefonlarda bellek ve tuval sınırı) */
const EN_COK_PIKSEL = 9_000_000;

export interface Cizim {
  bitti: Promise<void>;
  iptal(): void;
}

/** Sayfayı tuvale CSS ölçek `olcek` ile, cihaz piksel oranında çizer */
export function sayfaCiz(sayfa: PDFPageProxy, tuval: HTMLCanvasElement, olcek: number, dpr = window.devicePixelRatio || 1): Cizim {
  const vp1 = sayfa.getViewport({ scale: olcek });
  let oran = Math.max(1, dpr);
  if (vp1.width * vp1.height * oran * oran > EN_COK_PIKSEL) oran = Math.sqrt(EN_COK_PIKSEL / (vp1.width * vp1.height));
  const vp = sayfa.getViewport({ scale: olcek * oran });
  // Önce görünmeyen bir tuvalde çizilir; bitince eldeki tuvale aktarılır (çizim sırasında sayfa boş görünmez).
  const ara = document.createElement('canvas');
  ara.width = Math.floor(vp.width);
  ara.height = Math.floor(vp.height);
  let gorev: RenderTask | null = sayfa.render({ canvas: ara, viewport: vp, background: 'rgb(255,255,255)' });
  const bitti = gorev.promise.then(() => {
    gorev = null;
    tuval.width = ara.width;
    tuval.height = ara.height;
    tuval.style.width = `${vp1.width}px`;
    tuval.style.height = `${vp1.height}px`;
    tuval.getContext('2d')!.drawImage(ara, 0, 0);
    ara.width = ara.height = 0;
  });
  return {
    bitti,
    iptal() {
      gorev?.cancel();
      gorev = null;
    },
  };
}

/** PDF'in kendi içindekiler listesi (varsa): [başlık, PDF sayfası, derinlik] */
export async function pdfIcindekiler(belge: PDFDocumentProxy): Promise<{ baslik: string; pdfSayfasi: number; derinlik: number }[]> {
  const agac = await belge.getOutline().catch(() => null);
  if (!agac) return [];
  const sonuc: { baslik: string; pdfSayfasi: number; derinlik: number }[] = [];
  const gez = async (ogeler: typeof agac, derinlik: number) => {
    for (const o of ogeler) {
      try {
        const hedef = typeof o.dest === 'string' ? await belge.getDestination(o.dest) : o.dest;
        if (hedef && hedef[0]) {
          const ref = hedef[0];
          const sira = typeof ref === 'number' ? ref : await belge.getPageIndex(ref);
          sonuc.push({ baslik: o.title.trim(), pdfSayfasi: sira + 1, derinlik: Math.min(derinlik, 3) });
        }
      } catch {
        // hedefi çözülemeyen öğe atlanır
      }
      if (o.items?.length) await gez(o.items, derinlik + 1);
    }
  };
  await gez(agac, 0);
  return sonuc;
}
