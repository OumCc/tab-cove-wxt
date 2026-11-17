import test from 'node:test';
import assert from 'node:assert/strict';
import { GROUP_COLORS } from '../src/services/libraryModel.ts';
import { createLibraryRepository } from '../src/services/libraryRepository.ts';
import { operate, previewSave } from '../src/entrypoints/background/modules/tabOperations/service.ts';

async function fixture() {
  let value; let seq = 0;
  const calls = []; const tabs = new Map(); let browserId = 100; let denyWrite = false;
  const groups = new Map([[4, { id: 4, windowId: 1, title: 'Research', color: 'blue', collapsed: false }]]);
  let nextGroupId = 80;
  const repo = createLibraryRepository({ get: async () => structuredClone(value), set: async v => { calls.push('write'); if (denyWrite) throw Error('quota'); value = structuredClone(v); } }, () => `saved-${++seq}`);
  const doc = await repo.get(); const spaceId = doc.spaces[0].id; calls.length = 0;
  const port = {
    getTabs: async windowId => [...tabs.values()].filter(t => t.windowId === windowId),
    getTab: async id => tabs.get(id), getGroup: async id => structuredClone(groups.get(id)),
    getGroups: async windowId => structuredClone([...groups.values()].filter(group => group.windowId === windowId)),
    focus: async id => { calls.push(`focus:${id}`); },
    close: async id => { calls.push(`close:${id}`); tabs.delete(id); },
    move: async () => {},
    editGroup: async (id, patch) => { calls.push(['editGroup', id, patch]); Object.assign(groups.get(id), patch); },
    ungroup: async () => {},
    ungroupTabs: async ids => { for (const id of ids) tabs.get(id).groupId = -1; },
    create: async (url, target) => { const id = ++browserId; calls.push(['create', url, target]); tabs.set(id, { id, url, title: url, windowId: target.windowId, groupId: -1, index: tabs.size, pinned: false, active: false }); return id; },
    group: async (ids, windowId, groupId) => {
      const id = groupId ?? nextGroupId++;
      if (groupId === undefined) groups.set(id, { id, windowId, title: '', color: 'grey', collapsed: false });
      calls.push(['group', ids, windowId, id]);
      for (const tabId of ids) tabs.get(tabId).groupId = id;
      return id;
    },
  };
  const tab = (id, patch = {}) => ({ id, windowId: 1, index: id, title: `Tab ${id}`, url: `https://example.test/${id}`, groupId: -1, pinned: false, active: false, ...patch });
  const addGroup = (id, color, windowId = 1) => groups.set(id, { id, windowId, title: `Existing ${id}`, color, collapsed: true });
  tabs.set(1, tab(1)); tabs.set(2, tab(2)); tabs.set(3, tab(3, { pinned: true }));
  return { repo, port, calls, tabs, tab, groups, addGroup, spaceId, deny: () => { denyWrite = true; } };
}
function groupedOpen(title, windowId = 1) {
  return {
    type: 'open', target: { windowId }, group: { title },
    items: [{ id: 'a', title: 'A', url: 'https://restore.test/a' }],
  };
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
test('automatic colors use remaining colors in the target window, including grey', async t => {
  const f = await fixture();
  t.mock.method(Math, 'random', () => 0.99);
  GROUP_COLORS.filter(color => !['grey', 'blue', 'orange'].includes(color)).forEach((color, index) => f.addGroup(10 + index, color));
  f.addGroup(30, 'grey', 2);
  f.addGroup(31, 'orange', 2);

  assert.deepEqual((await operate(f.port, f.repo, groupedOpen('First'))).failures, []);
  assert.deepEqual((await operate(f.port, f.repo, groupedOpen('Second'))).failures, []);
  assert.equal(f.groups.get(80).color, 'orange');
  assert.equal(f.groups.get(81).color, 'grey');
  assert.equal(f.calls.includes('write'), false);
});
test('concurrent automatic restores do not select the same unused color', async t => {
  const f = await fixture();
  t.mock.method(Math, 'random', () => 0);
  const editGroup = f.port.editGroup;
  f.port.editGroup = async (...args) => {
    await new Promise(resolve => setImmediate(resolve));
    return editGroup(...args);
  };

  const results = await Promise.all(['First', 'Second'].map(title => operate(f.port, f.repo, groupedOpen(title))));
  assert.ok(results.every(result => result.failures.length === 0));
  assert.notEqual(f.groups.get(80).color, f.groups.get(81).color);
});
test('a full palette only reuses one of the least common colors', async t => {
  const f = await fixture();
  t.mock.method(Math, 'random', () => 0);
  GROUP_COLORS.forEach((color, index) => f.addGroup(10 + index, color));
  GROUP_COLORS.filter(color => !['red', 'purple'].includes(color)).forEach((color, index) => f.addGroup(30 + index, color));

  assert.deepEqual((await operate(f.port, f.repo, groupedOpen('Balanced'))).failures, []);
  assert.equal(f.groups.get(80).color, 'red');
});
test('an explicitly saved grey is kept even if it is already used', async () => {
  const f = await fixture();
  f.addGroup(10, 'grey');
  f.port.getGroups = async () => assert.fail('A saved color does not need to query groups');
  const operation = groupedOpen('Saved grey');
  operation.group.color = 'grey';

  assert.deepEqual((await operate(f.port, f.repo, operation)).failures, []);
  assert.equal(f.groups.get(80).color, 'grey');
  assert.equal(f.groups.get(10).color, 'grey');
});
test('automatic color failures retry on the already created group and tabs', async () => {
  for (const method of ['getGroups', 'editGroup']) {
    const f = await fixture();
    const original = f.port[method];
    f.port[method] = async () => { throw Error('temporarily unavailable'); };
    const first = await operate(f.port, f.repo, groupedOpen('Retry'));
    assert.equal(first.failures.length, 1);
    assert.equal(first.retry.target.groupId, 80);
    assert.equal(f.tabs.get(first.retry.opened.a).groupId, 80);

    f.port[method] = original;
    const second = await operate(f.port, f.repo, first.retry);
    assert.deepEqual(second.failures, []);
    assert.equal(f.groups.get(80).title, 'Retry');
    assert.equal(f.calls.filter(call => call[0] === 'create').length, 1);
    assert.equal(f.groups.size, 2);
  }
});
test('retry only joins missing tabs when the group was already configured', async () => {
  const f = await fixture();
  const create = f.port.create;
  f.port.create = async (url, target) => {
    if (url.endsWith('/b')) throw Error('temporarily unavailable');
    return create(url, target);
  };
  const operation = groupedOpen('Keep color');
  operation.items.push({ id: 'b', title: 'B', url: 'https://restore.test/b' });
  const first = await operate(f.port, f.repo, operation);
  assert.equal(first.failures.length, 1);
  const { groupId } = first.retry.target;
  const color = f.groups.get(groupId).color;

  f.port.create = create;
  f.port.getGroups = async () => assert.fail('Retry must keep the configured color');
  assert.deepEqual((await operate(f.port, f.repo, first.retry)).failures, []);
  assert.equal(f.groups.get(groupId).color, color);
  assert.equal(f.calls.filter(call => call[0] === 'editGroup').length, 1);
  assert.deepEqual([...f.tabs.values()].filter(tab => tab.groupId === groupId).map(tab => tab.url), operation.items.map(item => item.url));
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
