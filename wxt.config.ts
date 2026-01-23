import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  srcDir: 'src',

  manifest: {
    permissions: [ 'tabs', 'windows', ],
    action: {},
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
