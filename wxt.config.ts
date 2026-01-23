import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  srcDir: 'src',

  manifest: {
    // 确保不修改起始页面（不设置 chrome_url_overrides）
    // popup 已通过移除 manifest.type meta 标签禁用
    permissions: ['tabs'],
    action: {},
  },
});
