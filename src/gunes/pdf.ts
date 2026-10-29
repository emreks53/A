// Okuyucunun PDF katmanı. pdf.js (ve işçisi) yalnız bir kitap açılınca yüklenir; sayfalar basıldığı gibi, cihazın
// piksel yoğunluğunda çizilir (metne dokunulmaz).
import { Capacitor } from '@capacitor/core';
import { site } from 'virtual:oku-videolar';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type { PDFDocumentProxy, PDFPageProxy };

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsSozu: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  pdfjsSozu ??= Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')])
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

export function kitapYukle(pdf: string): KitapYukleme {
  let gorev: PDFDocumentLoadingTask | null = null;
  let dinleyici: ((oran: number) => void) | null = null;
  let iptalEdildi = false;
  const belge = pdfjs().then((m) => {
    if (iptalEdildi) throw new DOMException('İptal', 'AbortError');
    gorev = m.getDocument({
      url: pdfAdresi(pdf),
      cMapUrl: varlik('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: varlik('standard_fonts'),
      wasmUrl: varlik('wasm'),
      iccUrl: varlik('iccs'),
      // Büyük kitaplarda yalnız açılan sayfaların parçaları indirilir (sunucu bayt aralığı destekliyorsa).
      disableAutoFetch: true,
      rangeChunkSize: 1 << 18,
    });
    gorev.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (total > 0) dinleyici?.(Math.min(1, loaded / total));
    };
    return gorev.promise;
  });
  return {
    belge,
    ilerleme(f) {
      dinleyici = f;
    },
    iptal() {
      iptalEdildi = true;
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
