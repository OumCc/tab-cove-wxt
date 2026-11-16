import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';
import { operate, previewSave } from '../src/entrypoints/background/modules/tabOperations/service.ts';

async function fixture() {
  let value; let seq = 0;
  const calls = []; const tabs = new Map(); let browserId = 100; let denyWrite = false;
  const repo = createLibraryRepository({ get: async () => structuredClone(value), set: async v => { calls.push('write'); if (denyWrite) throw Error('quota'); value = structuredClone(v); } }, () => `saved-${++seq}`);
  const doc = await repo.get(); const spaceId = doc.spaces[0].id; calls.length = 0;
  const port = {
    getTabs: async windowId => [...tabs.values()].filter(t => t.windowId === windowId),
    getTab: async id => tabs.get(id), getGroup: async id => ({ id, windowId: 1, title: 'Research', color: 'blue', collapsed: false }),
    focus: async id => { calls.push(`focus:${id}`); },
    close: async id => { calls.push(`close:${id}`); tabs.delete(id); },
    move: async () => {}, editGroup: async (id, patch) => { calls.push(['editGroup', id, patch]); }, ungroup: async () => {},
    ungroupTabs: async ids => { for (const id of ids) tabs.get(id).groupId = -1; },
    create: async (url, target) => { const id = ++browserId; calls.push(['create', url, target]); tabs.set(id, { id, url, title: url, windowId: target.windowId, groupId: -1, index: tabs.size, pinned: false, active: false }); return id; },
    group: async (ids, windowId, groupId) => { const id = groupId ?? 80; calls.push(['group', ids, windowId, id]); for (const tabId of ids) tabs.get(tabId).groupId = id; return id; },
  };
  const tab = (id, patch = {}) => ({ id, windowId: 1, index: id, title: `Tab ${id}`, url: `https://example.test/${id}`, groupId: -1, pinned: false, active: false, ...patch });
  tabs.set(1, tab(1)); tabs.set(2, tab(2)); tabs.set(3, tab(3, { pinned: true }));
  return { repo, port, calls, tabs, tab, spaceId, deny: () => { denyWrite = true; } };
}
test('window preview excludes pinned and unsupported URLs, preserves order', async () => {
  const f = await fixture(); f.tabs.set(4, f.tab(4, { url: 'chrome://extensions/' }));
  const preview = await previewSave(f.port, { windowId: 1 }); assert.deepEqual(preview.tabs.map(t => t.id), [1, 2]);
  const pinned = await previewSave(f.port, { windowId: 1, tabId: 3 }); assert.equal(pinned.tabs[0].id, 3);
  f.tabs.clear(); await assert.rejects(previewSave(f.port, { windowId: 1 }));
});
test('saving a group captures its name/color and only its members', async () => {
  const f = await fixture(); f.tabs.get(2).groupId = 4;
  const preview = await previewSave(f.port, { windowId: 1, groupId: 4 });
  assert.equal(preview.name, 'Research'); assert.equal(preview.groupColor, 'blue'); assert.deepEqual(preview.tabs.map(t => t.id), [2]);
});
test('storage failure closes no source tab', async () => {
  const f = await fixture(); const preview = await previewSave(f.port, { windowId: 1 }); f.deny();
  await assert.rejects(operate(f.port, f.repo, { type: 'save', preview, target: { spaceId: f.spaceId, name: 'Session' }, disposition: 'close', remember: false }), { code: 'STORAGE_WRITE_FAILED' });
  assert.equal(f.calls.filter(c => typeof c === 'string' && c.startsWith('close')).length, 0); assert.equal(f.tabs.size, 3);
});
test('save is committed before closing; duplicates and source order remain saved', async () => {
  const f = await fixture(); f.tabs.get(2).url = f.tabs.get(1).url; const preview = await previewSave(f.port, { windowId: 1 });
  await operate(f.port, f.repo, { type: 'save', preview, target: { spaceId: f.spaceId, name: 'Session' }, disposition: 'close', remember: true });
  assert.deepEqual(f.calls, ['write', 'close:1', 'close:2']); assert.ok(f.tabs.has(3));
  const doc = await f.repo.get(); assert.equal(doc.spaces[0].collections[0].tabs.length, 2); assert.equal(doc.preferences.saveDisposition, 'close');
});
test('navigation, pending navigation, movement, or regrouping after preview prevent closing', async () => {
  for (const patch of [{ url: 'https://new.test/' }, { pendingUrl: 'https://new.test/' }, { windowId: 2 }, { groupId: 99 }]) {
    const f = await fixture(); const preview = structuredClone(await previewSave(f.port, { windowId: 1 })); Object.assign(f.tabs.get(1), patch);
    const result = await operate(f.port, f.repo, { type: 'save', preview, target: { spaceId: f.spaceId, name: 'Session' }, disposition: 'close', remember: false });
    assert.ok(f.tabs.has(1)); assert.equal(result.failures.length, 1); assert.equal((await f.repo.get()).spaces[0].collections[0].tabs[0].url, 'https://example.test/1');
  }
});
test('close failures retain saved data and are not retried by saving again', async () => {
  const f = await fixture(); f.port.close = async () => { throw Error('not editable'); };
  const result = await operate(f.port, f.repo, { type: 'save', preview: await previewSave(f.port, { windowId: 1 }), target: { spaceId: f.spaceId, name: 'Session' }, disposition: 'close', remember: false });
  assert.equal(result.failures.length, 2); assert.equal(result.retry, undefined); assert.equal((await f.repo.get()).spaces[0].collections[0].tabs.length, 2);
});
test('a saved pinned card is never closed', async () => {
  const f = await fixture(); await operate(f.port, f.repo, { type: 'save', preview: await previewSave(f.port, { windowId: 1, tabId: 3 }), target: { spaceId: f.spaceId, name: 'Pinned' }, disposition: 'close', remember: false }); assert.ok(f.tabs.has(3));
});
test('partial restore retries only failed URLs at their original insertion position', async () => {
  const f = await fixture(); const create = f.port.create; let fail = true;
  f.port.create = async (url, target) => { if (fail && url.endsWith('/b')) throw Error('transient'); return create(url, target); };
  const operation = { type: 'open', items: ['a', 'b', 'c'].map(id => ({ id, title: id, url: `https://restore.test/${id}` })), target: { windowId: 1 } };
  const first = await operate(f.port, f.repo, operation); assert.equal(first.failures.length, 1); assert.ok(first.retry);
  fail = false; const second = await operate(f.port, f.repo, first.retry); assert.deepEqual(second.failures, []);
  const creates = f.calls.filter(c => c[0] === 'create'); assert.equal(creates.length, 3);
  assert.equal(creates[2][2].beforeTabId, first.retry.opened.c);
});
test('group metadata failure retries grouping without recreating open pages', async () => {
  const f = await fixture(); let fail = true; const edit = f.port.editGroup;
  f.port.editGroup = async (...args) => { if (fail) throw Error('group edit'); return edit(...args); };
  const operation = { type: 'open', items: [{ id: 'saved', title: 'A', url: 'https://restore.test/a' }], target: { windowId: 1 }, group: { title: 'Research', color: 'blue' } };
  const first = await operate(f.port, f.repo, operation); assert.ok(first.retry); fail = false;
  const second = await operate(f.port, f.repo, first.retry); assert.equal(second.failures.length, 0);
  assert.equal(f.calls.filter(c => c[0] === 'create').length, 1);
  assert.deepEqual(f.calls.findLast(c => c[0] === 'editGroup'), ['editGroup', 80, { title: 'Research', color: 'blue' }]);
});
test('simultaneous URL and grouping failures preserve successful tab IDs for retry', async () => {
  const f = await fixture(); let fail = true; const create = f.port.create; const group = f.port.group;
  f.port.create = async (url, target) => { if (fail && url.endsWith('/b')) throw Error('create'); return create(url, target); };
  f.port.group = async (...args) => { if (fail) throw Error('group'); return group(...args); };
  const first = await operate(f.port, f.repo, { type: 'open', items: ['a', 'b'].map(id => ({ id, title: id, url: `https://restore.test/${id}` })), target: { windowId: 1 }, group: { title: 'Research', color: 'blue' } });
  assert.equal(first.failures.length, 2); fail = false;
  const second = await operate(f.port, f.repo, first.retry); assert.deepEqual(second.failures, []); assert.equal(f.calls.filter(c => c[0] === 'create').length, 2);
});
test('restoring a saved group uses new browser IDs and never removes library cards', async () => {
  const f = await fixture(); f.tabs.get(1).groupId = 4;
  const preview = await previewSave(f.port, { windowId: 1, groupId: 4 });
  await operate(f.port, f.repo, { type: 'save', preview, target: { spaceId: f.spaceId, name: preview.name, groupColor: preview.groupColor }, disposition: 'close', remember: false });
  const saved = (await f.repo.get()).spaces[0].collections[0];
  await operate(f.port, f.repo, { type: 'open', items: saved.tabs, target: { windowId: 1 }, group: { title: saved.name, color: saved.groupColor } });
  assert.equal(f.calls.findLast(c => c[0] === 'group')[3], 80); assert.deepEqual((await f.repo.get()).spaces[0].collections[0], saved);
});
test('ordinary card opening can activate the new page; bulk restore remains in the workspace', async () => {
  const f = await fixture(); await operate(f.port, f.repo, { type: 'open', items: [{ id: 'card', title: 'A', url: 'https://restore.test/a' }], target: { windowId: 1 }, activate: true });
  assert.ok(f.calls.some(c => typeof c === 'string' && c.startsWith('focus:')));
});

 test('inspection failure retains opened IDs so retry cannot duplicate pages', async () => {
  const f = await fixture(); const getTab = f.port.getTab;
  f.port.getTab = async () => { throw Error('temporarily unavailable'); };
  const first = await operate(f.port, f.repo, { type: 'open', items: [{ id: 'card', title: 'A', url: 'https://restore.test/a' }], target: { windowId: 1 } });
  assert.ok(first.retry); f.port.getTab = getTab;
  const second = await operate(f.port, f.repo, first.retry);
  assert.deepEqual(second.failures, []); assert.equal(f.calls.filter(c => c[0] === 'create').length, 1);
});
test('ordinary restore retries ungrouping without opening another page', async () => {
  const f = await fixture(); const ungroup = f.port.ungroupTabs;
  f.port.ungroupTabs = async () => { throw Error('busy'); };
  const first = await operate(f.port, f.repo, { type: 'open', items: [{ id: 'card', title: 'A', url: 'https://restore.test/a' }], target: { windowId: 1 } });
  assert.ok(first.retry); f.port.ungroupTabs = ungroup;
  assert.deepEqual((await operate(f.port, f.repo, first.retry)).failures, []);
  assert.equal(f.calls.filter(c => c[0] === 'create').length, 1);
});
