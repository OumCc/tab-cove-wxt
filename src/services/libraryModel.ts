/** 资料库纯变换：以一次文档替换保持归属和顺序，失败不修改输入。 */
import type { Collection, ErrorCode, LibraryCommand, LibraryDocument, SavedTab, Space } from '../types/core.ts';

/** 可跨消息边界转换的业务错误，不包含网页敏感数据。 */
export class AppError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.code = code; }
}
/** Chrome 原生组的合法颜色，用于验证及编辑控件。 */
export const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'] as const;
/** 保留原始 URL 的查询与 fragment，仅允许可恢复的网页协议。 */
export function validUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
function invalid(message = 'The saved library is invalid. Its data has not been replaced.'): never { throw new AppError('INVALID_INPUT', message); }
function name(value: string): string { if (typeof value !== 'string' || !value.trim()) invalid('Please enter a name.'); return value.trim(); }
/** 对持久化边界做完整校验，未知版本和损坏数据均不能走初始化路径。 */
export function validateLibrary(value: unknown): asserts value is LibraryDocument {
  if (!value || typeof value !== 'object') invalid();
  const d = value as LibraryDocument;
  if (d.schemaVersion !== 1) throw new AppError('UNSUPPORTED_SCHEMA', 'This library version is not supported. Your data has not been changed.');
  if (!Number.isSafeInteger(d.revision) || d.revision < 0 || !Array.isArray(d.spaces)) invalid();
  if (!d.preferences || !['ask', 'keep', 'close'].includes(d.preferences.saveDisposition) || !['ask', 'tabs', 'group'].includes(d.preferences.restoreMode)) invalid();
  const ids = new Set<string>();
  const identity = (item: { id: string }) => { if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) invalid(); ids.add(item.id); };
  for (const s of d.spaces) {
    identity(s); if (typeof s.name !== 'string' || !s.name.trim() || !Array.isArray(s.collections)) invalid();
    for (const c of s.collections) {
      identity(c); if (typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(c.tabs)) invalid();
      if (c.groupColor !== undefined && !GROUP_COLORS.includes(c.groupColor)) invalid();
      for (const t of c.tabs) { identity(t); if (typeof t.title !== 'string' || !t.title.trim() || !validUrl(t.url)) invalid(); }
    }
  }
}
/** 仅在确认存储项缺失后创建独立的本地初始资料库。 */
export function emptyLibrary(id: () => string): LibraryDocument {
  return { schemaVersion: 1, revision: 0, spaces: [{ id: id(), name: 'Personal', collections: [] }], preferences: { saveDisposition: 'ask', restoreMode: 'ask' } };
}
/** 找不到目标时失败，避免并发操作复活已删除对象。 */
export function findCollection(d: LibraryDocument, id: string): { space: Space; collection: Collection } {
  for (const space of d.spaces) { const collection = space.collections.find(c => c.id === id); if (collection) return { space, collection }; }
  throw new AppError('NOT_FOUND', 'This collection no longer exists. Please choose another one.');
}
function findSpace(d: LibraryDocument, id: string): Space {
  const s = d.spaces.find(s => s.id === id); if (!s) throw new AppError('NOT_FOUND', 'This space no longer exists.'); return s;
}
function findTab(d: LibraryDocument, id: string): { collection: Collection; tab: SavedTab } {
  for (const s of d.spaces) for (const collection of s.collections) { const tab = collection.tabs.find(t => t.id === id); if (tab) return { collection, tab }; }
  throw new AppError('NOT_FOUND', 'This saved tab no longer exists.');
}
function insert<T extends { id: string }>(items: T[], item: T, beforeId?: string) {
  const index = beforeId === undefined ? items.length : items.findIndex(i => i.id === beforeId);
  if (index < 0) throw new AppError('NOT_FOUND', 'The drop position has changed. Please try again.');
  items.splice(index, 0, item);
}
function remove<T extends { id: string }>(items: T[], id: string) { items.splice(items.findIndex(i => i.id === id), 1); }
/** 生成一次可原子持久化的变更；ID 生成器注入以支持可重复的失败／并发测试。 */
export function applyCommand(document: LibraryDocument, command: LibraryCommand, id: () => string): LibraryDocument {
  validateLibrary(document);
  const d = structuredClone(document);
  switch (command.type) {
    case 'space:create': d.spaces.push({ id: id(), name: name(command.name), collections: [] }); break;
    case 'space:rename': findSpace(d, command.id).name = name(command.name); break;
    case 'space:delete': findSpace(d, command.id); remove(d.spaces, command.id); break;
    case 'space:move': {
      const s = findSpace(d, command.id); if (command.beforeId === s.id) break;
      remove(d.spaces, s.id); insert(d.spaces, s, command.beforeId); break;
    }
    case 'collection:create': insert(findSpace(d, command.spaceId).collections, { id: id(), name: name(command.name), tabs: [], ...(command.groupColor ? { groupColor: command.groupColor } : {}) }, command.beforeId); break;
    case 'collection:rename': findCollection(d, command.id).collection.name = name(command.name); break;
    case 'collection:delete': { const { space } = findCollection(d, command.id); remove(space.collections, command.id); break; }
    case 'collection:move': {
      const { space, collection } = findCollection(d, command.id); const target = findSpace(d, command.spaceId);
      if (command.beforeId === collection.id && target === space) break;
      remove(space.collections, collection.id); insert(target.collections, collection, command.beforeId); break;
    }
    case 'collection:merge': {
      if (command.id === command.targetId) invalid('Choose a different collection.');
      const source = findCollection(d, command.id); const target = findCollection(d, command.targetId).collection;
      target.tabs.push(...source.collection.tabs); remove(source.space.collections, source.collection.id); break;
    }
    case 'tab:edit': { const { tab } = findTab(d, command.id); if (!validUrl(command.url)) invalid('Enter a complete http:// or https:// URL.'); tab.title = name(command.title); tab.url = command.url; break; }
    case 'tab:delete': { const { collection } = findTab(d, command.id); remove(collection.tabs, command.id); break; }
    case 'tab:move': {
      const source = findTab(d, command.id); const target = findCollection(d, command.collectionId).collection;
      if (source.collection === target && command.beforeId === source.tab.id) break;
      remove(source.collection.tabs, source.tab.id); insert(target.tabs, source.tab, command.beforeId); break;
    }
    case 'tab:newCollection': {
      const source = findTab(d, command.id); const space = findSpace(d, command.spaceId);
      remove(source.collection.tabs, source.tab.id); insert(space.collections, { id: id(), name: name(command.name), tabs: [source.tab] }, command.beforeId); break;
    }
    case 'tabs:save': {
      if (!command.tabs.length) invalid('There are no tabs to save.');
      let target: Collection;
      if ('collectionId' in command.target) target = findCollection(d, command.target.collectionId).collection;
      else {
        target = { id: id(), name: name(command.target.name), tabs: [], ...(command.target.groupColor ? { groupColor: command.target.groupColor } : {}) };
        insert(findSpace(d, command.target.spaceId).collections, target, command.target.beforeId);
      }
      for (const tab of command.tabs) {
        if (!validUrl(tab.url)) invalid('Only http:// and https:// pages can be saved.');
        insert(target.tabs, { id: id(), title: tab.title.trim() || tab.url, url: tab.url }, 'collectionId' in command.target ? command.target.beforeId : undefined);
      }
      if (command.preference) d.preferences.saveDisposition = command.preference;
      break;
    }
    case 'preferences': d.preferences = { ...d.preferences, ...command.patch }; break;
    default: invalid('Unknown library action.');
  }
  d.revision += 1; validateLibrary(d); return d;
}
