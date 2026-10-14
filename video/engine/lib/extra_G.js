// Group G (s15 globe, s16 Carlyle study, s17 Gibbon summer-house) shared helpers.
// Contents: (1) hand-authored world coastlines + antique-globe map painter, (2) period props
// (candlestick, quill, paper stacks, titled books, clay pipe, dividers), (3) FX (smoke wisp, curtain),
// (4) Kurzgesagt overlay pieces (name card, location tag), (5) smooth timing helpers.
import * as THREE from 'three';
import * as TEX from './textures.js';
import * as M from './models.js';
import { flame as fxFlame, glow as fxGlow } from './fx.js';
import { rng, clamp, ease, lerp, smoothstep } from './util.js';


// Each entry: [name, tint, [lon,lat, lon,lat, ...]]. Longitudes may exceed ±180 (wrapping is handled when drawing).
export const LAND = [
  ['namerica', 'am', [
    -166, 68.8, -162, 70.3, -156.5, 71.3, -150, 70.4, -141, 69.7, -135, 69.2, -128, 70.2, -120, 69.5, -114, 68.3, -108, 68.5, -101, 67.8, -96, 68.5,
    -94, 71.5, -90, 68.5, -85, 69.5, -82, 67, -88, 66.5, -86, 64.0, -90.5, 63.5, -94, 61, -94.5, 59, -92.5, 57.2, -88, 56.5, -82.5, 55.2, -82, 52.5,
    -79.5, 51.5, -78.8, 54.5, -77, 58, -78, 60.5, -77.5, 62.3, -73, 62, -70, 61, -69.5, 59, -65, 60.3, -64.5, 58.5, -61.8, 56.3, -57.5, 54, -56, 52,
    -59.5, 50.3, -66.5, 50.2, -70, 48.5, -64.3, 48.8, -65.5, 47.0, -61.0, 45.6, -60.0, 46.0, -61.5, 45.0, -65.7, 43.5, -66.5, 45.1, -70.2, 43.7,
    -70.6, 42.0, -74, 40.6, -74.0, 39.5, -75.5, 38.5, -76.3, 37.0, -75.5, 35.3, -77.9, 33.9, -81, 32, -81.3, 30.2, -80.0, 26.8, -80.4, 25.2, -81.8, 26.3,
    -82.8, 28.0, -84.5, 29.9, -87, 30.4, -89.5, 30.2, -89.2, 29.0, -91.5, 29.5, -94.5, 29.5, -97.3, 27.6, -97.4, 25.5, -97.8, 22.2, -96.3, 19.3,
    -94.5, 18.2, -91.5, 18.6, -90.4, 21.0, -87.0, 21.5, -87.7, 18.5, -88.3, 16.0, -85, 16.0, -83.2, 15.0, -83.6, 11.5, -81.5, 9.0, -79.5, 9.6,
    -77.5, 8.6, -78.5, 8.0, -80.0, 7.3, -81.7, 8.1, -85.7, 10.0, -87.5, 13.2, -91.5, 14.0, -94.5, 16.1, -98.0, 16.1, -101.5, 17.6, -105.5, 20.5,
    -105.5, 23.0, -108.5, 25.5, -112.5, 29.5, -114.7, 31.6, -114.0, 30.0, -112.2, 27.0, -110.3, 24.2, -109.9, 22.9, -112.1, 24.8, -114.2, 27.5,
    -115.8, 29.9, -117.1, 32.5, -118.5, 34.0, -120.6, 34.6, -122.5, 37.7, -124.2, 40.4, -124.5, 43.0, -124.0, 46.3, -124.7, 48.4, -123, 49,
    -127.5, 50.8, -130, 54.5, -133.5, 57.5, -137, 58.6, -140, 59.8, -144, 60.0, -148, 60.5, -151.5, 59.2, -154, 57.5, -156.5, 56.8, -162, 55.0,
    -164.5, 54.5, -160, 56.5, -157.5, 58.7, -162, 58.7, -164.5, 60.5, -165.0, 62.5, -161.0, 64.5, -166.0, 64.6, -168.0, 65.6, -164.0, 66.5]],
  ['greenland', 'gr', [-73, 78.2, -66, 80.5, -60, 82, -45, 82.8, -30, 83.5, -20, 82, -18, 79.5, -19.5, 75.5, -22, 72.5, -24, 70, -27, 68.5, -32, 68.2,
    -38, 66, -40.5, 64.5, -43, 60.0, -47.5, 61, -50.5, 63.5, -52.5, 66.5, -53.5, 69.5, -52, 70.8, -55, 72.5, -58.5, 75.7, -66, 76.2, -71.5, 77.5]],
  ['baffin', 'am', [-61.5, 66.8, -62.5, 65.0, -65.5, 62.8, -71, 62.8, -77.5, 64.3, -74, 66.8, -79.5, 69.5, -85.5, 69.8, -89.5, 71, -85, 73.5, -78, 72.7, -71, 71.0, -67, 69.5]],
  ['ellesmere', 'am', [-90, 76.5, -80, 76.3, -75, 79.0, -68.5, 80.5, -62, 82.2, -70, 83.0, -85, 82.3, -92, 81, -95, 78.5]],
  ['victoria', 'am', [-118, 71.5, -112, 73, -104, 73, -101, 70, -108, 68.8, -117, 69.2, -119, 71]],
  ['banks', 'am', [-125, 72, -120, 74.3, -116, 73.5, -119, 71.5, -124, 71]],
  ['devon', 'am', [-92, 74.5, -80, 74.4, -82, 76.5, -92, 76.8]],
  ['southampton', 'am', [-86.5, 64.2, -83, 64.0, -81, 63.5, -84.5, 62.6, -87, 63.4]],
  ['newfoundland', 'am', [-59.3, 47.6, -55.5, 51.6, -56, 49.5, -53.0, 49.5, -52.7, 47.5, -53.5, 46.7, -56, 47.6]],
  ['cuba', 'am', [-84.9, 21.9, -82, 23.1, -79, 22.6, -77, 21.2, -74.2, 20.2, -75.5, 19.9, -77.7, 19.9, -79.5, 21.6, -81.5, 22.2, -84, 21.5]],
  ['hispaniola', 'am', [-74.4, 19.8, -72.5, 19.9, -70, 19.7, -68.4, 18.6, -71, 18.2, -74.4, 18.4]],
  ['jamaica', 'am', [-78.3, 18.4, -76.2, 18.1, -77, 17.8]],
  ['samerica', 'sa', [
    -77.4, 8.5, -76, 9.5, -75.5, 10.7, -74, 11.2, -71.6, 12.4, -71.5, 10.8, -70, 11.6, -67, 10.6, -64, 10.6, -61.8, 10.7, -61, 9.0, -59.5, 8.0, -57, 6.0,
    -54, 5.8, -51.5, 4.4, -50, 1.7, -50, -0.2, -48.5, -1.2, -44.5, -2.5, -40, -2.9, -37.5, -4.8, -35.2, -5.5, -34.8, -7.5, -35.3, -9.5, -37, -11,
    -38.5, -13, -39, -16, -39.7, -19.5, -41.0, -22.0, -43.2, -23.0, -45.5, -23.8, -48.5, -26.5, -48.7, -28.5, -50.5, -30.8, -52.5, -33.0, -53.5, -34.0,
    -55, -34.9, -57.8, -34.5, -57.2, -36.2, -57.5, -38.2, -62, -38.9, -62.3, -40.6, -65, -41, -64, -42.5, -65.5, -45, -67.5, -46.5, -65.8, -47.8,
    -68.5, -50.5, -69.0, -52.0, -68.5, -52.5, -66.5, -54.8, -68.5, -55.5, -71.5, -54.3, -74.5, -52.5, -75.3, -49.5, -75.5, -46.8, -74, -43.5,
    -73.7, -41.0, -73.5, -37.5, -72.2, -35, -71.5, -32.0, -71.4, -28.5, -70.5, -25.0, -70.2, -21.0, -70.3, -18.3, -72.2, -16.8, -75.3, -15.0,
    -76.3, -13.5, -77.5, -11.5, -79.0, -8.2, -80.9, -5.5, -81.3, -4.5, -80.3, -3.4, -80.9, -1.5, -80.0, 0.8, -79, 1.7, -77.6, 3.5, -77.3, 6.5, -78.0, 7.5]],
  ['eurasia', 'as', [
    // Mediterranean north shore (Gibraltar -> Levant)
    -5.6, 36.0, -4.4, 36.7, -2.0, 36.8, -0.7, 37.6, 0.2, 38.8, -0.3, 39.5, 0.9, 40.8, 3.2, 41.9, 3.0, 43.0, 4.8, 43.4, 6.5, 43.1, 7.5, 43.8, 8.8, 44.4,
    10.2, 43.9, 11.0, 42.5, 12.5, 41.5, 14.0, 40.8, 15.7, 40.0, 15.7, 38.2, 16.6, 38.5, 17.1, 39.4, 17.2, 40.5, 18.5, 40.1, 18.0, 40.8, 16.2, 41.9,
    14.2, 42.4, 13.6, 43.5, 12.3, 44.5, 12.4, 45.4, 13.6, 45.7, 13.8, 44.9, 15.0, 44.5, 16.0, 43.5, 18.0, 42.6, 19.3, 41.8, 19.4, 40.4, 20.5, 39.0,
    21.1, 38.3, 21.7, 36.8, 22.5, 36.4, 23.2, 36.5, 22.9, 37.5, 24.0, 37.7, 23.5, 38.5, 22.9, 39.4, 22.6, 40.4, 23.8, 40.0, 24.0, 40.7, 26.0, 40.8,
    26.2, 40.0, 26.8, 38.9, 26.4, 38.3, 27.3, 37.0, 28.3, 36.7, 29.7, 36.2, 30.6, 36.8, 32.5, 36.1, 34.0, 36.3, 35.9, 36.8, 35.8, 35.6, 35.9, 34.5,
    35.0, 33.0, 34.5, 31.5, 32.3, 31.1,
    // Sinai, Red Sea east shore, Arabia, Gulf, Persia
    32.6, 29.9, 33.6, 27.9, 34.2, 27.7, 34.9, 29.5, 35.0, 28.0, 36.5, 26.0, 38.0, 24.0, 39.2, 21.5, 40.8, 19.0, 42.5, 16.5, 43.3, 12.7, 45.0, 12.8,
    48.5, 14.0, 52.2, 15.6, 55.3, 17.3, 57.8, 18.9, 58.8, 21.0, 59.8, 22.5, 58.5, 23.6, 56.7, 24.4, 56.3, 26.4, 55.9, 25.8, 55.3, 25.3, 54.4, 24.5,
    52.0, 24.0, 51.2, 24.6, 51.3, 26.1, 50.8, 25.0, 50.1, 26.3, 49.3, 27.5, 48.4, 28.6, 48.0, 29.9, 48.6, 30.0, 50.2, 29.9, 50.8, 28.9, 52.5, 27.4,
    54.5, 26.6, 56.3, 27.2, 57.3, 25.8, 59.5, 25.4, 61.6, 25.2, 64.0, 25.3, 66.6, 25.4,
    // India, Bengal, Burma, Malaya, Indochina, China
    67.5, 23.8, 68.8, 23.0, 70.0, 22.9, 69.0, 22.4, 70.5, 20.8, 72.6, 21.3, 72.8, 19.0, 73.5, 16.0, 74.8, 12.8, 76.3, 9.6, 77.5, 8.1, 78.2, 8.9,
    79.3, 10.3, 79.8, 11.9, 80.3, 13.1, 80.3, 15.7, 82.3, 16.6, 84.8, 19.2, 86.9, 20.8, 88.5, 21.8, 90.5, 22.0, 91.8, 22.4, 92.3, 20.7, 94.3, 18.0,
    94.2, 16.0, 95.5, 15.8, 97.6, 16.5, 98.6, 13.0, 98.3, 9.0, 98.3, 8.0, 100.3, 5.5, 100.3, 3.9, 101.4, 2.8, 103.5, 1.3, 104.2, 1.4, 103.4, 4.5,
    102.2, 6.2, 100.5, 7.2, 100.0, 9.5, 99.2, 10.3, 100.0, 12.6, 100.5, 13.5, 101.5, 12.6, 102.5, 12.0, 103.5, 10.5, 104.8, 8.6, 106.8, 10.4,
    109.2, 11.5, 109.3, 13.5, 108.8, 15.4, 106.5, 17.5, 105.7, 19.0, 106.7, 20.7, 108.0, 21.5, 110.2, 20.3, 111.0, 21.5, 113.5, 22.2, 116.5, 23.0,
    118.5, 24.6, 119.5, 26.0, 120.6, 28.0, 121.9, 30.9, 120.8, 32.6, 119.3, 34.6, 120.3, 36.0, 122.5, 37.0, 120.7, 37.8, 119.0, 37.2, 118.0, 38.5,
    117.7, 38.9, 119.5, 39.8, 121.0, 40.8, 121.3, 38.8, 122.3, 40.0, 124.3, 39.9,
    // Korea, Russian Far East, Kamchatka, Chukotka
    125.2, 37.7, 126.5, 37.5, 126.3, 34.6, 128.0, 34.8, 129.3, 35.3, 129.5, 36.5, 128.5, 38.5, 127.5, 39.8, 129.7, 41.0, 130.7, 42.3, 132.0, 43.2,
    135.5, 44.5, 138.5, 47.0, 140.5, 48.5, 140.5, 51.5, 141.5, 52.5, 140.5, 53.5, 137.0, 54.0, 135.2, 54.7, 137.6, 56.5, 140.5, 59.0, 143.0, 59.3,
    148.0, 59.3, 152.0, 59.0, 155.0, 59.3, 156.7, 61.0, 156.0, 57.5, 156.5, 51.0, 158.5, 52.9, 160.0, 54.5, 162.5, 56.0, 163.4, 58.0, 166.0, 60.3,
    170.5, 60.0, 174.0, 61.8, 177.5, 62.5, 179.5, 65.0, 182.0, 64.5, 186.0, 65.5, 190.3, 66.1, 186.0, 67.0, 184.0, 67.3, 180.0, 68.9, 176.0, 69.8,
    // Arctic coast westwards
    170.0, 70.0, 161.0, 69.6, 153.0, 70.9, 147.0, 72.3, 141.0, 72.8, 132.0, 71.5, 128.0, 73.0, 126.5, 73.5, 120.0, 73.0, 113.0, 73.7, 107.0, 73.2,
    105.0, 76.5, 104.3, 77.7, 100.0, 76.5, 95.0, 76.0, 89.0, 75.4, 86.5, 73.8, 80.5, 73.5, 80.0, 72.3, 75.5, 72.5, 73.5, 68.5, 72.8, 72.8, 69.0, 70.0,
    68.5, 68.5, 66.0, 69.4, 60.0, 68.8, 55.0, 68.3, 53.5, 68.6, 48.5, 67.8, 44.0, 68.4, 44.2, 66.2, 41.0, 66.0, 40.5, 64.5, 37.0, 63.8, 34.8, 64.5,
    35.0, 66.2, 41.0, 66.5, 41.2, 67.2, 40.5, 67.8, 36.0, 69.1, 33.0, 69.4, 30.0, 69.9,
    // Scandinavia, Baltic, North Sea, Atlantic Europe
    25.5, 71.1, 20.0, 70.0, 15.5, 68.5, 14.0, 67.5, 12.5, 65.8, 10.5, 64.5, 8.0, 63.0, 7.0, 62.6, 5.0, 61.6, 5.3, 60.4, 5.6, 59.0, 6.5, 58.1, 8.5, 58.3,
    10.0, 59.0, 10.7, 59.8, 11.2, 59.0, 11.8, 58.0, 12.8, 56.5, 12.9, 55.4, 14.2, 55.4, 16.0, 56.2, 16.5, 57.5, 16.8, 58.5, 18.5, 59.3, 17.5, 60.6,
    17.3, 62.3, 19.0, 63.4, 21.0, 64.5, 22.2, 65.6, 24.5, 65.8, 25.4, 65.0, 23.0, 63.8, 21.6, 63.1, 21.4, 61.5, 22.3, 60.4, 25.0, 60.2, 28.0, 60.5,
    30.2, 59.9, 28.0, 59.4, 24.7, 59.4, 23.5, 59.0, 23.5, 58.3, 24.4, 57.9, 24.1, 57.0, 22.5, 57.5, 21.5, 57.4, 21.0, 56.8, 21.1, 55.7, 20.5, 54.9,
    19.9, 54.6, 18.7, 54.4, 17.0, 54.7, 14.3, 53.9, 12.1, 54.2, 10.8, 54.0, 10.0, 54.6, 10.6, 56.3, 10.3, 57.0, 10.6, 57.75, 8.6, 57.1, 8.1, 56.0,
    8.6, 55.0, 8.9, 54.0, 8.0, 53.5, 7.0, 53.4, 4.8, 53.0, 4.4, 52.2, 3.5, 51.5, 2.5, 51.1, 1.6, 50.9, 1.6, 50.2, 0.1, 49.5, -1.2, 49.4, -1.6, 49.7,
    -1.6, 48.7, -3.0, 48.8, -4.7, 48.4, -4.2, 47.8, -2.5, 47.3, -1.2, 46.2, -1.2, 44.6, -1.5, 43.5, -3.8, 43.4, -6.0, 43.6, -8.0, 43.7, -9.3, 43.0,
    -8.8, 42.0, -8.7, 40.6, -9.5, 38.8, -8.8, 38.0, -8.9, 37.0, -7.5, 37.2, -6.4, 36.8]],
  ['africa', 'af', [
    -5.9, 35.8, -2.0, 35.1, 1.0, 36.5, 3.0, 36.8, 6.5, 37.1, 9.8, 37.3, 11.1, 37.0, 10.5, 36.0, 11.0, 35.2, 10.2, 34.2, 11.5, 33.2, 13.2, 32.9,
    15.2, 32.3, 19.0, 30.3, 20.1, 32.1, 21.6, 32.9, 23.2, 32.2, 25.2, 31.6, 29.9, 31.2, 31.0, 31.6, 32.3, 31.2, 32.5, 29.9, 33.5, 27.5, 35.5, 23.9,
    37.2, 21.0, 37.2, 19.6, 38.5, 18.0, 39.6, 15.5, 41.6, 13.5, 43.3, 11.8, 44.5, 10.4, 47.5, 11.2, 51.3, 11.8, 51.0, 10.4, 50.0, 8.0, 48.0, 4.5,
    45.5, 2.0, 42.5, -0.6, 40.2, -2.8, 39.2, -4.7, 39.3, -6.8, 40.5, -10.5, 40.6, -14.5, 39.0, -17.0, 36.0, -19.0, 34.8, -20.0, 35.5, -22.0,
    35.5, -24.0, 32.9, -25.9, 32.5, -28.5, 31.0, -29.9, 28.0, -32.8, 25.6, -34.0, 22.0, -34.2, 20.0, -34.8, 18.4, -34.3, 18.2, -32.0, 16.5, -28.6,
    15.2, -26.6, 14.5, -22.9, 13.2, -20.0, 11.8, -17.3, 12.0, -13.5, 13.3, -9.0, 12.3, -6.0, 11.8, -4.8, 9.0, -1.0, 9.4, 0.5, 9.6, 3.0, 9.6, 4.0,
    8.5, 4.6, 7.0, 4.4, 6.0, 4.3, 5.0, 6.0, 3.4, 6.4, 1.0, 6.0, -1.0, 5.0, -2.0, 4.8, -4.0, 5.2, -7.5, 4.4, -10.0, 6.0, -12.5, 7.6, -13.3, 9.5,
    -15.0, 10.8, -16.7, 12.5, -17.5, 14.7, -16.5, 16.5, -16.2, 19.5, -17.0, 21.0, -16.0, 23.7, -14.5, 26.2, -13.0, 27.7, -11.0, 28.6, -9.8, 29.9,
    -9.6, 31.5, -8.5, 33.3, -7.6, 33.6, -6.8, 34.1, -6.0, 35.5]],
  ['madagascar', 'af', [49.3, -12.0, 50.5, -15.5, 49.8, -17.2, 48.0, -22.0, 47.1, -24.9, 45.2, -25.6, 43.7, -23.4, 43.3, -21.5, 44.4, -19.8, 44.0, -17.0, 46.5, -15.5, 48.0, -13.5]],
  ['britain', 'eu', [-5.7, 50.05, -3.5, 50.3, -1.0, 50.7, 1.4, 51.2, 0.8, 51.6, 1.7, 52.6, 0.3, 53.0, 0.1, 53.6, -0.1, 54.1, -1.3, 54.9, -1.6, 55.6,
    -2.6, 56.1, -2.5, 56.6, -1.8, 57.5, -3.5, 57.7, -3.0, 58.6, -5.0, 58.6, -5.8, 57.5, -5.6, 56.5, -6.2, 56.3, -5.7, 55.3, -4.9, 55.0, -5.1, 54.7,
    -3.4, 54.9, -3.4, 54.4, -3.0, 53.8, -3.0, 53.4, -4.6, 53.3, -4.2, 52.8, -4.1, 52.3, -5.3, 51.8, -4.2, 51.6, -3.0, 51.5, -2.9, 51.3, -4.2, 51.2, -5.0, 50.6]],
  ['ireland', 'eu', [-6.0, 55.2, -5.5, 54.4, -6.2, 53.3, -6.4, 52.2, -8.3, 51.8, -9.8, 51.5, -10.3, 52.1, -9.5, 52.6, -9.9, 53.4, -10.1, 54.2, -8.5, 54.3, -8.5, 55.0, -7.3, 55.4]],
  ['iceland', 'eu', [-22.5, 64.0, -24.0, 65.5, -22.0, 66.4, -18.0, 66.2, -14.5, 66.4, -13.5, 65.0, -15.0, 64.2, -18.0, 63.4, -21.0, 63.8]],
  ['sicily', 'eu', [12.4, 37.8, 13.4, 38.2, 15.6, 38.3, 15.1, 36.7, 14.3, 37.0, 12.6, 37.6]],
  ['sardinia', 'eu', [8.2, 39.0, 8.4, 40.6, 9.2, 41.2, 9.8, 40.8, 9.6, 39.2, 8.9, 38.9]],
  ['corsica', 'eu', [8.6, 41.4, 9.4, 41.4, 9.5, 43.0, 8.6, 42.4]],
  ['crete', 'eu', [23.5, 35.4, 26.3, 35.3, 26.0, 35.0, 24.0, 35.0]],
  ['cyprus', 'as', [32.3, 34.8, 33.0, 34.6, 34.0, 35.0, 34.6, 35.7, 33.0, 35.4, 32.3, 35.1]],
  ['honshu', 'as', [131.0, 34.4, 133.0, 35.5, 135.5, 35.6, 136.8, 37.3, 139.0, 37.9, 140.0, 39.5, 140.0, 40.8, 141.2, 41.2, 141.5, 40.4, 142.0, 39.5,
    141.0, 38.3, 140.9, 36.9, 140.8, 35.7, 139.8, 35.0, 139.0, 34.7, 138.0, 34.6, 136.9, 34.3, 135.8, 33.5, 135.4, 34.6, 134.0, 34.6, 132.0, 33.9, 130.9, 34.0]],
  ['hokkaido', 'as', [140.0, 41.5, 141.2, 41.8, 143.2, 42.0, 145.5, 43.3, 145.2, 44.3, 141.9, 45.5, 141.5, 43.8, 140.4, 43.3, 140.0, 42.4]],
  ['kyushu', 'as', [130.0, 33.6, 131.0, 33.9, 131.9, 33.0, 131.4, 31.4, 130.6, 31.0, 130.2, 31.5, 129.8, 32.8]],
  ['shikoku', 'as', [132.6, 33.9, 133.0, 32.7, 134.2, 33.2, 134.7, 34.1, 133.3, 34.3]],
  ['sakhalin', 'as', [142.0, 46.0, 143.5, 46.5, 143.0, 49.0, 144.5, 49.2, 143.0, 51.5, 143.0, 54.4, 142.5, 54.3, 142.0, 51.0, 142.0, 48.0, 141.8, 46.6]],
  ['taiwan', 'as', [120.1, 23.0, 120.9, 22.0, 121.9, 24.6, 121.6, 25.3, 121.0, 25.0, 120.2, 23.8]],
  ['hainan', 'as', [108.6, 19.2, 109.5, 18.2, 111.0, 19.6, 110.5, 20.1, 109.2, 20.0]],
  ['srilanka', 'as', [79.8, 8.0, 80.2, 9.8, 81.2, 8.5, 81.9, 7.2, 80.6, 5.9, 80.0, 6.5]],
  ['sumatra', 'as', [95.3, 5.6, 97.5, 5.2, 100.3, 2.3, 103.5, -1.0, 104.5, -2.5, 106.0, -3.3, 105.8, -5.8, 104.5, -5.9, 102.3, -4.0, 101.0, -2.3, 99.0, 0.0, 98.0, 2.0, 96.0, 4.3]],
  ['java', 'as', [105.2, -6.8, 106.5, -6.0, 108.5, -6.5, 110.5, -6.9, 112.6, -6.9, 114.5, -7.7, 114.4, -8.7, 111.0, -8.2, 108.0, -7.8, 106.0, -7.4]],
  ['borneo', 'as', [109.0, 1.5, 109.6, 2.0, 111.0, 1.7, 113.0, 3.2, 115.4, 5.0, 116.0, 6.0, 117.0, 7.0, 119.2, 5.4, 118.0, 4.3, 117.8, 1.8, 119.0, 0.9,
    117.5, 0.0, 116.5, -2.0, 116.2, -3.8, 114.6, -4.1, 113.0, -3.2, 111.5, -3.0, 110.2, -2.9, 110.0, -1.5, 109.0, 0.0]],
  ['sulawesi', 'as', [119.5, -0.5, 120.0, 0.5, 121.0, 1.2, 124.9, 1.6, 122.5, 0.4, 120.5, 0.5, 121.5, -0.9, 123.4, -0.9, 121.3, -1.8, 122.8, -4.5,
    121.5, -4.7, 120.7, -2.8, 120.3, -5.5, 119.4, -5.5, 119.5, -3.5, 118.8, -3.0]],
  ['newguinea', 'au', [131.0, -1.4, 132.5, -0.4, 134.0, -0.9, 135.0, -3.3, 137.8, -1.5, 141.0, -2.6, 144.5, -3.8, 145.8, -5.4, 147.5, -6.1, 148.0, -8.0,
    150.5, -10.6, 147.2, -10.0, 146.0, -8.0, 144.0, -7.6, 143.0, -9.0, 141.0, -9.1, 139.0, -8.1, 138.0, -8.4, 137.5, -7.0, 135.5, -4.5, 133.0, -4.0, 132.0, -2.8]],
  ['luzon', 'as', [120.0, 16.0, 120.6, 18.5, 122.2, 18.5, 122.3, 17.0, 121.5, 15.5, 124.0, 12.5, 122.0, 13.8, 120.6, 14.0, 120.0, 15.0]],
  ['mindanao', 'as', [122.0, 7.0, 123.5, 8.6, 125.5, 9.6, 126.6, 7.3, 125.4, 5.6, 124.0, 6.4]],
  ['novayazemlya', 'as', [52.5, 71.2, 55.5, 70.6, 57.5, 70.8, 56.0, 72.8, 60.0, 75.3, 66.0, 76.3, 68.5, 76.9, 62.0, 76.4, 56.0, 74.0, 53.0, 72.4]],
  ['svalbard', 'eu', [11.0, 78.8, 16.0, 76.6, 22.0, 77.5, 27.0, 80.0, 20.0, 80.5, 11.0, 79.8]],
  ['australia', 'au', [114.1, -21.8, 114.0, -26.0, 115.0, -30.0, 115.7, -33.3, 115.0, -34.3, 118.0, -35.0, 121.5, -33.8, 124.0, -33.0, 126.0, -32.3,
    129.0, -31.7, 131.5, -31.5, 134.0, -32.8, 135.6, -34.8, 137.5, -33.5, 137.7, -35.5, 138.5, -34.8, 139.5, -36.5, 140.5, -38.0, 143.5, -38.8,
    144.9, -37.9, 146.3, -39.1, 148.0, -37.8, 150.0, -37.5, 150.8, -34.5, 151.3, -33.8, 152.5, -32.0, 153.6, -28.6, 153.1, -25.0, 151.0, -23.5,
    149.5, -22.0, 146.0, -18.8, 145.5, -15.0, 143.5, -14.0, 142.5, -10.7, 141.6, -13.0, 141.6, -16.5, 140.0, -17.7, 137.5, -16.0, 135.5, -14.8,
    136.8, -12.2, 134.0, -11.9, 132.6, -11.4, 131.0, -12.3, 129.5, -14.9, 127.5, -14.0, 125.0, -15.0, 123.5, -16.6, 122.2, -18.0, 120.0, -19.9, 117.0, -20.7]],
  ['tasmania', 'au', [144.6, -40.7, 148.3, -40.9, 148.0, -43.2, 146.8, -43.6, 145.2, -42.3]],
  ['nzn', 'au', [172.7, -34.4, 174.3, -35.6, 175.8, -36.8, 178.5, -37.7, 177.9, -39.2, 176.8, -40.3, 175.2, -41.6, 174.6, -41.3, 175.0, -39.8, 173.8, -39.2, 174.5, -38.0, 174.4, -36.8, 173.0, -35.2]],
  ['nzs', 'au', [172.7, -40.5, 174.3, -41.7, 173.0, -43.0, 172.8, -43.9, 171.2, -44.5, 170.7, -45.9, 169.0, -46.6, 166.5, -46.0, 166.8, -45.2, 168.4, -44.0, 170.8, -42.8, 172.2, -41.0]],
];

export const LAKES = [
  [27.9, 42.7, 28.0, 41.6, 29.0, 41.2, 31.5, 41.2, 33.5, 42.0, 35.2, 42.0, 36.5, 41.3, 38.5, 40.9, 41.5, 41.5, 41.6, 42.6, 40.0, 43.5, 38.0, 44.6,
    36.6, 45.2, 35.4, 45.0, 33.5, 44.5, 32.5, 45.4, 33.6, 46.1, 31.0, 46.6, 29.7, 45.4, 28.6, 44.2], // Black Sea
  [35.5, 45.4, 37.5, 47.1, 39.2, 47.2, 38.2, 46.0, 36.8, 45.4], // Azov
  [46.7, 44.7, 47.5, 43.0, 49.0, 41.5, 49.9, 40.4, 48.9, 38.4, 50.5, 37.0, 52.5, 36.7, 54.0, 37.3, 53.9, 39.0, 53.0, 40.0, 52.7, 41.5, 53.0, 42.0,
    51.3, 43.2, 51.2, 43.6, 51.0, 44.5, 53.0, 45.3, 53.0, 46.8, 51.5, 47.0, 49.5, 46.3, 47.6, 45.6], // Caspian
  [-92.0, 46.7, -89.5, 48.0, -86.5, 48.7, -84.6, 46.5, -87.5, 46.5], // Superior
  [-87.8, 42.0, -87.0, 46.0, -85.0, 46.0, -86.3, 43.5, -86.5, 42.0], // Michigan
  [-84.6, 46.0, -81.0, 45.9, -80.0, 44.5, -82.5, 43.0, -83.5, 44.0], // Huron
  [-83.4, 41.7, -79.0, 42.9, -78.9, 42.5, -82.5, 41.4], // Erie
  [-79.8, 43.3, -76.2, 43.5, -76.5, 44.2, -79.3, 43.8], // Ontario
  [31.6, -1.0, 34.0, -0.3, 34.0, -2.5, 32.0, -2.6], // Victoria
  [103.7, 51.6, 106.5, 52.6, 109.5, 55.6, 108.5, 55.5, 105.5, 52.8], // Baikal (thin)
  [58.3, 46.0, 61.0, 46.5, 61.5, 44.5, 59.5, 43.8, 58.5, 44.5], // Aral
];

// Deterministic "engraved coastline" roughening: midpoint subdivision with small perpendicular jitter.
function hash(n) { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
export function roughen(pts, levels = 2, amp = .16, seed = 1) {
  let a = pts.slice();
  for (let l = 0; l < levels; l++) {
    const out = []; const n = a.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = a[i * 2], y0 = a[i * 2 + 1], x1 = a[((i + 1) % n) * 2], y1 = a[((i + 1) % n) * 2 + 1];
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); const k = (hash(seed * 13.7 + l * 101.3 + i * 7.31) - .5) * 2 * amp * Math.min(len, 6);
      out.push(x0, y0, (x0 + x1) / 2 - dy / (len || 1) * k, (y0 + y1) / 2 + dx / (len || 1) * k);
    }
    a = out; amp *= .55;
  }
  return a;
}

// Antarctica coast latitude as a function of longitude (rough).
function antLat(lon) {
  const k = [[-180, -78], [-160, -77.5], [-150, -76], [-130, -74.5], [-110, -74], [-90, -72.8], [-75, -73], [-65, -66], [-60, -63.5], [-57, -64], [-60, -70],
    [-50, -77.5], [-35, -77.5], [-25, -75], [-15, -72], [0, -70], [20, -69.8], [40, -69], [55, -67], [70, -68.5], [80, -67], [100, -66], [120, -66.5],
    [140, -66.5], [160, -70], [170, -72], [180, -78]];
  for (let i = 0; i < k.length - 1; i++) if (lon >= Math.min(k[i][0], k[i + 1][0]) && lon <= Math.max(k[i][0], k[i + 1][0]) && k[i][0] < k[i + 1][0]) { const f = (lon - k[i][0]) / (k[i + 1][0] - k[i][0]); return k[i][1] + (k[i + 1][1] - k[i][1]) * f; }
  return -72;
}

// Antique palette tints per region (hand-coloured outline washes)
const TINTS = { am: '#c98f86', gr: '#d9d2bd', sa: '#9fb46e', as: '#d6bf62', af: '#cfa66c', eu: '#c4707c', au: '#cf9f70' };
const EU_BOX = (lon, lat) => lon > -12 && lon < 45 && lat > 35 && lat < 72; // Europe gets its own tint inside eurasia

// Paint an antique-globe equirectangular map. x: 2D context, W x H canvas (2:1). fbm: optional noise f(u,v)->[-1,1]
export function paintGlobeMap(x, W, H, { fbm = null, labels = true, seed = 1 } = {}) {
  const P = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  const path = (pts, off = 0) => { x.beginPath(); for (let i = 0; i < pts.length; i += 2) { const [px, py] = P(pts[i] + off, pts[i + 1]); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  const each = (pts, fn) => { for (const off of [-360, 0, 360]) { path(pts, off); fn(); } };
  const s = W / 2048;

  // ocean
  const og = x.createLinearGradient(0, 0, 0, H); og.addColorStop(0, '#7f9f98'); og.addColorStop(.5, '#86a8a1'); og.addColorStop(1, '#7c9a93');
  x.fillStyle = og; x.fillRect(0, 0, W, H);
  // water-lining (engraved concentric coast lines)
  LAND.forEach((l, i) => { if (!l[3]) { l[2] = roughen(l[2], 2, .14, i + 1); l[3] = 1; } });
  const allLand = [...LAND.map(l => l[2])];
  x.lineJoin = 'round';
  for (const [w, a] of [[26, .07], [17, .09], [10, .12], [5, .16]]) {
    x.strokeStyle = `rgba(52,82,82,${a})`; x.lineWidth = w * s;
    for (const pts of allLand) each(pts, () => x.stroke());
  }
  // land: cream paper with hand-tinted border wash
  for (const [name, tint, pts] of LAND) {
    each(pts, () => { x.fillStyle = '#f1e7cb'; x.fill(); });
  }
  // tint washes: stroke inside (clipped) with region colour
  const EU = [-14, 73, 62, 73, 60, 68, 59, 60, 60, 55, 57, 51, 52, 47.5, 48, 45, 46, 43.5, 42, 42.2, 40, 41.2, 29, 41.2, 26, 39, 20, 33, -14, 33];
  for (const [name, tint, pts] of LAND) {
    for (const off of [-360, 0, 360]) {
      x.save(); path(pts, off); x.clip();
      const tc = TINTS[tint];
      if (name === 'eurasia') { x.save(); path(EU, off); x.clip(); x.globalAlpha = .55; x.strokeStyle = TINTS.eu; x.lineWidth = 22 * s; path(pts, off); x.stroke(); x.globalAlpha = .24; x.fillStyle = TINTS.eu; x.fillRect(-W, 0, 3 * W, H); x.restore(); }
      x.strokeStyle = tc; x.globalAlpha = .55; x.lineWidth = 22 * s; path(pts, off); x.stroke();
      x.globalAlpha = .22; x.fillStyle = tc; x.fill();
      x.restore();
    }
  }
  // Europe / Asia boundary (Urals, Caspian, Caucasus) as an engraved dotted line
  x.save(); x.setLineDash([3 * s, 5 * s]); x.strokeStyle = 'rgba(110,50,40,.7)'; x.lineWidth = 2.2 * s; x.beginPath();
  [[68, 68.3], [60, 68], [59, 60], [60, 55], [57, 51], [52, 47.5], [48, 45.6]].forEach(([lo, la], i) => { const [px, py] = P(lo, la); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
  x.beginPath(); [[47.5, 43], [44, 42.6], [41.6, 42.6]].forEach(([lo, la], i) => { const [px, py] = P(lo, la); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.restore();
  x.globalAlpha = 1;
  // lakes / inland seas
  for (const pts of LAKES) each(pts, () => { x.fillStyle = '#86a8a1'; x.fill(); x.strokeStyle = 'rgba(70,50,30,.75)'; x.lineWidth = 1.6 * s; x.stroke(); });
  // coastlines
  x.strokeStyle = 'rgba(78,52,30,.9)'; x.lineWidth = 2.2 * s;
  for (const pts of allLand) each(pts, () => x.stroke());
  // Antarctica (bottom band)
  x.beginPath(); x.moveTo(0, H); for (let lon = -180; lon <= 180; lon += 2) { const [px, py] = P(lon, antLat(lon)); x.lineTo(px, py); } x.lineTo(W, H); x.closePath();
  x.fillStyle = '#e9dfc4'; x.fill(); x.strokeStyle = 'rgba(78,52,30,.8)'; x.stroke();

  // graticule every 15°, gore seams every 30°
  x.strokeStyle = 'rgba(70,48,28,.32)'; x.lineWidth = 1.3 * s;
  for (let lon = -180; lon <= 180; lon += 15) { const [px] = P(lon, 0); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15) { const [, py] = P(0, lat); x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
  // equator with chequered degree band
  { const [, ey] = P(0, 0); x.fillStyle = 'rgba(60,40,22,.85)'; x.fillRect(0, ey - 3 * s, W, 6 * s); x.fillStyle = '#efe0b6';
    for (let lon = -180; lon < 180; lon += 5) { if ((lon / 5) % 2) { const [px] = P(lon, 0); x.fillRect(px, ey - 1.6 * s, W / 72, 3.2 * s); } } }
  // tropics & polar circles (dashed)
  x.setLineDash([10 * s, 7 * s]); x.strokeStyle = 'rgba(120,40,30,.55)'; x.lineWidth = 1.6 * s;
  for (const lat of [23.44, -23.44, 66.56, -66.56]) { const [, py] = P(0, lat); x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
  x.setLineDash([]);
  // ecliptic band
  x.strokeStyle = 'rgba(150,60,40,.32)'; x.lineWidth = 4 * s; x.beginPath();
  for (let lon = -180; lon <= 180; lon += 2) { const [px, py] = P(lon, 23.44 * Math.sin(lon * Math.PI / 180)); lon === -180 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke();

  // compass roses
  const rose = (lon, lat, r) => { const [cx, cy] = P(lon, lat); x.save(); x.translate(cx, cy); x.scale(1 / Math.cos(lat * Math.PI / 180), 1);
    x.strokeStyle = 'rgba(70,48,28,.55)'; x.lineWidth = 1.2 * s; x.beginPath(); x.arc(0, 0, r * 1.05, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 16; i++) { x.save(); x.rotate(i * Math.PI / 8); const L = i % 4 === 0 ? r : i % 2 === 0 ? r * .62 : r * .4; x.fillStyle = i % 2 ? 'rgba(160,70,50,.6)' : 'rgba(70,48,28,.7)';
      x.beginPath(); x.moveTo(0, -L); x.lineTo(r * .08, 0); x.lineTo(-r * .08, 0); x.closePath(); x.fill(); x.restore(); }
    x.restore(); };
  rose(-150, 20, 60 * s); rose(-28, -25, 52 * s); rose(75, -30, 48 * s);

  // labels (compensate horizontal squash at latitude)
  if (labels) {
    const lab = (str, lon, lat, size, ital = false, color = 'rgba(70,40,22,.8)', sp = 6) => { const [cx, cy] = P(lon, lat); x.save(); x.translate(cx, cy); x.scale(1 / Math.cos(lat * Math.PI / 180), 1);
      x.font = `${ital ? 'italic ' : ''}700 ${size * s}px "Playfair Display"`; if ('letterSpacing' in x) x.letterSpacing = sp * s + 'px'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(str, 0, 0); x.restore(); };
    lab('EUROPE', 27, 54, 20); lab('ASIA', 95, 50, 34); lab('AFRICA', 18, 12, 30); lab('NORTH', -106, 55, 24); lab('AMERICA', -104, 49, 24);
    lab('SOUTH', -60, -12, 22); lab('AMERICA', -60, -18, 22); lab('AUSTRALIA', 134, -26, 20); lab('ARABIA', 48.5, 20.5, 14);
    lab('Atlantic Ocean', -38, 28, 22, true, 'rgba(40,62,64,.75)', 4); lab('Pacific Ocean', -140, -8, 26, true, 'rgba(40,62,64,.75)', 6);
    lab('Indian Ocean', 78, -12, 22, true, 'rgba(40,62,64,.75)', 4);
  }
  // varnish ageing: low-res noise multiplied over the map (+ a few foxing spots)
  if (fbm) {
    const nw = 512, nh = 256, nc = document.createElement('canvas'); nc.width = nw; nc.height = nh; const nx = nc.getContext('2d'); const im = nx.createImageData(nw, nh);
    for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) { const n = fbm(i / nw, j / nh); const k = 0.86 + n * 0.16; const p = (j * nw + i) * 4; im.data[p] = 255 * Math.min(1, k * 1.03); im.data[p + 1] = 255 * Math.min(1, k * .97); im.data[p + 2] = 255 * Math.min(1, k * .82); im.data[p + 3] = 255; }
    nx.putImageData(im, 0, 0); x.save(); x.globalCompositeOperation = 'multiply'; x.drawImage(nc, 0, 0, W, H);
    let sd = seed * 9.1; const r = () => { sd += 1; const v = Math.sin(sd * 91.7) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < 40; i++) { const cx = r() * W, cy = r() * H, rr = (4 + r() * 18) * s; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(150,110,60,.35)'); g.addColorStop(1, 'rgba(150,110,60,0)'); x.fillStyle = g; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    x.restore();
  }
  // gore seams (faint) every 30°
  x.strokeStyle = 'rgba(255,240,200,.18)'; x.lineWidth = 1 * s;
  for (let lon = -165; lon <= 180; lon += 30) { const [px] = P(lon, 0); x.beginPath(); x.moveTo(px, P(0, 70)[1]); x.lineTo(px, P(0, -70)[1]); x.stroke(); }
}

// local unit vector for (lat, lon) on a THREE.SphereGeometry with this map (u=0 at lon -180)
export function latLonDir(lat, lon) { const a = lat * Math.PI / 180, b = lon * Math.PI / 180; return [Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)]; }

// =====================================================================================================
// (5) Timing helpers
// Monotone cubic (Fritsch–Carlson) interpolation through [[t, v], ...]: smooth velocity, no overshoot.
// Outside the key range it extrapolates linearly with the end slopes (so motion continues through handles).
export function monoSpline(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]); const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return t => {
    if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]);
    if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]);
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
function fbmS(x, seed) { const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); }; let a = 0, amp = .5, f = 1; for (let o = 0; o < 3; o++) { const X = x * f, i = Math.floor(X), u = X - i, w = u * u * (3 - 2 * u); a += amp * ((h(i + o * 17) * (1 - w) + h(i + 1 + o * 17) * w) * 2 - 1); amp *= .5; f *= 2; } return a; }
// Camera on Catmull-Rom position/look paths; progress u(t) from monotone keys [[t,u],...]
export function camPath(camera, o) {
  const pc = new THREE.CatmullRomCurve3(o.pos.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const lc = new THREE.CatmullRomCurve3(o.look.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const u = monoSpline(o.keys);
  return {
    pc, lc, u,
    update(t) {
      const k = clamp(u(t)); const P = pc.getPoint(k), L = lc.getPoint(k);
      if (o.shake) { const a = o.shake.amp ?? .004, f = o.shake.freq ?? .5; P.add(new THREE.Vector3(fbmS(t * f, 3) * a, fbmS(t * f, 8) * a, fbmS(t * f, 13) * a * .5)); }
      camera.position.copy(P); camera.lookAt(L); if (o.roll) camera.rotateZ(o.roll(t));
      if (o.fov) { camera.fov = o.fov(t); camera.updateProjectionMatrix(); }
      return { P, L, k };
    },
  };
}

// =====================================================================================================
// (2) Period props
export const GMAT = {
  mahogany: (o = {}) => M.MAT.wood({ a: o.a ?? '#8e3f20', b: o.b ?? '#4b1a0b', rings: o.rings ?? 14, seed: o.seed ?? 41, clearcoat: o.clearcoat ?? .55, repeat: o.repeat }),
  brass: (o = {}) => M.MAT.brass(o),
  clay: () => new THREE.MeshPhysicalMaterial({ color: '#ece4d2', roughness: .62, sheen: .4, sheenColor: new THREE.Color('#fff4e0'), clearcoat: .15 }),
};

// Brass candlestick (turned) with a wax candle. Lights are left to the scene (budget). userData.flameY = local flame height.
export function candlestick(o = {}) {
  const g = new THREE.Group(); const brass = o.material ?? M.MAT.brass({ a: '#d9ad55', b: '#8a6022' });
  const S = o.stemH ?? .13; // stem height scale
  const prof = [[0, 0], [.058, 0], [.063, .004], [.061, .011], [.05, .014], [.026, .018], [.018, .026], [.014, .04], [.021, .05], [.013, .062],
    [.011, .06 + S * .45], [.017, .07 + S * .5], [.011, .08 + S * .55], [.012, .07 + S * .9], [.03, .07 + S], [.034, .074 + S], [.03, .078 + S],
    [.017, .08 + S], [.016, .1 + S], [.0135, .1 + S], [.0135, .086 + S], [0, .086 + S]];
  const body = M.lathe(prof, brass, 40); g.add(body);
  const cH = o.candleH ?? .17; const c = M.candle({ height: cH, radius: .0128, light: false, seed: o.seed ?? 3, color: o.wax ?? '#efe2c6', flameHeight: o.flameH ?? .042 });
  c.position.y = .086 + S; g.add(c);
  g.userData.flame = c.userData.flame; g.userData.glow = c.userData.glow; g.userData.flameY = .086 + S + cH + .03;
  return M.shadowAll(g);
}

// Low brass chamberstick (dish + ring handle + short candle). userData.flameY = local flame height.
export function chamberstick(o = {}) {
  const g = new THREE.Group(); const brass = o.material ?? M.MAT.brass({ a: '#d9ad55', b: '#8a6022' });
  g.add(M.lathe([[0, 0], [.07, 0], [.074, .004], [.072, .014], [.066, .016], [.064, .008], [.02, .009], [.016, .02], [.018, .045], [.022, .05], [.0135, .052], [.0135, .03], [0, .03]], brass, 40));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.017, .004, 8, 20), brass); handle.position.set(.082, .012, 0); handle.rotation.x = Math.PI / 2; g.add(handle);
  const cH = o.candleH ?? .1; const c = M.candle({ height: cH, radius: .0128, light: false, seed: o.seed ?? 5, color: o.wax ?? '#efe2c6', flameHeight: o.flameH ?? .04 });
  c.position.y = .03; g.add(c); g.userData.flame = c.userData.flame; g.userData.glow = c.userData.glow; g.userData.flameY = .03 + cH + .028;
  return M.shadowAll(g);
}

// Feather quill (goose primary): curved rachis + asymmetric alpha-textured vane.
let _vaneTex = null;
function vaneTex() {
  if (_vaneTex) return _vaneTex;
  _vaneTex = TEX.drawTexture(128, 512, (x, W, H) => {
    x.clearRect(0, 0, W, H); const r = rng(77);
    for (let i = 0; i < 260; i++) {
      const v = i / 260; const y = H * (1 - v);
      const prof = Math.sin(Math.min(1, v * 1.25) * Math.PI * .5) * (1 - Math.pow(v, 5));
      const wl = prof * W * .2, wr = prof * W * .44; const gap = r() < .04 ? 1 : 0; if (gap) continue;
      const tone = 220 + r() * 30 - v * 30; x.strokeStyle = `rgba(${tone},${tone - 8},${tone - 22},${.85 + r() * .15})`; x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(W / 2, y); x.quadraticCurveTo(W / 2 - wl * .5, y - 6, W / 2 - wl, y - 16 - r() * 4); x.stroke();
      x.beginPath(); x.moveTo(W / 2, y); x.quadraticCurveTo(W / 2 + wr * .5, y - 6, W / 2 + wr, y - 20 - r() * 5); x.stroke();
    }
    // after-feather fluff near the base
    for (let i = 0; i < 40; i++) { const y = H * (.95 - r() * .1); x.strokeStyle = 'rgba(235,228,214,.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2, y); x.lineTo(W / 2 + (r() - .5) * W * .5, y - r() * 20); x.stroke(); }
    // rachis
    const gr = x.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, 'rgba(240,232,214,1)'); gr.addColorStop(1, 'rgba(200,190,170,1)');
    x.strokeStyle = gr; x.lineWidth = 5; x.beginPath(); x.moveTo(W / 2, H); x.lineTo(W / 2, 0); x.stroke();
  });
  return _vaneTex;
}
export function quill(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? .3; const bend = o.bend ?? .03;
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, L * .33, bend * .3), new THREE.Vector3(0, L * .66, bend * .8), new THREE.Vector3(0, L, bend * 1.6)];
  const curve = new THREE.CatmullRomCurve3(pts);
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .0021, 6), new THREE.MeshPhysicalMaterial({ color: '#efe6d2', roughness: .4, clearcoat: .6, transmission: 0 })); g.add(shaft);
  const nib = new THREE.Mesh(new THREE.ConeGeometry(.0021, .012, 6), new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: .4 })); nib.rotation.x = Math.PI; nib.position.y = -.005; g.add(nib);
  // vane: strip mesh hugging the feather outline (asymmetric), bent along the rachis curve
  const vl = L * .78, N = 28, verts = [], uvs = [], idx = [];
  for (let k = 0; k <= N; k++) {
    const v = k / N, prof = Math.sin(Math.min(1, v * 1.25) * Math.PI * .5) * (1 - Math.pow(v, 5)) + .02;
    const wl = prof * L * .17 * .2 * 1.15, wr = prof * L * .17 * .44 * 1.15; const s0 = (L - vl + v * vl) / L; const c = curve.getPoint(clamp(s0));
    for (const [xx, uu] of [[-wl, .5 - prof * .2 * 1.15], [0, .5], [wr, .5 + prof * .44 * 1.15]]) { verts.push(xx + L * .0, c.y + Math.abs(xx) * .35, c.z + Math.abs(xx) * .25 - xx * .05); uvs.push(uu, v * .97); }
    if (k < N) { const b0 = k * 3; idx.push(b0, b0 + 3, b0 + 1, b0 + 1, b0 + 3, b0 + 4, b0 + 1, b0 + 4, b0 + 2, b0 + 2, b0 + 4, b0 + 5); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const vane = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: vaneTex(), alphaTest: .3, side: THREE.DoubleSide, roughness: .75, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .5 }));
  g.add(vane);
  return M.shadowAll(g);
}

// Handwritten-looking (NOT readable) ink lines on paper.
export function manuscriptTex(o = {}) {
  const W = o.w ?? 512, H = o.h ?? 700; const r = rng(o.seed ?? 5);
  return TEX.drawTexture(W, H, (x) => {
    const pg = x.createLinearGradient(0, 0, W, H); pg.addColorStop(0, o.paper ?? '#f2e6c9'); pg.addColorStop(1, o.paper2 ?? '#e6d4ae'); x.fillStyle = pg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const cx = r() * W, cy = r() * H, rr = 10 + r() * 40; const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gg.addColorStop(0, 'rgba(160,120,70,.06)'); gg.addColorStop(1, 'rgba(160,120,70,0)'); x.fillStyle = gg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    const lines = o.lines ?? 24, top = H * (o.top ?? .1), lh = (H * (o.bottom ?? .9) - top) / lines; x.strokeStyle = o.ink ?? 'rgba(52,36,24,.62)'; x.lineCap = 'round';
    for (let l = 0; l < lines; l++) {
      if (o.stopAt && l > lines * o.stopAt) break;
      const y0 = top + l * lh; let xx = W * .1 + (l === 0 || r() < .12 ? W * .06 : 0); const xe = W * (.86 + r() * .05) - (r() < .15 ? W * r() * .4 : 0);
      x.lineWidth = 1.3 + r() * .5; x.beginPath(); x.moveTo(xx, y0);
      while (xx < xe) { const sw = 3 + r() * 6, hh = lh * (.18 + r() * .3) * (r() < .12 ? 1.8 : 1); x.bezierCurveTo(xx + sw * .3, y0 - hh, xx + sw * .7, y0 - hh, xx + sw, y0 + r() * 1.2); xx += sw; if (r() < .12) { xx += 6 + r() * 6; x.moveTo(xx, y0); } }
      x.stroke();
    }
  });
}

// Stack of paper (manuscript) with a few loose top sheets.
export function paperStack(o = {}) {
  const g = new THREE.Group(); const w = o.w ?? .2, d = o.d ?? .28, h = o.h ?? .03; const r = rng(o.seed ?? 9);
  const edge = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#eadcbc'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(110,80,45,${.06 + r() * .12})`; x.fillRect(0, i, W, 1); } });
  const body = new THREE.Mesh(M.rbox(w, h, d, .0025, 2), new THREE.MeshStandardMaterial({ map: edge, roughness: .95 })); body.position.y = h / 2; g.add(body);
  const n = o.sheets ?? 3; const top = [];
  for (let i = 0; i < n; i++) {
    const geo = new THREE.PlaneGeometry(w * .99, d * .99, 8, 8); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position; const curl = (o.curl ?? .012) * (.4 + r());
    for (let k = 0; k < p.count; k++) { const xx = p.getX(k) / w + .5, zz = p.getZ(k) / d + .5; p.setY(k, Math.pow(Math.max(0, xx - .7) / .3, 2) * curl * (.5 + zz * .5)); }
    geo.computeVertexNormals();
    const tex = (i === n - 1 && o.topTex) ? o.topTex : manuscriptTex({ seed: (o.seed ?? 9) * 7 + i, lines: 26 });
    const sh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .9, side: THREE.DoubleSide }));
    sh.position.set((r() - .5) * .012, h + .0008 + i * .0009, (r() - .5) * .012); sh.rotation.y = (r() - .5) * .08; g.add(sh); top.push(sh);
  }
  g.userData.topY = h + n * .0009; g.userData.sheets = top;
  return M.shadowAll(g);
}

// Leather/cloth bound book with drawn spine (on a flattened round spine) and optional cover art.
// Spine at -x, front cover at +z, fore-edge at +x. o: {w,h,d,a,b (leather colours), spineDraw(x,W,H), coverDraw(x,W,H), raised(bands)}
export function tome(o = {}) {
  const g = new THREE.Group(); const w = o.w ?? .16, h = o.h ?? .24, d = o.d ?? .04, ct = o.ct ?? .004;
  const leather = o.material ?? M.MAT.leather({ a: o.a ?? '#7a3a1c', b: o.b ?? '#3e180a', seed: o.seed ?? 13 });
  const pageTex = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#ecdfc0'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(120,90,50,${0.07 + (i % 6 === 0 ? .08 : 0)})`; x.fillRect(0, i, W, 1); } });
  const pages = new THREE.Mesh(M.rbox(w - .008, h - .012, d - ct * 2, .002, 2), new THREE.MeshStandardMaterial({ map: pageTex, roughness: .95 })); pages.position.x = .002; g.add(pages);
  const front = new THREE.Mesh(M.rbox(w, h, ct, .0018, 2), leather); front.position.z = d / 2 - ct / 2; g.add(front);
  const back = front.clone(); back.position.z = -d / 2 + ct / 2; g.add(back);
  const sw = o.spineFlat ?? .45;
  let spineMat = leather;
  if (o.spineDraw) {
    const SW = 256, SH = Math.round(256 * h / (Math.PI * d / 2) * 1.0);
    const tex = TEX.drawTexture(SW, Math.min(2048, SH), (x, W, H) => { x.fillStyle = o.spineBg ?? o.a ?? '#7a3a1c'; x.fillRect(0, 0, W, H); const r = rng(o.seed ?? 3); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * W, r() * H, 2 + r() * 6, 2 + r() * 6); } o.spineDraw(x, W, H); });
    tex.anisotropy = 8;
    spineMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffd8b0'), sheenRoughness: .6, clearcoat: .15 });
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 28, 1, true, Math.PI, Math.PI), spineMat); spine.scale.x = sw; spine.position.x = -w / 2 + .001; g.add(spine);
  if (o.raised) { const bg = new THREE.Group(); bg.position.x = -w / 2 + .001; bg.scale.x = sw; g.add(bg);
    for (const yy of o.raised) { const band = new THREE.Mesh(new THREE.TorusGeometry(d / 2, o.bandR ?? .0024, 6, 28, Math.PI), o.bandMat ?? spineMat); band.rotation.set(Math.PI / 2, 0, Math.PI / 2); band.position.y = yy * h; bg.add(band); } }
  if (o.coverDraw) {
    const tex = TEX.drawTexture(512, Math.round(512 * h / w), o.coverDraw); tex.anisotropy = 8;
    const cv = new THREE.Mesh(new THREE.PlaneGeometry(w * .985, h * .985), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .45, metalness: .25, clearcoat: .2 }));
    cv.position.z = d / 2 + .0004; cv.userData.depthOk = true; g.add(cv);
  }
  return M.shadowAll(g);
}

// Long white clay "churchwarden" pipe resting on its side; bowl at +x. userData.bowlTop = local top of bowl.
export function clayPipe(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? .34; const clay = GMAT.clay();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .004, 0), new THREE.Vector3(L * .4, .006, .01), new THREE.Vector3(L * .8, .012, .006), new THREE.Vector3(L, .02, 0)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .0042, 8), clay); g.add(stem);
  const bowl = M.lathe([[0, 0], [.006, .001], [.0105, .008], [.0135, .022], [.0145, .034], [.0135, .038], [.011, .038], [.0105, .03], [.008, .012], [0, .011]], clay, 24);
  bowl.position.set(L + .006, .012, 0); bowl.rotation.z = -.12; g.add(bowl);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(.0102, 16), new THREE.MeshStandardMaterial({ color: '#2a221c', roughness: 1, emissive: '#ff5a1a', emissiveIntensity: .0 })); ash.rotation.x = -Math.PI / 2; ash.position.set(0, .031, 0); bowl.add(ash);
  const ember = new THREE.Mesh(new THREE.CircleGeometry(.0045, 12), new THREE.MeshBasicMaterial({ color: '#ff6a24', transparent: true, opacity: .55 })); ember.rotation.x = -Math.PI / 2; ember.position.set(.002, .0315, .001); bowl.add(ember);
  g.userData.bowlTop = new THREE.Vector3(L + .006 + .004, .052, 0); g.userData.ember = ember;
  return M.shadowAll(g);
}

// Brass dividers (map compass) lying flat.
export function dividers(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? .16; const brass = M.MAT.brass({ a: '#d8b062', b: '#8c6326' }); const steel = M.MAT.steel();
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.0035, .0018, L, 8), brass); leg.rotation.z = Math.PI / 2; leg.rotation.y = s * .12; leg.position.set(L / 2, .004, s * L * .06); g.add(leg); const tip = new THREE.Mesh(new THREE.ConeGeometry(.0018, .02, 6), steel); tip.rotation.z = -Math.PI / 2; tip.position.set(L + .008, .004, s * L * .12); g.add(tip); }
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .008, 20), brass); hinge.position.y = .004; g.add(hinge);
  return M.shadowAll(g);
}

// =====================================================================================================
// (3) FX
// Thin rising smoke wisp (pipe / snuffed candle). Plane billboarded around Y. o: {w,h,color,opacity}
export function smokeWisp(o = {}) {
  const w = o.w ?? .12, h = o.h ?? .4; const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const u = { time: { value: 0 }, color: { value: new THREE.Color(o.color ?? '#d9dde6') }, opacity: { value: o.opacity ?? .35 }, seed: { value: o.seed ?? 1 }, aspect: { value: h / w } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time, opacity, seed, aspect; uniform vec3 color; varying vec2 vUv;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0., w = .5; for (int i = 0; i < 4; i++){ a += w*vn(p); p = p*2.03 + 7.1; w *= .5; } return a; }
      void main(){
        float y = vUv.y; float tt = time + seed*13.;
        vec2 p = vec2((vUv.x - .5), y*aspect*.5);           // ~isotropic coords (units of plane width)
        float rise = tt*.55;
        // laminar near the bowl, increasingly turbulent above
        float turb = smoothstep(.03, .35, y);
        float sway = (fbm(vec2(y*1.6 - rise*.6, seed)) - .5) * 1.4 * turb;
        float curl = sin(y*aspect*2.4 - rise*3.1 + fbm(vec2(y*3., seed + 3.)) * 4.) * .09 * turb;
        float x = p.x - sway*.45 - curl;
        float wid = .015 + .16*turb*y;
        float band = exp(-x*x/(wid*wid));
        float fil = fbm(vec2(x*7. + seed, y*aspect*1.2 - rise*1.4));
        float strands = smoothstep(.38, .72, fil);
        float a = band * mix(1., strands*1.6, turb) * smoothstep(0., .025, y) * (1. - smoothstep(.35, .98, y)) * opacity;
        gl_FragColor = vec4(color, a); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.userData.uniforms = u; mesh.userData.yBillboard = true; mesh.userData.noDepth = true; mesh.renderOrder = 12;
  return mesh;
}

// Pleated curtain that sways gently (CPU-deformed grid, cheap). Hangs from y=0 down to -h, width w along x.
export function curtain(o = {}) {
  const w = o.w ?? .6, h = o.h ?? 2, nx = 28, ny = 24; const geo = new THREE.PlaneGeometry(w, h, nx, ny); geo.translate(0, -h / 2, 0);
  const base = geo.attributes.position.array.slice();
  const t = TEX.fabric({ a: o.a ?? '#6b2a24', b: o.b ?? '#3e1310', weave: 160, seed: o.seed ?? 19 });
  const mat = new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, sheen: 1, sheenColor: new THREE.Color(o.sheen ?? '#ffb8a0'), sheenRoughness: .45, side: THREE.DoubleSide, color: o.tint ?? '#ffffff' });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  const pleats = o.pleats ?? 7, depth = o.depth ?? .035, amp = o.sway ?? .02;
  mesh.userData.update = (time) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x0 = base[i * 3], y0 = base[i * 3 + 1]; const fy = -y0 / h; // 0 top .. 1 bottom
      const pl = Math.sin((x0 / w + .5) * pleats * Math.PI * 2) * depth * (1 - fy * .3);
      const sway = (Math.sin(time * 1.1 + x0 * 3 + (o.seed ?? 0)) * .6 + Math.sin(time * 2.3 + x0 * 7) * .25) * amp * fy * fy;
      p.setXYZ(i, x0 + sway * .3, y0, pl + sway);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  mesh.userData.update(0);
  return mesh;
}

// =====================================================================================================
// (4) Kurzgesagt overlay: location tag + name card (shared by s16 & s17 for a matching design)
function rr(X, x, y, w, h, r) { X.beginPath(); X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r); X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath(); }
export function locTag(ui, t, o) {
  const e = ui.env(t, o.t0, o.t1 ?? Infinity, .45, 'pop'); if (e.o <= .001) return;
  const X = ui.ctx; X.save(); X.globalAlpha = e.o; const x0 = o.x ?? 110, y0 = o.y ?? 268; const sz = o.size ?? 36;
  X.font = `800 ${sz}px "Nunito"`; if ('letterSpacing' in X) X.letterSpacing = '3px'; const tw = X.measureText(o.text).width;
  const pw = tw + sz * 2.6, ph = sz * 1.7; const s = e.s; X.translate(x0, y0); X.scale(s, s);
  X.fillStyle = o.bg ?? 'rgba(16,20,34,.62)'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 18; X.shadowOffsetY = 6; rr(X, 0, -ph / 2, pw, ph, ph / 2); X.fill(); X.shadowColor = 'transparent';
  // map pin
  const px = sz * .95, py = -sz * .06, pr = sz * .32; X.fillStyle = o.accent ?? '#ffcf6b'; X.beginPath(); X.arc(px, py - pr * .35, pr, Math.PI * .85, Math.PI * 2.15); X.lineTo(px, py + pr * 1.25); X.closePath(); X.fill();
  X.fillStyle = o.bg2 ?? '#1b2030'; X.beginPath(); X.arc(px, py - pr * .35, pr * .42, 0, Math.PI * 2); X.fill();
  X.fillStyle = o.color ?? '#fff4dc'; X.textBaseline = 'middle'; X.textAlign = 'left'; X.fillText(o.text, sz * 1.75, 2);
  X.restore();
}
// Name card. o: {y (top), tCard, tName, tWork, name, sub, work, accent, bg, t1, icon:true}
// returns the screen point at the end of the work line (for a callout) or null
export function nameCard(ui, t, o) {
  const X = ui.ctx; const e = ui.env(t, o.tCard, o.t1 ?? Infinity, .5, 'fade'); if (e.o <= .001) return null;
  const x0 = o.x ?? 100, y0 = o.y ?? 300, w = o.w ?? 880, h = o.h ?? 292;
  const grow = ease.outCubic(clamp((t - o.tCard) / .5));
  X.save(); X.globalAlpha = e.o;
  X.fillStyle = o.bg ?? 'rgba(14,18,30,.66)'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 30; X.shadowOffsetY = 10;
  rr(X, x0, y0 + (1 - grow) * h * .25, w, h * (.5 + .5 * grow), 30); X.fill(); X.shadowColor = 'transparent';
  // accent bar (left)
  X.fillStyle = o.accent ?? '#ffcf6b'; rr(X, x0 + 22, y0 + 30 + (1 - grow) * (h - 60) / 2, 9, (h - 60) * grow, 4.5); X.fill();
  X.restore();
  // name (auto-fit)
  const nx = x0 + 58; let ns = o.nameSize ?? 86; X.save(); X.font = `900 ${ns}px "Nunito"`; if ('letterSpacing' in X) X.letterSpacing = '3px'; while (X.measureText(o.name).width > w - 90 && ns > 40) { ns -= 2; X.font = `900 ${ns}px "Nunito"`; } X.restore();
  ui.text(o.name, { t, t0: o.tName, t1: o.t1, x: nx, y: y0 + 80, size: ns, weight: 900, color: o.nameColor ?? '#fff4dc', align: 'left', anim: o.nameAnim ?? 'rise', letterSpacing: 3, shadowBlur: 10, maxWidth: 2000 });
  ui.text(o.sub, { t, t0: o.tCard + .08, t1: o.t1, x: nx, y: y0 + 156, size: o.subSize ?? 50, weight: 800, color: o.accent ?? '#ffcf6b', align: 'left', anim: 'rise', shadowBlur: 8, maxWidth: 2000 });
  // divider + work line with a small book glyph
  const ew = ease.outCubic(clamp((t - o.tWork) / .45)); const ee = ui.env(t, o.tWork, o.t1 ?? Infinity, .45, 'fade');
  let end = null;
  if (ee.o > .001) {
    X.save(); X.globalAlpha = ee.o * .55; X.strokeStyle = o.accent ?? '#ffcf6b'; X.lineWidth = 2; X.beginPath(); X.moveTo(nx, y0 + 198); X.lineTo(nx + (w - 110) * ew, y0 + 198); X.stroke(); X.restore();
    X.save(); X.globalAlpha = ee.o; const bx = nx, by = y0 + 244; X.fillStyle = o.accent ?? '#ffcf6b';
    X.beginPath(); X.moveTo(bx, by - 13); X.lineTo(bx + 12, by - 16); X.lineTo(bx + 24, by - 13); X.lineTo(bx + 24, by + 14); X.lineTo(bx + 12, by + 11); X.lineTo(bx, by + 14); X.closePath(); X.fill();
    X.strokeStyle = o.bg2 ?? 'rgba(14,18,30,.9)'; X.lineWidth = 2; X.beginPath(); X.moveTo(bx + 12, by - 15); X.lineTo(bx + 12, by + 10); X.stroke(); X.restore();
    let ws = o.workSize ?? 42; X.save(); X.font = `italic 500 ${ws}px "Lora"`; while (X.measureText(o.work).width > w - 150 && ws > 24) { ws -= 1; X.font = `italic 500 ${ws}px "Lora"`; } const ww = X.measureText(o.work).width; X.restore();
    ui.text(o.work, { t, t0: o.tWork, t1: o.t1, x: nx + 40, y: y0 + 244, size: ws, weight: 500, family: 'Lora', italic: true, color: '#fff4dc', align: 'left', anim: 'wipe', shadow: false, maxWidth: 2000 });
    end = [nx + 40 + ww * ew, y0 + 244];
  }
  return end;
}
// Dashed callout line from a screen point to a projected 3D anchor, with a ring-dot at the anchor.
export function pointer(ui, t, o) {
  const p = ease.outCubic(clamp((t - o.t0) / (o.dur ?? .55))); if (p <= 0) return; const e = ui.env(t, o.t0, o.t1 ?? Infinity, .3, 'fade'); if (e.o <= .001) return;
  const [ax, ay] = o.anchor.isVector3 ? ui.project(o.anchor) : o.anchor; const [sx, sy] = o.from; const X = ui.ctx;
  const ex = sx + (ax - sx) * p, ey = sy + (ay - sy) * p;
  X.save(); X.globalAlpha = e.o; X.strokeStyle = o.color ?? '#ffcf6b'; X.lineWidth = o.width ?? 3.5; X.setLineDash([10, 9]); X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 6;
  X.beginPath(); X.moveTo(sx, sy); X.lineTo(ex, ey); X.stroke(); X.setLineDash([]);
  if (p > .95) { const k = ease.outBack(clamp((t - o.t0 - (o.dur ?? .55)) / .3), 2.5); X.fillStyle = o.color ?? '#ffcf6b'; X.beginPath(); X.arc(ax, ay, 9 * k, 0, Math.PI * 2); X.fill(); X.lineWidth = 3; X.beginPath(); X.arc(ax, ay, 18 * k, 0, Math.PI * 2); X.stroke(); }
  X.restore();
}

// =====================================================================================================
// Skyline silhouette texture (transparent background): terrace houses with pitched/parapet roofs, chunky chimney stacks
// with pots on the party walls, optional spire, optional window grid (some candle-lit). Bottom fades toward `fog`.
export function skylineTex(o = {}) {
  const W = o.w ?? 1024, H = o.h ?? 512; const r = rng(o.seed ?? 4); const col = o.color ?? '#5d6672';
  return TEX.drawTexture(W, H, (x) => {
    x.clearRect(0, 0, W, H); const base = H * (o.base ?? .4); let px = -W * .02; const stacks = [];
    while (px < W) {
      const bw = W * (o.bw ?? .09) * (.7 + r() * .7), top = base - H * (.02 + r() * .14); const pitched = r() < .55;
      x.fillStyle = col; x.beginPath(); x.moveTo(px, H); x.lineTo(px, top);
      if (pitched) { x.lineTo(px + bw * .5, top - bw * .32); x.lineTo(px + bw, top); } else { x.lineTo(px + bw * .08, top - H * .015); x.lineTo(px + bw * .92, top - H * .015); x.lineTo(px + bw, top); }
      x.lineTo(px + bw, H); x.closePath(); x.fill();
      if (o.windows) { // window grid on the facade
        const cols = Math.max(2, Math.round(bw / (W * .028))), rows = 4, ww = bw / cols * .42, wh = H * .055;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const wx = px + (i + .5) * bw / cols - ww / 2, wy = top + H * .06 + j * H * .1; const lit = r() < (o.lit ?? .12);
          x.fillStyle = lit ? `rgba(255,${190 + r() * 30},${110 + r() * 30},${.6 + r() * .3})` : 'rgba(30,36,46,.35)'; x.fillRect(wx, wy, ww, wh); }
      }
      stacks.push([px, top - (pitched ? bw * .16 : 0)]); px += bw;
    }
    // chimney stacks on party walls
    x.fillStyle = col;
    for (const [sx, sy] of stacks) { if (r() < .25) continue; const cw = W * (.022 + r() * .02), ch = H * (.05 + r() * .06); x.fillRect(sx - cw / 2, sy - ch, cw, ch + H * .05); x.fillRect(sx - cw / 2 - W * .002, sy - ch, cw + W * .004, H * .008);
      const pots = 2 + Math.floor(r() * 4); for (let k = 0; k < pots; k++) { const pw = cw / pots * .62, ph = H * (.018 + r() * .02); x.fillRect(sx - cw / 2 + (k + .19) * cw / pots, sy - ch - ph, pw, ph); } }
    if (o.spire) { const sx = W * o.spire, sw = W * .035, sb = base - H * .12; x.fillRect(sx - sw / 2, sb - H * .16, sw, H * .5); x.fillRect(sx - sw * .6, sb - H * .17, sw * 1.2, H * .015); x.beginPath(); x.moveTo(sx - sw * .5, sb - H * .17); x.lineTo(sx, sb - H * .36); x.lineTo(sx + sw * .5, sb - H * .17); x.closePath(); x.fill(); }
    if (o.fog) { x.save(); x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, base, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, o.fog); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore(); }
    if (o.blur) { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; c2.getContext('2d').drawImage(x.canvas, 0, 0); x.clearRect(0, 0, W, H); x.filter = `blur(${o.blur}px)`; x.drawImage(c2, 0, 0); x.filter = 'none'; }
  });
}
// Condensation / fogged-glass texture for a sash with cols x rows panes (white with alpha; bottom of each pane fogged, droplets).
export function condensationTex(o = {}) {
  const cols = o.cols ?? 3, rows = o.rows ?? 2, W = o.w ?? 512, H = o.h ?? 512; const r = rng(o.seed ?? 8);
  return TEX.drawTexture(W, H, (x) => {
    x.clearRect(0, 0, W, H);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = i * W / cols, py = j * H / rows, pw = W / cols, ph = H / rows;
      const g = x.createLinearGradient(0, py + ph, 0, py); g.addColorStop(0, `rgba(235,240,245,${o.bottom ?? .55})`); g.addColorStop(.45, `rgba(235,240,245,${(o.bottom ?? .55) * .35})`); g.addColorStop(1, 'rgba(235,240,245,0.04)');
      x.fillStyle = g; x.fillRect(px, py, pw, ph);
      for (let k = 0; k < (o.drops ?? 22); k++) { const dx = px + r() * pw, dy = py + ph * (.55 + .45 * Math.pow(r(), .5)), dr = .6 + r() * 1.5; x.fillStyle = `rgba(255,255,255,${.12 + r() * .2})`; x.beginPath(); x.arc(dx, dy, dr, 0, 7); x.fill(); }
      // a couple of clear trickle streaks through the fog
      for (let k = 0; k < (o.streaks ?? 0); k++) { const sx = px + pw * (.15 + r() * .7); x.save(); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,.8)'; x.lineWidth = 2 + r() * 2; x.beginPath(); x.moveTo(sx, py + ph * (.2 + r() * .4)); x.bezierCurveTo(sx + 3, py + ph * .7, sx - 3, py + ph * .85, sx + 1, py + ph); x.stroke(); x.restore(); }
    }
  });
}

// =====================================================================================================
// Moon sprite (soft maria, limb darkening) for night skies.
export function moonSprite(o = {}) {
  const tex = TEX.drawTexture(256, 256, (x, W, H) => {
    x.clearRect(0, 0, W, H); const cx = W / 2, R = W * .46; const g = x.createRadialGradient(cx * .92, cx * .9, 0, cx, cx, R); g.addColorStop(0, '#fbfaf2'); g.addColorStop(.8, '#e9ead9'); g.addColorStop(1, '#c9cbbb');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cx, R, 0, 7); x.fill(); x.save(); x.clip();
    const r = rng(o.seed ?? 3); x.fillStyle = 'rgba(120,125,130,.28)';
    for (const [mx, my, mr] of [[.38, .35, .16], [.55, .3, .12], [.6, .5, .14], [.42, .58, .1], [.3, .5, .08], [.68, .66, .07]]) { x.beginPath(); x.ellipse(W * mx, H * my, W * mr, W * mr * .8, r() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(150,150,150,${.08 + r() * .1})`; x.beginPath(); x.arc(cx + (r() - .5) * W * .8, cx + (r() - .5) * W * .8, 1 + r() * 4, 0, 7); x.fill(); }
    x.restore();
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: o.color ?? '#ffffff', fog: false, depthWrite: false })); s.scale.setScalar(o.size ?? 10); s.userData.noDepth = true; s.renderOrder = -900;
  return s;
}

// Tree / garden silhouette texture (transparent): rounded feathery crowns (acacia-like) on trunks + optional hedge/balustrade.
export function gardenTex(o = {}) {
  const W = o.w ?? 1024, H = o.h ?? 512; const r = rng(o.seed ?? 6);
  return TEX.drawTexture(W, H, (x) => {
    x.clearRect(0, 0, W, H); x.fillStyle = o.color ?? '#0b111e'; x.strokeStyle = o.color ?? '#0b111e';
    for (const [tx, th, tw] of o.trees ?? [[.08, .9, .22], [.92, .85, .24]]) {
      const bx = W * tx, by = H, top = H * (1 - th); x.lineWidth = W * .012; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + W * .01, (by + top) / 2, bx - W * .005, top + H * .25); x.stroke();
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()); const px = bx + Math.cos(a) * rr * W * tw * .5, py = top + H * .2 + Math.sin(a) * rr * H * th * .22; x.beginPath(); x.ellipse(px, py, W * (.02 + r() * .03), H * (.015 + r() * .025), r() * 3, 0, 7); x.fill(); }
      for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, rr = .9 + r() * .25; const px = bx + Math.cos(a) * rr * W * tw * .5, py = top + H * .2 + Math.sin(a) * rr * H * th * .22; x.beginPath(); x.arc(px, py, W * (.003 + r() * .006), 0, 7); x.fill(); }
    }
    if (o.balustrade) { const by = H * (1 - o.balustrade); x.fillRect(0, by, W, H * .02); x.fillRect(0, H * .985, W, H * .015); for (let px = 0; px < W; px += W * .022) { x.beginPath(); x.ellipse(px + W * .011, by + (H - by) * .5, W * .006, (H - by) * .45, 0, 0, 7); x.fill(); } }
  });
}
