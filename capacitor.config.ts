import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.tripsol.sol',
  appName: 'Sol',
  webDir: 'dist',
  plugins: {
    // Tela de abertura com a marca da Sol (imagens geradas em assets/ pelo @capacitor/assets)
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FBF7F0',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
