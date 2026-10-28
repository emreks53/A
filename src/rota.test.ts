import { describe, expect, it } from 'vitest';
import { paylasimdanVideo, rotaCoz, rotaHash } from './rota';

describe('rota', () => {
  it('çözer', () => {
    expect(rotaCoz('')).toEqual({ sekme: 'ana' });
    expect(rotaCoz('#/')).toEqual({ sekme: 'ana' });
    expect(rotaCoz('#/ana')).toEqual({ sekme: 'ana' });
    expect(rotaCoz('#/bilinmeyen')).toEqual({ sekme: 'ana' });
    expect(rotaCoz('#/kenz')).toEqual({ sekme: 'kenz' });
    expect(rotaCoz('#/gunes/x')).toEqual({ sekme: 'gunes' });
    expect(rotaCoz('#/oku')).toEqual({ sekme: 'oku' });
    expect(rotaCoz('#/oku/ihlas')).toEqual({ sekme: 'oku', video: 'ihlas' });
    expect(rotaCoz('#oku/%E2%82%AC')).toEqual({ sekme: 'oku', video: '€' });
    expect(rotaCoz('#/oku/%')).toEqual({ sekme: 'oku', video: '%' });
  });
  it('geri üretir', () => {
    for (const h of ['#/', '#/kenz', '#/gunes', '#/oku', '#/oku/ihlas']) expect(rotaHash(rotaCoz(h))).toBe(h);
  });
  it('paylaşım bağlantısından videoyu bulur', () => {
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/ihlas/')).toBe('ihlas');
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/fenler-haliki-tanittirir')).toBe('fenler-haliki-tanittirir');
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/fenler-haliki-tanittirir/index.html?utm=x')).toBe('fenler-haliki-tanittirir');
    expect(paylasimdanVideo('https://emreks53.github.io/A/')).toBeUndefined();
    expect(paylasimdanVideo('bozuk adres')).toBeUndefined();
  });
});
