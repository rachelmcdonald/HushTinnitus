/**
 * Hush Tinnitus — Metro bundler configuration
 *
 * STUBS (web-only)
 * react-native-audio-api and expo-notifications register TurboModules
 * synchronously at bundle evaluation time. In Expo Go those native modules
 * are absent, causing an uncatchable AudioApiError at startup.
 *
 * The stubs are applied ONLY when Metro is bundling for the web platform
 * (used for UI previewing in a browser). On Android and iOS the native
 * modules are properly linked in the development / production build and
 * must load the real library — do NOT stub them on those platforms.
 *
 * In summary:
 *   platform === 'web'               → stub  (browser preview, no native layer)
 *   platform === 'android' / 'ios'   → real  (dev build / EAS build, native linked)
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const AUDIO_STUB = path.resolve(__dirname, 'src/audio/AudioApiStub.ts');
const NOTIF_STUB = path.resolve(__dirname, 'src/notifications/NotificationsStub.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only redirect to stubs on the web platform.
  if (platform === 'web') {
    if (
      moduleName === 'react-native-audio-api' ||
      moduleName.startsWith('react-native-audio-api/')
    ) {
      return { filePath: AUDIO_STUB, type: 'sourceFile' };
    }

    if (
      moduleName === 'expo-notifications' ||
      moduleName.startsWith('expo-notifications/')
    ) {
      return { filePath: NOTIF_STUB, type: 'sourceFile' };
    }
  }

  // All other modules (and all non-web platforms) use Metro's default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
