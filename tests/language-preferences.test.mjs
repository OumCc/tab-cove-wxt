/** 在隔离页面环境验证旧偏好迁移、持久化失败和跨页面语言同步。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';
import { serializeBackup } from '../src/services/libraryBackup.ts';

const events = new Map();
let stored = JSON.stringify({ themeId: 'ink', colorMode: 'dark', sidebarCollapsed: false });
let failWrite = false; let writeAttempts = 0;
globalThis.window = { innerWidth: 1200, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener: (name, fn) => events.set(name, fn) };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['zh-HK'] }, configurable: true });
globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { writeAttempts++; if (failWrite) throw Error('disabled'); stored = value; } };
globalThis.document = { documentElement: { lang: '' } };
const { getUiPreferences, importWithUiPreferences, restoreUiPreferences, useUiPreferences } = await import('../src/store/uiPreferences.ts');
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

test('failed or unconfirmed library import never attempts a preference write', async () => {
  failWrite = false;
  const before = { stored, writeAttempts, state: getUiPreferences() };
  const backup = { themeId: 'ink', colorMode: 'dark', language: 'zh-CN', sidebarCollapsed: true };
  for (const message of ['quota', 'disconnected']) {
    await assert.rejects(importWithUiPreferences(async () => { throw Error(message); }, backup), { message });
  }
  assert.deepEqual({ stored, writeAttempts, state: getUiPreferences() }, before);
  assert.equal(await importWithUiPreferences(async () => {}), 'success');
  assert.equal(writeAttempts, before.writeAttempts);
});

test('partial success retains old preferences and a preference-only retry does not append again', async () => {
  const source = { schemaVersion: 1, revision: 5, spaces: [{ id: 'source', name: 'Work', collections: [] }], preferences: { saveDisposition: 'ask', restoreMode: 'ask' } };
  const backup = { themeId: 'ink', colorMode: 'dark', language: 'zh-CN', sidebarCollapsed: true };
  const text = serializeBackup(source, backup, '2026-11-17T00:00:00.000Z');
  let library = { ...source, spaces: [], revision: 0 }; let writes = 0;
  const repo = createLibraryRepository({ get: async () => library, set: async value => { writes++; library = value; } }, () => 'copy');
  const before = { stored, state: getUiPreferences(), writeAttempts };
  failWrite = true;
  const result = await importWithUiPreferences(async () => { await repo.importBackup({ text, mode: 'append' }); }, backup);
  assert.equal(result, 'partial');
  assert.equal(library.spaces.length, 1);
  assert.deepEqual({ stored, state: getUiPreferences(), writeAttempts }, { ...before, writeAttempts: before.writeAttempts + 1 });
  failWrite = false;
  restoreUiPreferences(backup);
  assert.deepEqual(getUiPreferences(), backup);
  assert.deepEqual(JSON.parse(stored), backup);
  events.get('storage')({ key: 'tabCoveUiPreferences' });
  assert.deepEqual(getUiPreferences(), backup);
  assert.equal(writes, 1);
  assert.equal(library.spaces.length, 1);
});
