/** 覆盖语言回退、插值边界、后台会话文案和浏览器原生语言包。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages } from '../src/i18n/messages.ts';
import { countLabel, languagePreference, resolveLocale, sessionName, translate, translateError } from '../src/i18n/core.ts';
import { previewSave, operate } from '../src/entrypoints/background/modules/tabOperations/service.ts';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';

test('browser locales honor script, region, preference order and explicit selection', () => {
  for (const language of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'zh_HK']) assert.equal(resolveLocale('system', [language]), 'zh-TW');
  for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans-TW']) assert.equal(resolveLocale('system', [language]), 'zh-CN');
  assert.equal(resolveLocale('system', ['fr-FR', 'zh-TW', 'en-US']), 'zh-TW');
  assert.equal(resolveLocale('system', ['en-GB', 'zh-CN']), 'en');
  assert.equal(resolveLocale('zh-CN', ['en-US']), 'zh-CN');
  assert.equal(resolveLocale('system', ['ja-JP']), 'en');
  assert.equal(resolveLocale('system', []), 'en');
  for (const value of [undefined, null, 'fr', {}, 'system']) assert.equal(languagePreference(value), 'system');
});

test('all translations retain placeholders and both Chinese variants', () => {
  const tokens = text => [...text.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
  for (const [key, values] of Object.entries(messages)) {
    assert.equal(values.length, 2, key);
    for (const value of values) { assert.ok(value.trim(), key); assert.deepEqual(tokens(value), tokens(key), key); }
  }
  for (const locale of ['en', 'zh_CN', 'zh_TW']) {
    const pack = JSON.parse(readFileSync(new URL(`../public/_locales/${locale}/messages.json`, import.meta.url)));
    for (const key of ['extensionName', 'extensionDescription', 'actionTitle', 'defaultSpaceName']) assert.ok(pack[key].message);
  }
});

test('counts distinguish English zero, singular and plural and use Chinese counters', () => {
  assert.equal(countLabel('en', 'tabs', 0), '0 tabs');
  assert.equal(countLabel('en', 'tabs', 1), '1 tab');
  assert.equal(countLabel('en', 'collections', 2), '2 collections');
  assert.equal(countLabel('en', 'matches', 1), '1 match');
  assert.equal(countLabel('zh-CN', 'tabs', 1000), '1,000 个标签页');
  assert.equal(countLabel('zh-TW', 'opened', 2), '已開啟 2 個分頁');
});

test('interpolation preserves user names literally and errors use actionable translations', () => {
  const name = 'Work {count} <b>$&</b> 繁體';
  assert.equal(translate('zh-CN', 'Open {name}', { name }), `打开「${name}」`);
  assert.equal(translateError('zh-TW', new Error('Please enter a name.')), '請輸入名稱。');
  assert.equal(translateError('zh-CN', new Error('Private API internals')), '出错了，请重试。');
});

test('save previews localize generated dates but preserve user group names', async () => {
  const date = new Date('2026-11-16T09:30:00Z');
  const tabs = [{ id: 1, windowId: 1, index: 0, groupId: 2, pinned: false, title: 'User title', url: 'https://example.com' }];
  const port = { getTabs: async () => tabs, getGroup: async () => ({ title: 'My 自訂群組', color: 'blue' }) };
  for (const locale of ['en', 'zh-CN', 'zh-TW']) {
    assert.equal((await previewSave(port, { windowId: 1, locale }, date)).name, sessionName(locale, date));
    assert.equal((await previewSave(port, { windowId: 1, groupId: 2, locale }, date)).name, 'My 自訂群組');
  }
  assert.notEqual(sessionName('en', date), sessionName('zh-CN', date));
});

test('partial browser failures keep user titles and localize reports without changing operations', async () => {
  let saved = false;
  const preview = { name: 'User session', tabs: [{ id: 1, windowId: 1, groupId: -1, pinned: false, title: 'User {name}', url: 'https://example.com' }] };
  const report = await operate({ getTab: async () => { assert.equal(saved, true); throw Error('denied'); } }, { mutate: async () => { saved = true; } }, {
    type: 'save', locale: 'zh-TW', preview, target: { collectionId: 'collection' }, disposition: 'close', remember: false,
  });
  assert.equal(report.message, '已儲存 1 個分頁');
  assert.deepEqual(report.failures, ['User {name}：已儲存，但無法關閉。']);
  assert.equal(report.retry, undefined);
});

test('initial space localization never renames persisted user content', async () => {
  let value;
  const storage = { get: async () => value, set: async next => { value = next; } };
  const first = await createLibraryRepository(storage, () => 'id', '個人').get();
  assert.equal(first.spaces[0].name, '個人');
  const again = await createLibraryRepository(storage, () => 'id2', 'Personal').get();
  assert.deepEqual(again, first);
});
