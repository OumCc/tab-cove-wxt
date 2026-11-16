/** 在隔离页面环境验证旧偏好迁移、持久化失败和跨页面语言同步。 */
import test from 'node:test';
import assert from 'node:assert/strict';

const events = new Map();
let stored = JSON.stringify({ themeId: 'ink', colorMode: 'dark', sidebarCollapsed: false });
let failWrite = false;
globalThis.window = { innerWidth: 1200, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener: (name, fn) => events.set(name, fn) };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['zh-HK'] }, configurable: true });
globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { if (failWrite) throw Error('disabled'); stored = value; } };
globalThis.document = { documentElement: { lang: '' } };
const { useUiPreferences } = await import('../src/store/uiPreferences.ts');
const { getLocale, startLanguageSync } = await import('../src/i18n/index.ts');

test('old preferences follow browser; manual language persists alongside appearance', () => {
  const stop = startLanguageSync();
  assert.equal(getLocale(), 'zh-TW');
  assert.equal(document.documentElement.lang, 'zh-TW');
  useUiPreferences.getState().update({ language: 'en' });
  assert.equal(document.documentElement.lang, 'en');
  assert.deepEqual(JSON.parse(stored), { themeId: 'ink', colorMode: 'dark', sidebarCollapsed: false, language: 'en' });
  useUiPreferences.getState().update({ themeId: 'mist' });
  assert.equal(JSON.parse(stored).language, 'en');
  stop();
});

test('storage changes and browser language changes synchronize without rewriting library data', () => {
  const stop = startLanguageSync();
  stored = JSON.stringify({ language: 'zh-CN' });
  events.get('storage')({ key: 'tabCoveUiPreferences' });
  assert.equal(document.documentElement.lang, 'zh-CN');
  stored = '{broken';
  events.get('storage')({ key: 'tabCoveUiPreferences' });
  assert.equal(getLocale(), 'zh-TW');
  navigator.languages = ['en-US'];
  events.get('languagechange')();
  assert.equal(document.documentElement.lang, 'en');
  failWrite = true;
  assert.doesNotThrow(() => useUiPreferences.getState().update({ language: 'zh-TW' }));
  assert.equal(document.documentElement.lang, 'zh-TW');
  stop();
});
