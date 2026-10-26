import { describe, expect, it } from 'vitest';
import { rotaCoz, rotaHash } from './rota';

describe('rota', () => {
  it('çözer', () => {
    expect(rotaCoz('')).toEqual({ sekme: 'kenz' });
    expect(rotaCoz('#/bilinmeyen')).toEqual({ sekme: 'kenz' });
    expect(rotaCoz('#/gunes/x')).toEqual({ sekme: 'gunes' });
    expect(rotaCoz('#/oku')).toEqual({ sekme: 'oku' });
    expect(rotaCoz('#/oku/sozler')).toEqual({ sekme: 'oku', kitap: 'sozler' });
    expect(rotaCoz('#/oku/sozler/birinci-soz')).toEqual({ sekme: 'oku', kitap: 'sozler', bolum: 'birinci-soz' });
    expect(rotaCoz('#oku/%E2%82%AC/%')).toEqual({ sekme: 'oku', kitap: '€', bolum: '%' });
  });
  it('geri üretir', () => {
    for (const h of ['#/kenz', '#/oku', '#/oku/sozler', '#/oku/sozler/birinci-soz']) expect(rotaHash(rotaCoz(h))).toBe(h);
  });
});
