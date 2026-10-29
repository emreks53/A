/** "ana" giriş ekranıdır (gökyüzü ve alıntı); oku, kenz ve gunes alt menüdeki sekmeler; "kitap" Güneş'te açılan
 *  kitabın okuyucusudur (tam ekran, adresi #/gunes/<kitap>[/<sayfa>]). */
export type Sekme = 'ana' | 'oku' | 'kenz' | 'gunes' | 'kitap';

export interface Rota {
  sekme: Sekme;
  /** Oku akışında açılacak video (#/oku/<id>) */
  video?: string;
  /** Güneş'te açılan kitabın kimliği (#/gunes/lemalar) */
  kitap?: string;
  /** Kitabın basılı sayfası (#/gunes/lemalar/154) */
  sayfa?: number;
}

const SEKMELER: readonly string[] = ['ana', 'oku', 'kenz', 'gunes'];

/** "#/oku/ihlas" → { sekme: 'oku', video: 'ihlas' } */
export function rotaCoz(hash: string): Rota {
  const [sekme, video, sayfaParcasi] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  if (!SEKMELER.includes(sekme)) return { sekme: 'ana' };
  if (sekme === 'gunes') {
    const kitap = video;
    if (!kitap || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kitap)) return { sekme: 'gunes' };
    const sayfa = Number(sayfaParcasi);
    return /^[1-9][0-9]{0,4}$/.test(sayfaParcasi ?? '') ? { sekme: 'kitap', kitap, sayfa } : { sekme: 'kitap', kitap };
  }
  if (sekme !== 'oku' || !video) return { sekme: sekme as Sekme };
  return { sekme, video };
}

export function rotaHash(r: Rota): string {
  if (r.sekme === 'ana') return '#/';
  if (r.sekme === 'kitap') return `#/gunes/${encodeURIComponent(r.kitap ?? '')}${r.sayfa ? `/${r.sayfa}` : ''}`;
  return '#/' + [r.sekme, r.video].filter(Boolean).map((p) => encodeURIComponent(p!)).join('/');
}

/** Paylaşım bağlantısından ("…/v/<id>/") video kimliği; uygulama bu bağlantıyla açılınca kullanılır */
export function paylasimdanVideo(adres: string): string | undefined {
  try {
    return new URL(adres).pathname.match(/\/v\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:index\.html)?$/)?.[1];
  } catch {
    return undefined;
  }
}
