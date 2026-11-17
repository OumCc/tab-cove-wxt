/** 仅用于 UI 回归的隔离预览；复用实际 React 源码与领域服务，不连接用户浏览器标签。 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const wxtRequire = createRequire(require.resolve('wxt'));
const { createServer } = await import(pathToFileURL(wxtRequire.resolve('vite')).href);
const root = path.resolve(import.meta.dirname, '../..');
const fixture = path.join(root, 'tests/preview/runtime.ts');
const server = await createServer({
  root, configFile: false,
  plugins: [{ name: 'isolated-extension-preview', enforce: 'pre', resolveId(source) { if (source === 'wxt/browser' || /(?:^|\/)types\/messaging\.ts$/.test(source)) return fixture; } }],
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
});
await server.listen();
console.log('Isolated UI preview: http://127.0.0.1:4173/tests/preview/');
