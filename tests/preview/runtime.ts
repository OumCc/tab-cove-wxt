/** 预览专用适配器，所有窗口和数据都是隔离 fixture，不能操作真实 Chrome。 */
import { createLibraryRepository } from '../../src/services/libraryRepository.ts';
import { operate, previewSave, type BrowserPort } from '../../src/entrypoints/background/modules/tabOperations/service.ts';
import type { BrowserOperation, BrowserSnapshot, LiveTab, TabSource } from '../../src/types/browser.ts';
import type { LibraryCommand } from '../../src/types/core.ts';
const listeners = new Set<() => void>();
const storageListeners = new Set<(changes: object, area: string) => void>();
let seq = 0;
const fixture = { schemaVersion: 1, revision: 0, preferences: { saveDisposition: 'ask', restoreMode: 'ask' }, spaces: [
  { id: 'work', name: 'Work', collections: [
    { id: 'week', name: 'This week', tabs: [
      { id: 't1', title: 'Pull request #482', url: 'https://github.com/example/project/pull/482' },
      { id: 't2', title: 'Cycle 14 board', url: 'https://linear.app/example' },
      { id: 't3', title: 'Onboarding flow — Figma', url: 'https://figma.com/design/example' },
      { id: 't4', title: 'Launch checklist', url: 'https://example.com/launch' },
      { id: 't5', title: 'Design review notes', url: 'https://example.com/design' },
      { id: 't6', title: 'Weekly metrics', url: 'https://example.com/metrics' },
    ] },
    { id: 'engineering', name: 'Engineering', tabs: [
      { id: 't7', title: 'Web docs: Drag and Drop', url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API' },
      { id: 't8', title: 'Infra runbook', url: 'https://example.com/runbook' },
      { id: 't9', title: 'Package: fast-json-patch', url: 'https://npmjs.com/package/fast-json-patch' },
    ] },
  ] },
  { id: 'reading', name: 'Reading', collections: [{ id: 'later', name: 'Read later', tabs: [] }] },
  { id: 'design', name: 'Design', collections: [] },
] };
let value = JSON.parse(localStorage.getItem('tab-cove-preview') || JSON.stringify(fixture));
const repo = createLibraryRepository({ get: async () => structuredClone(value), set: async v => { value = structuredClone(v); localStorage.setItem('tab-cove-preview', JSON.stringify(v)); storageListeners.forEach(fn => fn({ tabCoveLibrary: {} }, 'local')); } }, () => crypto.randomUUID());
let tabs: LiveTab[] = [
  ['Figma – Onboarding v3', 'https://figma.com/design/example'], ['Pull request #482', 'https://github.com/example/project/pull/482'], ['Hacker News', 'https://news.ycombinator.com/'], ['Calendar – This week', 'https://calendar.google.com/'], ['Weekly metrics – Dashboard', 'https://example.com/metrics'],
].map(([title, url], index) => ({ id: index + 1, windowId: 1, index, title: title!, url: url!, groupId: index < 2 ? 10 : -1, pinned: false, active: index === 0 }));
let groups = [{ id: 10, windowId: 1, title: 'In progress', color: 'blue' as const, collapsed: false }];
let nextTab = 20;
const port: BrowserPort = {
  getTabs: async id => structuredClone(tabs.filter(t => t.windowId === id)), getTab: async id => structuredClone(tabs.find(t => t.id === id)), getGroup: async id => { const group = groups.find(g => g.id === id); if (!group) throw Error('Group not found'); return group; },
  focus: async id => { tabs.forEach(t => { t.active = t.id === id; }); }, close: async id => { tabs = tabs.filter(t => t.id !== id); },
  move: async (id, target) => { const tab = tabs.find(t => t.id === id)!; tabs = tabs.filter(t => t.id !== id); tab.windowId = target.windowId; tab.groupId = target.groupId ?? -1; const index = tabs.findIndex(t => t.id === target.beforeTabId); tabs.splice(index < 0 ? tabs.length : index, 0, tab); tabs.forEach((t, i) => { t.index = i; }); },
  editGroup: async (id, patch) => { Object.assign(groups.find(g => g.id === id)!, patch); }, ungroup: async id => { tabs.forEach(t => { if (t.groupId === id) t.groupId = -1; }); groups = groups.filter(g => g.id !== id); },
  ungroupTabs: async ids => { tabs.forEach(t => { if (ids.includes(t.id)) t.groupId = -1; }); },
  create: async (url, target) => { const id = ++nextTab; tabs.push({ id, windowId: target.windowId, index: tabs.length, title: new URL(url).hostname, url, groupId: -1, active: false, pinned: false }); return id; },
  group: async (ids, windowId, groupId) => { const id = groupId ?? ++nextTab; if (!groups.some(g => g.id === id)) groups.push({ id, windowId, title: '', color: 'blue', collapsed: false }); tabs.forEach(t => { if (ids.includes(t.id)) t.groupId = id; }); return id; },
};
/** 仅替代扩展在预览中使用的浏览器表面。 */
export const browser = { runtime: { getURL: (part: string) => new URL(part, location.origin).href }, windows: { getCurrent: async () => ({ id: 1 }) }, storage: { onChanged: { addListener: (fn: (c: object, a: string) => void) => storageListeners.add(fn), removeListener: (fn: (c: object, a: string) => void) => storageListeners.delete(fn) }, local: { get: async () => ({ tabCoveLibrary: value }) } } };
/** 预览发送器复用实际领域命令与会话编排，替代的仅为基础设施端口。 */
export async function sendMessage(type: string, data?: unknown) {
  try {
    let result: unknown;
    if (type === 'library:get') result = await repo.get();
    if (type === 'library:mutate') result = await repo.mutate(data as LibraryCommand);
    if (type === 'browser:getSnapshot') result = { epoch: 'preview', sequence: ++seq, groupsAvailable: true, windows: [{ id: 1, focused: true, tabs: structuredClone(tabs), groups: structuredClone(groups) }] } satisfies BrowserSnapshot;
    if (type === 'browser:previewSave') result = await previewSave(port, data as TabSource);
    if (type === 'browser:operate') { result = await operate(port, repo, data as BrowserOperation); listeners.forEach(fn => fn()); }
    return { ok: true, value: result };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Preview failed', code: 'INVALID_INPUT' }; }
}
/** 预览事件订阅与卸载。 */
export function onMessage(_type: string, listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
