import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nuruhakikat.app',
  appName: 'Nur-u Hakikat',
  webDir: 'dist',
  backgroundColor: '#5AA2EC',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FCC805',
      showSpinner: false,
    },
    // Android 15+ uygulamaları kenardan kenara çizer; güvenli alan boşlukları CSS değişkeni olarak gelir.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
  },
};

export default config;
