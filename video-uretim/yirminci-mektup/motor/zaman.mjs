// Ses kaydının zamanlaması: hizalama.json (CTC zorunlu hizalama, harf düzeyinde) üzerinden kelime ve cümle zamanları.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { KOK } from './temel.mjs';

export const SES_SURESI = 109.53; // saniye
/** CTC sivri uçları sesin başlangıcından biraz sonra düşer; görsel girişler için bu kadar erkene alınır */
export const ONCE = 0.04;

export const KELIMELER = JSON.parse(readFileSync(path.join(KOK, 'veri', 'hizalama.json'), 'utf8')).map((k, i) => ({
  i,
  yazi: k.w,
  n: k.n,
  bas: k.s,
  son: k.e,
  harfler: k.chars || [],
}));

/** n biçimli kelimenin kac'ıncı geçişi */
export function kelime(n, kac = 1) {
  let say = 0;
  for (const k of KELIMELER) if (k.n === n && ++say === kac) return k;
  throw new Error(`kelime yok: ${n} #${kac}`);
}
/** Kelimenin başlangıç zamanı (ilk harf), görsel giriş için erkene alınmış */
export const kb = (n, kac = 1) => kelime(n, kac).bas - ONCE;
/** Kelimenin bitiş zamanı */
export const ks = (n, kac = 1) => kelime(n, kac).son;
/** i. kelime */
export const ki = (i) => KELIMELER[i];

/** Cümleler: kelime aralıkları ve zamanları */
const CUMLE_SONLARI = [13, 27, 41, 60, 80, 95, 109, 136, 158, 181];
export const CUMLELER = CUMLE_SONLARI.map((son, c) => {
  const bas = c === 0 ? 0 : CUMLE_SONLARI[c - 1] + 1;
  return { no: c + 1, ilk: bas, son, bas: KELIMELER[bas].bas, bit: KELIMELER[son].son };
});
