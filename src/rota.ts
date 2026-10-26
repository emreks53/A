export type Sekme = 'oku' | 'kenz' | 'gunes';

export interface Rota {
  sekme: Sekme;
  /** Oku akışında açılacak video (#/oku/<id>) */
  video?: string;
}

const SEKMELER: readonly string[] = ['oku', 'kenz', 'gunes'];

/** "#/oku/sevgi-ve-guzellik" → { sekme: 'oku', video: 'sevgi-ve-guzellik' } */
export function rotaCoz(hash: string): Rota {
  const [sekme, video] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  if (!SEKMELER.includes(sekme)) return { sekme: 'kenz' };
  if (sekme !== 'oku' || !video) return { sekme: sekme as Sekme };
  return { sekme, video };
}

export function rotaHash(r: Rota): string {
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
