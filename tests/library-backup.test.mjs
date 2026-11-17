/** 离线备份契约：覆盖往返、输入校验及导入持久化。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyImport, countLibrary, MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '../src/services/libraryBackup.ts';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';

const time = '2026-11-17T08:09:10.123Z';
const preferences = { themeId: 'future-theme', colorMode: 'dark', language: 'zh-TW', sidebarCollapsed: true };
const url = 'https://example.test/?q=%E4%B8%AD#section';
function library() {
  return { schemaVersion: 1, revision: 20, spaces: [
    { id: 's1', name: '資料 <&>', collections: [
      { id: 'c1', name: '研究', groupColor: 'purple', tabs: [{ id: 't1', title: '中\n🐈', url }, { id: 't2', title: '重複網址', url }] },
      { id: 'c2', name: '空集合', tabs: [] },
    ] },
    { id: 's2', name: '資料 <&>', collections: [] },
  ], preferences: { saveDisposition: 'keep', restoreMode: 'group' } };
}
const backup = (doc = library()) => ({ format: 'tab-cove-backup', formatVersion: 1, exportedAt: time, library: doc, uiPreferences: preferences });

test('backup round trip preserves complete ordered data and prefers exact known fields', () => {
  const doc = library(); const envelope = backup();
  assert.deepEqual(parseBackup(serializeBackup(doc, preferences, time)), envelope);
  assert.deepEqual(countLibrary(doc), { spaces: 2, collections: 2, tabs: 2 });
  const extended = JSON.parse(JSON.stringify(envelope).replace('"t1"', '"t1","__proto__":{"ignored":true}'));
  for (const node of [extended, extended.library, extended.library.preferences, extended.library.spaces[0], extended.library.spaces[0].collections[0], extended.uiPreferences]) node.extra = 1;
  assert.deepEqual(parseBackup('\uFEFF' + JSON.stringify(extended)), envelope);
  assert.deepEqual(parseBackup(serializeBackup(extended.library, extended.uiPreferences, time)), envelope);
});

test('parser distinguishes unsupported versions and rejects malformed or unrelated JSON', () => {
  for (const value of [{ ...backup(), formatVersion: 2 }, backup({ ...library(), schemaVersion: 2 })]) {
    assert.throws(() => parseBackup(JSON.stringify(value)), { code: 'UNSUPPORTED_SCHEMA' });
  }
  for (const value of [library(), [], null, { ...backup(), formatVersion: undefined }, backup({ ...library(), schemaVersion: undefined }),
    backup({ ...library(), spaces: {} }), { ...backup(), exportedAt: '2026-02-30T08:09:10.123Z' }, { ...backup(), exportedAt: '2026-11-17T08:09:10+00:00' }]) {
    assert.throws(() => parseBackup(JSON.stringify(value)), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => parseBackup('{'), { code: 'INVALID_INPUT' });
  for (const [key, invalid] of Object.entries({ themeId: 1, colorMode: 'auto', language: 'fr', sidebarCollapsed: 'true' })) {
    assert.throws(() => parseBackup(JSON.stringify({ ...backup(), uiPreferences: { ...preferences, [key]: invalid } })), { code: 'INVALID_INPUT' });
    assert.throws(() => parseBackup(JSON.stringify({ ...backup(), uiPreferences: { ...preferences, [key]: undefined } })), { code: 'INVALID_INPUT' });
  }
  const doc = library();
  doc.spaces[0].collections[0].tabs[0].url = 'file:///tmp/file';
  assert.throws(() => parseBackup(JSON.stringify(backup(doc))), { code: 'INVALID_INPUT' });
  doc.spaces[0].collections[0].tabs[0].url = url;
  doc.spaces[0].collections[0].tabs[0].id = 's2';
  assert.throws(() => parseBackup(JSON.stringify(backup(doc))), { code: 'INVALID_INPUT' });
});

test('UTF-8 limit includes BOM and multibyte characters; a near-10 MiB library round trips', () => {
  const doc = library();
  doc.spaces[0].collections[0].tabs[0].title = '';
  const remaining = 10 * 1024 * 1024 - 30 - Buffer.byteLength(JSON.stringify(doc));
  doc.spaces[0].collections[0].tabs[0].title = '界'.repeat(Math.floor(remaining / 3));
  const text = serializeBackup(doc, preferences, time);
  assert.ok(Buffer.byteLength(text) > 10 * 1024 * 1024);
  assert.deepEqual(parseBackup(text).library, doc);
  const atLimit = '\uFEFF' + text.padEnd(text.length + MAX_BACKUP_BYTES - Buffer.byteLength(text) - 3);
  assert.equal(Buffer.byteLength(atLimit), MAX_BACKUP_BYTES);
  assert.deepEqual(parseBackup(atLimit).uiPreferences, preferences);
  assert.throws(() => parseBackup(atLimit + ' '), /11 MiB/);
  assert.throws(() => serializeBackup(doc, { ...preferences, themeId: 'x'.repeat(1024 * 1024) }, time), /11 MiB/);
});

test('append keeps same-named spaces and duplicate URLs, allocates fresh IDs, and leaves both inputs intact', () => {
  const source = library(); const current = {
    ...library(), revision: 3, spaces: [{ id: 'existing', name: source.spaces[0].name, collections: [] }],
    preferences: { saveDisposition: 'close', restoreMode: 'tabs' },
  };
  const before = structuredClone({ source, current });
  const ids = ['existing', 's2', 'new-1', 'new-1', 'new-2', 'new-3', 'new-4', 'new-5', 'new-6'];
  const next = applyImport(current, source, 'append', () => ids.shift());
  assert.equal(next.revision, 4);
  assert.deepEqual(next.preferences, current.preferences);
  assert.deepEqual(next.spaces, [current.spaces[0], {
    id: 'new-1', name: '資料 <&>', collections: [
      { id: 'new-2', name: '研究', groupColor: 'purple', tabs: [{ id: 'new-3', title: '中\n🐈', url }, { id: 'new-4', title: '重複網址', url }] },
      { id: 'new-5', name: '空集合', tabs: [] },
    ],
  }, { id: 'new-6', name: '資料 <&>', collections: [] }]);
  next.spaces[0].name = 'changed'; next.spaces[1].collections[0].tabs[0].title = 'changed';
  assert.deepEqual({ current, source }, before);
  assert.throws(() => applyImport(current, source, 'append', () => 'existing'), /unique IDs/);
});

test('replace retains source identities and behavior preferences, and both modes support empty backups', () => {
  const current = { ...library(), revision: 3, spaces: [], preferences: { saveDisposition: 'ask', restoreMode: 'ask' } };
  const source = library(); const noId = () => assert.fail('no IDs needed');
  const restored = applyImport(current, source, 'replace', noId);
  assert.deepEqual(restored, { ...source, revision: 4 });
  restored.spaces[0].collections[0].tabs[0].title = 'changed';
  assert.deepEqual(source, library());
  const empty = { ...source, spaces: [] };
  assert.deepEqual(countLibrary(parseBackup(serializeBackup(empty, preferences, time)).library), { spaces: 0, collections: 0, tabs: 0 });
  assert.deepEqual(applyImport(current, empty, 'append', noId), { ...current, revision: 4 });
  assert.deepEqual(applyImport(current, empty, 'replace', noId), { ...empty, revision: 4 });
  assert.throws(() => applyImport({ ...current, revision: Number.MAX_SAFE_INTEGER }, source, 'replace', noId), /revision limit/);
});

function repository(initial) {
  let value = structuredClone(initial); let writes = 0; let readError = false; let writeError = false; let ids = 0;
  const repo = createLibraryRepository({
    get: async () => { if (readError) throw Error('denied'); return structuredClone(value); },
    set: async next => { writes++; if (writeError) throw Error('quota'); value = structuredClone(next); },
  }, () => `generated-${++ids}`);
  return { repo, get value() { return value; }, get writes() { return writes; }, failRead() { readError = true; }, failWrite(fail) { writeError = fail; } };
}
const request = { mode: 'append', text: JSON.stringify(backup()) };

test('queued append re-reads the latest library and a stale replacement cannot overwrite it', async () => {
  const initial = library(); const f = repository(initial);
  const preview = await f.repo.get({ readOnly: true });
  const edit = f.repo.mutate({ type: 'space:rename', id: 's1', name: 'Other page' });
  const append = f.repo.importBackup(request);
  const replace = f.repo.importBackup({ ...request, mode: 'replace', expectedRevision: preview.revision });
  const rejected = assert.rejects(replace, { code: 'IMPORT_CONFLICT' });
  const [, appended] = await Promise.all([edit, append, rejected]);
  assert.equal(f.writes, 2);
  assert.equal(appended.revision, 22);
  assert.deepEqual(appended.spaces.map(space => space.name), ['Other page', '資料 <&>', '資料 <&>', '資料 <&>']);
  const replaced = await f.repo.importBackup({ ...request, mode: 'replace', expectedRevision: appended.revision });
  assert.deepEqual(replaced, { ...initial, revision: 23 });
  assert.equal(f.writes, 3);
});

test('uninitialized reads and rejected imports do not initialize; success writes once', async () => {
  const f = repository(undefined);
  assert.equal((await f.repo.get({ readOnly: true })).revision, 0);
  assert.equal(f.writes, 0);
  for (const invalid of [null, { ...request, text: {} }, { ...request, mode: 'merge' },
    { ...request, mode: 'replace' }, { ...request, mode: 'replace', expectedRevision: -1 }, { ...request, text: '{' },
    { ...request, text: request.text.padEnd(MAX_BACKUP_BYTES + 1) }]) {
    await assert.rejects(f.repo.importBackup(invalid), { code: 'INVALID_INPUT' });
  }
  assert.equal(f.writes, 0);
  const replaced = await f.repo.importBackup({ ...request, mode: 'replace', expectedRevision: 0 });
  assert.deepEqual(replaced, { ...library(), revision: 1 });
  assert.equal(f.writes, 1);
});

test('corrupt, unsupported, unreadable and exhausted target libraries are never overwritten', async () => {
  for (const [target, code] of [[null, 'INVALID_INPUT'], [{ schemaVersion: 2 }, 'UNSUPPORTED_SCHEMA'],
    [{ ...library(), revision: Number.MAX_SAFE_INTEGER }, 'INVALID_INPUT']]) {
    const f = repository(target);
    await assert.rejects(f.repo.importBackup(request), { code });
    assert.deepEqual(f.value, target);
    assert.equal(f.writes, 0);
  }
  const f = repository(library()); f.failRead();
  await assert.rejects(f.repo.importBackup(request), { code: 'STORAGE_READ_FAILED' });
  assert.equal(f.writes, 0);
});

test('quota failure keeps the old library and allows a later queued import', async () => {
  const initial = library(); const f = repository(initial); f.failWrite(true);
  await assert.rejects(f.repo.importBackup(request), { code: 'STORAGE_WRITE_FAILED' });
  assert.deepEqual(f.value, initial);
  f.failWrite(false);
  const next = await f.repo.importBackup(request);
  assert.deepEqual(f.value, next);
  assert.equal(f.value.revision, initial.revision + 1);
  assert.equal(f.writes, 2);
});
