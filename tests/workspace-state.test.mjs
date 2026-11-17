import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace } from '../src/store/createWorkspace.ts';
import { AppError } from '../src/services/libraryModel.ts';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const doc = revision => ({ schemaVersion: 1, revision, spaces: [{ id: 'space', name: 'Personal', collections: [] }], preferences: { saveDisposition: 'ask', restoreMode: 'ask' } });
const snapshot = epoch => ({ epoch, sequence: 1, groupsAvailable: true, windows: [] });
function fixture(overrides = {}) { return createWorkspace({ getLibrary: async () => doc(1), getSnapshot: async () => snapshot('new'), mutateLibrary: async () => doc(2), importBackup: async () => doc(2), ...overrides }); }
test('slow library responses cannot replace a newer refresh', async () => {
  const first = deferred(); let count = 0;
  const store = fixture({ getLibrary: () => ++count === 1 ? first.promise : Promise.resolve(doc(2)) });
  const old = store.getState().loadLibrary(); await store.getState().loadLibrary(); first.resolve(doc(1)); await old;
  assert.equal(store.getState().library.revision, 2);
});
test('a late old-worker response cannot replace a restarted worker snapshot', async () => {
  const first = deferred(); let count = 0;
  const store = fixture({ getSnapshot: () => ++count === 1 ? first.promise : Promise.resolve(snapshot('new-worker')) });
  const old = store.getState().loadBrowser(); await store.getState().loadBrowser(); first.resolve(snapshot('old-worker')); await old;
  assert.equal(store.getState().snapshot.epoch, 'new-worker');
});
test('failed mutation is not retried or optimistically applied and pending resets', async () => {
  let calls = 0;
  const store = fixture({ mutateLibrary: async () => { calls++; throw Error('quota'); } });
  await store.getState().loadLibrary(); await assert.rejects(store.getState().mutate({ type: 'space:create', name: 'New' }), /quota/);
  assert.equal(calls, 1); assert.equal(store.getState().library.revision, 1); assert.equal(store.getState().pending, false);
});
test('read failure preserves last confirmed data and later refresh clears the error', async () => {
  let fail = false;
  const store = fixture({ getLibrary: async () => { if (fail) throw Error('unavailable'); return doc(1); } });
  await store.getState().loadLibrary(); fail = true; await store.getState().loadLibrary();
  assert.equal(store.getState().library.revision, 1); assert.equal(store.getState().libraryError, 'unavailable');
  fail = false; await store.getState().loadLibrary(); assert.equal(store.getState().libraryError, undefined);
});
test('import shares the pending lock and refreshes from the authoritative library, including selection fallback', async () => {
  const write = deferred(); let current = doc(1); let calls = 0;
  const store = fixture({ getLibrary: async () => current, importBackup: () => { calls++; return write.promise; } });
  await store.getState().loadLibrary();
  const request = { mode: 'append', text: '{}' };
  const first = store.getState().importBackup(request);
  assert.equal(store.getState().pending, true);
  assert.equal(store.getState().library.revision, 1);
  await assert.rejects(store.getState().importBackup(request), /current change/);
  await assert.rejects(store.getState().mutate({ type: 'space:create', name: 'Other' }), /current change/);
  current = { ...doc(3), spaces: [{ id: 'new', name: 'New', collections: [] }] };
  write.resolve(doc(2)); await first;
  assert.equal(calls, 1);
  assert.deepEqual(store.getState().library, current);
  assert.equal(store.getState().spaceId, 'new');
  assert.equal(store.getState().pending, false);
});

test('import preserves the backend error and does not retry on disconnection', async () => {
  for (const error of [new AppError('IMPORT_CONFLICT', 'Preview expired'), Error('Disconnected')]) {
    let calls = 0; let reads = 0;
    const store = fixture({ getLibrary: async () => { reads++; return doc(1); }, importBackup: async () => { calls++; throw error; } });
    await store.getState().loadLibrary();
    await assert.rejects(store.getState().importBackup({ mode: 'replace', text: '{}', expectedRevision: 1 }), actual => actual === error);
    assert.equal(calls, 1); assert.equal(reads, 1);
    assert.equal(store.getState().pending, false);
    assert.equal(store.getState().library.revision, 1);
  }
});
