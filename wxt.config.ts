import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  srcDir: 'src',

  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['tabs', 'storage', 'tabGroups', 'favicon'],
    action: { default_title: '__MSG_actionTitle__' },
  },

  vite: ({ mode } : { mode: string}) => {
    console.log('vite mode :>> ', mode);

    return {
      css: {
        preprocessorOptions: {
          less: {
            javascriptEnabled: true,
          },
        },
        modules: {
          localsConvention: 'dashes',
          generateScopedName: mode === 'production' ? '[hash:base64]' : '[folder]__[local]--[hash:base64:5]',
        },
      },
    };
  },
});
