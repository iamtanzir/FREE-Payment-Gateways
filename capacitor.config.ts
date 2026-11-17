import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freepaymentgateways.app',
  appName: 'FREE Payment Gateways',
  // SPA lives in src/dashboard; `npm run build:app` outputs the web assets here.
  webDir: 'public/app',
  server: {
    url: 'https://pay.example.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
