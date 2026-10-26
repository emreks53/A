import { describe, expect, it } from 'vitest';
import { paylasimdanVideo, rotaCoz, rotaHash } from './rota';

describe('rota', () => {
  it('çözer', () => {
    expect(rotaCoz('')).toEqual({ sekme: 'kenz' });
    expect(rotaCoz('#/bilinmeyen')).toEqual({ sekme: 'kenz' });
    expect(rotaCoz('#/gunes/x')).toEqual({ sekme: 'gunes' });
    expect(rotaCoz('#/oku')).toEqual({ sekme: 'oku' });
    expect(rotaCoz('#/oku/sevgi-ve-guzellik')).toEqual({ sekme: 'oku', video: 'sevgi-ve-guzellik' });
    expect(rotaCoz('#oku/%E2%82%AC')).toEqual({ sekme: 'oku', video: '€' });
    expect(rotaCoz('#/oku/%')).toEqual({ sekme: 'oku', video: '%' });
  });
  it('geri üretir', () => {
    for (const h of ['#/kenz', '#/oku', '#/oku/sevgi-ve-guzellik']) expect(rotaHash(rotaCoz(h))).toBe(h);
  });
  it('paylaşım bağlantısından videoyu bulur', () => {
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/sevgi-ve-guzellik/')).toBe('sevgi-ve-guzellik');
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/ahlak-mucizesi')).toBe('ahlak-mucizesi');
    expect(paylasimdanVideo('https://emreks53.github.io/A/v/ahlak-mucizesi/index.html?utm=x')).toBe('ahlak-mucizesi');
    expect(paylasimdanVideo('https://emreks53.github.io/A/')).toBeUndefined();
    expect(paylasimdanVideo('bozuk adres')).toBeUndefined();
  });
});
