import { ExpoConfig } from '@expo/config-types';
import appJson from './app.json';

const config: ExpoConfig = {
  ...appJson.expo,
  web: {
    ...appJson.expo.web,
    output: appJson.expo.web?.output as 'static' | 'single' | 'server' | undefined,
    bundler: appJson.expo.web?.bundler === 'metro' || appJson.expo.web?.bundler === 'webpack'
      ? appJson.expo.web.bundler
      : undefined,
  },
  userInterfaceStyle: appJson.expo.userInterfaceStyle as 'automatic' | 'light' | 'dark' | undefined,
  splash: {
    ...appJson.expo.splash,
    resizeMode: appJson.expo.splash.resizeMode as 'contain' | 'cover' | undefined,
  },
  orientation: appJson.expo.orientation as 'portrait' | 'default' | 'landscape' | undefined,
  android: {
    ...appJson.expo.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  plugins: appJson.expo.plugins?.map((plugin) => {
    if (typeof plugin === 'string' || Array.isArray(plugin)) {
      return plugin;
    }
    throw new Error('Invalid plugin format');
  }) as (string | [] | [string] | [string, any])[],
};

// ✅ Forcefully assert the correct config type
export default config;
