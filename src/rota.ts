export type Sekme = 'oku' | 'kenz' | 'gunes';

export interface Rota {
  sekme: Sekme;
  kitap?: string;
  bolum?: string;
}

const SEKMELER: readonly string[] = ['oku', 'kenz', 'gunes'];

/** "#/oku/sozler/birinci-soz" → { sekme: 'oku', kitap: 'sozler', bolum: 'birinci-soz' } */
export function rotaCoz(hash: string): Rota {
  const [sekme, kitap, bolum] = hash
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
  if (sekme !== 'oku' || !kitap) return { sekme: sekme as Sekme };
  return bolum ? { sekme, kitap, bolum } : { sekme, kitap };
}

export function rotaHash(r: Rota): string {
  return '#/' + [r.sekme, r.kitap, r.kitap ? r.bolum : undefined].filter(Boolean).map((p) => encodeURIComponent(p!)).join('/');
}
