import test from 'node:test';
import assert from 'node:assert/strict';
import { createChromePort, liveTab } from '../src/entrypoints/background/modules/tabOperations/chromeAdapter.ts';
import { operate } from '../src/entrypoints/background/modules/tabOperations/service.ts';

const workspaceUrl = 'chrome-extension://fixture/tabCove.html';
function fixture() {
  const calls = [];
  const tabs = new Map([1, 2, 3, 4].map((id, index) => [id, { id, index, windowId: 10, pinned: false, active: false, groupId: -1, title: `Page ${id}`, url: `https://example.test/${id}` }]));
  const windows = new Map([[10, { id: 10, type: 'normal', incognito: false }], [20, { id: 20, type: 'normal', incognito: false }]]);
  const groups = new Map([[7, { id: 7, windowId: 20, title: 'Research', color: 'blue', collapsed: false }]]);
  const get = (map, id) => { if (!map.has(id)) throw Error('not found'); return structuredClone(map.get(id)); };
  const api = {
    windows: { get: async id => get(windows, id), update: async (id, patch) => { calls.push(['focusWindow', id, patch]); } },
    tabs: {
      get: async id => get(tabs, id),
      query: async filter => [...tabs.values()].filter(t => Object.entries(filter).every(([key, value]) => t[key] === value)).map(t => structuredClone(t)),
      update: async (id, patch) => { calls.push(['update', id, patch]); },
      remove: async id => { calls.push(['remove', id]); tabs.delete(id); },
      move: async (id, target) => {
        calls.push(['move', id, target]);
        const moved = tabs.get(id); moved.windowId = target.windowId;
        const rest = [...tabs.values()].filter(t => t.windowId === target.windowId && t.id !== id).sort((a, b) => a.index - b.index);
        rest.splice(target.index < 0 ? rest.length : target.index, 0, moved); rest.forEach((t, index) => { t.index = index; });
      },
      ungroup: async ids => { calls.push(['ungroup', ids]); for (const id of Array.isArray(ids) ? ids : [ids]) tabs.get(id).groupId = -1; },
      group: async details => { calls.push(['group', details]); return details.groupId ?? 99; },
      create: async details => { calls.push(['create', details]); return { id: 101 }; },
    },
    tabGroups: { get: async id => get(groups, id), update: async (id, patch) => { calls.push(['editGroup', id, patch]); } },
  };
  return { api, calls, tabs, windows, groups, port: createChromePort(api) };
}
test('same-window move inserts immediately before the selected anchor in both directions', async () => {
  const f = fixture();
  await f.port.move(1, { windowId: 10, beforeTabId: 4 });
  assert.deepEqual([...f.tabs.values()].sort((a, b) => a.index - b.index).map(t => t.id), [2, 3, 1, 4]);
  await f.port.move(4, { windowId: 10, beforeTabId: 2 });
  assert.deepEqual([...f.tabs.values()].sort((a, b) => a.index - b.index).map(t => t.id), [4, 2, 3, 1]);
});
test('cross-window move does not subtract the source index from the destination index', async () => {
  const f = fixture(); f.tabs.get(4).windowId = 20; f.tabs.get(4).index = 0;
  await f.port.move(2, { windowId: 20, beforeTabId: 4 });
  assert.deepEqual(f.calls[0], ['move', 2, { windowId: 20, index: 0 }]);
  assert.equal(f.tabs.get(2).index, 0); assert.equal(f.tabs.get(4).index, 1);
});
test('moving into a group resolves its current end and groups only after the move', async () => {
  const f = fixture(); Object.assign(f.tabs.get(4), { windowId: 20, groupId: 7, index: 2 });
  await f.port.move(1, { windowId: 20, groupId: 7 });
  assert.deepEqual(f.calls, [['move', 1, { windowId: 20, index: 3 }], ['group', { tabIds: [1], groupId: 7 }]]);
});
test('stale window, group, anchor or pinned source rejects before side effects', async () => {
  for (const setup of [
    f => { f.windows.delete(20); },
    f => { f.groups.get(7).windowId = 10; },
    f => { f.tabs.get(4).windowId = 10; },
    f => { f.tabs.get(4).groupId = -1; },
    f => { f.tabs.get(4).pinned = true; },
    f => { f.tabs.get(1).pinned = true; },
  ]) {
    const f = fixture(); Object.assign(f.tabs.get(4), { windowId: 20, groupId: 7 }); setup(f);
    await assert.rejects(f.port.move(1, { windowId: 20, groupId: 7, beforeTabId: 4 })); assert.deepEqual(f.calls, []);
  }
});
test('workspace pages, including pending navigation, are protected and excluded', async () => {
  for (const field of ['url', 'pendingUrl']) {
    const f = fixture(); f.tabs.get(1)[field] = workspaceUrl;
    await assert.rejects(f.port.close(1)); await assert.rejects(f.port.move(1, { windowId: 20 }));
    assert.equal((await f.port.getTabs(10)).some(t => t.id === 1), false); assert.deepEqual(f.calls, []);
  }
});
test('private and non-normal windows cannot be used for native mutations', async () => {
  for (const patch of [{ incognito: true }, { type: 'popup' }]) {
    const f = fixture(); Object.assign(f.windows.get(10), patch);
    await assert.rejects(f.port.close(1)); await assert.rejects(f.port.create('https://example.test/', { windowId: 10 })); assert.deepEqual(f.calls, []);
  }
});
test('ungrouping acts on members without closing them', async () => {
  const f = fixture(); Object.assign(f.tabs.get(4), { windowId: 20, groupId: 7 });
  await f.port.ungroup(7); assert.deepEqual(f.calls, [['ungroup', [4]]]); assert.ok(f.tabs.has(4)); assert.equal(f.tabs.get(4).groupId, -1);
});
test('group restore creates a new native group and rejects tabs that moved away', async () => {
  const f = fixture(); assert.equal(await f.port.group([1, 2], 10), 99);
  assert.deepEqual(f.calls, [['group', { tabIds: [1, 2], createProperties: { windowId: 10 } }]]);
  f.calls.length = 0; f.tabs.get(2).windowId = 20;
  await assert.rejects(f.port.group([1, 2], 10)); assert.deepEqual(f.calls, []);
});
test('read failures are distinct from confirmed missing tabs and pending URLs remain usable', async () => {
  const f = fixture(); assert.equal(await f.port.getTab(404), undefined);
  f.api.tabs.query = async () => { throw Error('permission denied'); };
  await assert.rejects(f.port.getTab(1), /permission denied/);
  const pending = liveTab({ id: 9, index: 0, windowId: 10, pinned: false, active: false, pendingUrl: 'https://loading.test/' });
  assert.equal(pending.url, 'https://loading.test/'); assert.equal(pending.groupId, -1);
});

test('a group disappearing between lookup and member query prevents creating or moving pages', async () => {
  const f = fixture();
  await assert.rejects(f.port.create('https://example.test/', { windowId: 20, groupId: 7 }), /target group has changed/);
  await assert.rejects(f.port.move(1, { windowId: 20, groupId: 7 }), /target group has changed/);
  assert.deepEqual(f.calls, []);
});

test('other extensions and pending extension navigation are excluded while Chrome internal pages remain visible', async () => {
  const f = fixture();
  f.tabs.get(1).url = 'chrome-extension://another-extension/dashboard.html';
  f.tabs.get(2).pendingUrl = 'chrome-extension://another-extension/popup.html';
  f.tabs.get(3).url = 'chrome://settings/';
  assert.deepEqual((await f.port.getTabs(10)).map(t => t.id), [3, 4]);
});

test('bulk window close includes pinned and grouped tabs while keeping extension pages and other windows', async () => {
  const f = fixture();
  f.tabs.get(1).pinned = true;
  f.tabs.get(2).groupId = 7;
  f.tabs.get(3).pendingUrl = workspaceUrl;
  f.tabs.get(4).windowId = 20;
  f.tabs.set(5, { ...f.tabs.get(1), id: 5, pinned: false, url: workspaceUrl });
  f.groups.get(7).windowId = 10;

  const result = await operate(f.port, undefined, { type: 'closeTabs', windowId: 10 });

  assert.deepEqual(result.failures, []);
  assert.deepEqual(f.calls, [['remove', 1], ['remove', 2]]);
  assert.deepEqual([...f.tabs.keys()], [3, 4, 5]);
});

test('bulk group close removes all members of a collapsed group', async () => {
  const f = fixture();
  Object.assign(f.groups.get(7), { windowId: 10, collapsed: true });
  f.tabs.get(1).groupId = 7;
  f.tabs.get(2).groupId = 7;
  f.tabs.get(3).groupId = 8;

  const result = await operate(f.port, undefined, { type: 'closeTabs', windowId: 10, groupId: 7 });

  assert.deepEqual(result.failures, []);
  assert.deepEqual([...f.tabs.keys()], [3, 4]);
});

test('bulk close keeps tabs moved out of scope and continues closing other members', async () => {
  for (const patch of [{ windowId: 20 }, { groupId: -1 }]) {
    const f = fixture();
    f.groups.get(7).windowId = 10;
    f.tabs.get(1).groupId = 7;
    f.tabs.get(2).groupId = 7;
    const query = f.api.tabs.query;
    f.api.tabs.query = async filter => {
      const selected = await query(filter);
      Object.assign(f.tabs.get(1), patch);
      return selected;
    };

    const result = await operate(f.port, undefined, { type: 'closeTabs', windowId: 10, groupId: 7 });

    assert.deepEqual(f.calls, [['remove', 2]]);
    assert.deepEqual(result.failures, ['Page 1: could not be closed.']);
    assert.ok(f.tabs.has(1));
  }
});
