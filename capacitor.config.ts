import type { CapacitorConfig } from '@capacitor/cli'

const remoteAdminUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.VITE_ADMIN_SITE_URL?.trim() ||
  'https://hellen-designer-admin.vercel.app'

const config: CapacitorConfig = {
  appId: 'br.com.hellendesigner.app',
  appName: 'Hellen Designer',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: remoteAdminUrl,
    androidScheme: 'https',
    cleartext: false,
    errorPath: 'capacitor-offline.html',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
}

export default config
