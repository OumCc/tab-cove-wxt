import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, emptyLibrary, validateLibrary } from '../src/services/libraryModel.ts';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';

function fixture() {
  let counter = 0; const id = () => `id-${++counter}`;
  let doc = emptyLibrary(id);
  const act = command => { doc = applyCommand(doc, command, id); return doc; };
  const spaceId = doc.spaces[0].id;
  act({ type: 'collection:create', spaceId, name: 'Work' });
  act({ type: 'collection:create', spaceId, name: 'Reading' });
  const [a, b] = doc.spaces[0].collections.map(c => c.id);
  act({ type: 'tabs:save', target: { collectionId: a }, tabs: ['a', 'b', 'c'].map(title => ({ title, url: `https://example.com/${title}` })) });
  return { get doc() { return doc; }, act, id, a, b, spaceId };
}

test('move preserves identity and order across collections, including an empty target', () => {
  const f = fixture(); const before = structuredClone(f.doc); const id = before.spaces[0].collections[0].tabs[1].id;
  f.act({ type: 'tab:move', id, collectionId: f.b });
  assert.deepEqual(f.doc.spaces[0].collections[0].tabs.map(t => t.title), ['a', 'c']);
  assert.equal(f.doc.spaces[0].collections[1].tabs[0].id, id);
  assert.equal(before.spaces[0].collections[0].tabs.length, 3);
});
test('same-collection move and self drop do not lose or duplicate a tab', () => {
  const f = fixture(); const [a, b, c] = f.doc.spaces[0].collections[0].tabs;
  f.act({ type: 'tab:move', id: c.id, collectionId: f.a, beforeId: a.id });
  f.act({ type: 'tab:move', id: b.id, collectionId: f.a, beforeId: b.id });
  assert.deepEqual(f.doc.spaces[0].collections[0].tabs.map(t => t.id), [c.id, a.id, b.id]);
});
test('invalid drop position leaves the input document untouched', () => {
  const f = fixture(); const before = structuredClone(f.doc);
  assert.throws(() => f.act({ type: 'tab:move', id: before.spaces[0].collections[0].tabs[0].id, collectionId: f.b, beforeId: 'missing' }), { code: 'NOT_FOUND' });
  assert.deepEqual(f.doc, before);
});
test('inserting several saved tabs before an anchor preserves their order and duplicate URLs', () => {
  const f = fixture(); const anchor = f.doc.spaces[0].collections[0].tabs[1].id;
  f.act({ type: 'tabs:save', target: { collectionId: f.a, beforeId: anchor }, tabs: ['x', 'y'].map(title => ({ title, url: 'https://same.test/' })) });
  assert.deepEqual(f.doc.spaces[0].collections[0].tabs.map(t => t.title), ['a', 'x', 'y', 'b', 'c']);
});
test('merge appends source order and retains target identity and group metadata', () => {
  const f = fixture(); f.act({ type: 'tabs:save', target: { collectionId: f.b }, tabs: [{ title: 'old', url: 'https://example.com/a' }] });
  f.act({ type: 'collection:merge', id: f.a, targetId: f.b });
  assert.equal(f.doc.spaces[0].collections.length, 1);
  assert.equal(f.doc.spaces[0].collections[0].id, f.b);
  assert.deepEqual(f.doc.spaces[0].collections[0].tabs.map(t => t.title), ['old', 'a', 'b', 'c']);
});
test('collection colors can switch from saved grey to random and back to a fixed Chrome color', () => {
  const f = fixture();
  const collection = f.doc.spaces[0].collections[0];
  collection.groupColor = 'grey';
  const { id, name, tabs } = collection;
  const command = { type: 'collection:setGroupColor', id };

  f.act({ ...command, groupColor: null });
  assert.deepEqual(f.doc.spaces[0].collections[0], { id, name, tabs });
  assert.equal(collection.groupColor, 'grey');

  f.act({ ...command, groupColor: 'purple' });
  assert.deepEqual(f.doc.spaces[0].collections[0], { id, name, tabs, groupColor: 'purple' });
  for (const groupColor of ['random', undefined]) {
    assert.throws(() => f.act({ ...command, groupColor }), { code: 'INVALID_INPUT' });
  }
  assert.equal(f.doc.spaces[0].collections[0].groupColor, 'purple');
});
test('gap creation is one change and retains the moved card identity', () => {
  const f = fixture(); const tab = f.doc.spaces[0].collections[0].tabs[0];
  f.act({ type: 'tab:newCollection', id: tab.id, spaceId: f.spaceId, name: 'New', beforeId: f.b });
  assert.equal(f.doc.spaces[0].collections[1].name, 'New');
  assert.deepEqual(f.doc.spaces[0].collections[1].tabs, [tab]);
});
test('moving a collection and deleting the old space preserves moved content', () => {
  const f = fixture(); f.act({ type: 'space:create', name: 'Other' }); const target = f.doc.spaces[1].id;
  f.act({ type: 'collection:move', id: f.a, spaceId: target }); f.act({ type: 'space:delete', id: f.spaceId });
  assert.equal(f.doc.spaces.length, 1); assert.equal(f.doc.spaces[0].collections[0].tabs.length, 3);
  f.act({ type: 'space:delete', id: target }); assert.deepEqual(f.doc.spaces, []);
});
test('blank names, unsafe URLs, duplicate IDs and malformed documents fail validation', () => {
  const f = fixture(); assert.throws(() => f.act({ type: 'space:create', name: '  ' }));
  const tab = f.doc.spaces[0].collections[0].tabs[0];
  for (const url of ['javascript:alert(1)', 'file:///etc/hosts', 'example.com']) assert.throws(() => f.act({ type: 'tab:edit', id: tab.id, title: 'bad', url }));
  const broken = structuredClone(f.doc); broken.spaces[0].collections[0].tabs[1].id = tab.id; assert.throws(() => validateLibrary(broken));
  for (const value of [null, {}, { ...f.doc, schemaVersion: 2 }, { ...f.doc, preferences: null }]) assert.throws(() => validateLibrary(value));
});
test('repository serializes concurrent writes and reads the newest document for each', async () => {
  let value; let id = 0; const repo = createLibraryRepository({ get: async () => structuredClone(value), set: async v => { await new Promise(resolve => setTimeout(resolve, 3)); value = structuredClone(v); } }, () => String(++id));
  const initial = await repo.get(); const spaceId = initial.spaces[0].id;
  await Promise.all(['A', 'B'].map(name => repo.mutate({ type: 'collection:create', spaceId, name })));
  assert.deepEqual((await repo.get()).spaces[0].collections.map(c => c.name), ['A', 'B']);
});
test('failed writes do not mutate persisted data or poison the queue', async () => {
  const f = fixture(); let value = structuredClone(f.doc); let fail = true;
  const repo = createLibraryRepository({ get: async () => structuredClone(value), set: async v => { if (fail) throw Error('quota'); value = structuredClone(v); } }, f.id);
  await assert.rejects(repo.mutate({ type: 'space:create', name: 'Fail' }), { code: 'STORAGE_WRITE_FAILED' });
  assert.deepEqual(value, f.doc); fail = false;
  await repo.mutate({ type: 'space:create', name: 'Works' }); assert.equal(value.spaces.at(-1).name, 'Works');
});
test('corruption, null, future versions and read errors never trigger fallback writes', async () => {
  for (const value of [null, {}, { schemaVersion: 8 }]) {
    let writes = 0; const repo = createLibraryRepository({ get: async () => value, set: async () => { writes++; } }, () => 'id');
    await assert.rejects(repo.get()); assert.equal(writes, 0);
  }
  let writes = 0; const repo = createLibraryRepository({ get: async () => { throw Error('denied'); }, set: async () => { writes++; } }, () => 'id');
  await assert.rejects(repo.get(), { code: 'STORAGE_READ_FAILED' }); assert.equal(writes, 0);
});
test('a deleted mutation target is not recreated and a fresh repository preserves data', async () => {
  const f = fixture(); let value = structuredClone(f.doc); const storage = { get: async () => structuredClone(value), set: async v => { value = structuredClone(v); } };
  const repo = createLibraryRepository(storage, f.id); await repo.mutate({ type: 'collection:delete', id: f.a });
  await assert.rejects(repo.mutate({ type: 'tabs:save', target: { collectionId: f.a }, tabs: [{ title: 'No', url: 'https://example.com/' }] }), { code: 'NOT_FOUND' });
  const restarted = createLibraryRepository(storage, f.id); assert.deepEqual(await restarted.get(), value);
});
