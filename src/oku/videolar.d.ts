declare module 'virtual:oku-videolar' {
  export const site: string;
  export const konular: import('./ortak').Konu[];
  export const videolar: import('./ortak').Video[];
}
