import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.tripsol.sol',
  appName: 'Sol',
  webDir: 'dist',
  android: {
    // Android 15 em diante desenha o app por baixo da barra do relógio e dos botões:
    // com isto o conteúdo fica entre as barras (o alvo Android 16 não deixa mais desligar esse modo)
    adjustMarginsForEdgeToEdge: 'auto',
  },
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
