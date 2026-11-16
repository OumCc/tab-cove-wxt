/** 会话编排：先保存再关闭；浏览器部分失败返回可针对性重试的剩余操作。 */
import { AppError, validUrl } from '../../../../services/libraryModel.ts';
import type { createLibraryRepository } from '../../../../services/libraryRepository.ts';
import type { BrowserOperation, LiveGroup, LiveTab, OpenTarget, OperationReport, SavePreview, TabSource } from '../../../../types/browser.ts';
import type { GroupColor } from '../../../../types/core.ts';
export interface BrowserPort {
  getTab(id: number): Promise<LiveTab | undefined>;
  getTabs(windowId: number): Promise<LiveTab[]>;
  getGroup(id: number): Promise<LiveGroup>;
  focus(id: number): Promise<void>;
  close(id: number): Promise<void>;
  move(id: number, target: OpenTarget): Promise<void>;
  editGroup(id: number, patch: { title?: string; color?: GroupColor; collapsed?: boolean }): Promise<void>;
  ungroup(id: number): Promise<void>;
  ungroupTabs(ids: number[]): Promise<void>;
  create(url: string, target: OpenTarget): Promise<number>;
  group(ids: number[], windowId: number, groupId?: number): Promise<number>;
}
type Repository = ReturnType<typeof createLibraryRepository>;
/** 将指定窗口、组或单标签转换为确认弹窗的固定快照；不写入也不关闭。 */
export async function previewSave(port: BrowserPort, source: TabSource, now = new Date()): Promise<SavePreview> {
  const all = await port.getTabs(source.windowId);
  const tabs = all.filter(t => validUrl(t.url) && (source.tabId === undefined ? !t.pinned : t.id === source.tabId) && (source.groupId === undefined || t.groupId === source.groupId)).sort((a, b) => a.index - b.index);
  if (!tabs.length) throw new AppError('INVALID_INPUT', 'There are no web tabs to save. Pinned tabs are excluded from a session.');
  const dateName = `${now.toLocaleDateString('en', { month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (source.groupId !== undefined) { const group = await port.getGroup(source.groupId); return { tabs, name: group.title || dateName, groupColor: group.color }; }
  return { tabs, name: dateName };
}
/** 在存储／浏览器端口之间执行一次用户动作，不自动重放未知完成状态的请求。 */
export async function operate(port: BrowserPort, repo: Repository, operation: BrowserOperation): Promise<OperationReport> {
  const report: OperationReport = { message: 'Done', failures: [] };
  switch (operation.type) {
    case 'focus': await port.focus(operation.tabId); break;
    case 'close': await port.close(operation.tabId); break;
    case 'move': await port.move(operation.tabId, operation.target); break;
    case 'editGroup': await port.editGroup(operation.groupId, { ...(operation.title !== undefined ? { title: operation.title } : {}), ...(operation.color !== undefined ? { color: operation.color } : {}), ...(operation.collapsed !== undefined ? { collapsed: operation.collapsed } : {}) }); break;
    case 'ungroup': await port.ungroup(operation.groupId); break;
    case 'save': {
      if (!operation.preview.tabs.length) throw new AppError('INVALID_INPUT', 'There are no tabs to save.');
      await repo.mutate({ type: 'tabs:save', target: operation.target, tabs: operation.preview.tabs.map(t => ({ title: t.title, url: t.url })), ...(operation.remember ? { preference: operation.disposition } : {}) });
      if (operation.disposition === 'close') for (const saved of operation.preview.tabs) {
        try {
          const current = await port.getTab(saved.id);
          if (!current) continue;
          if (current.pinned) continue;
          if (current.url !== saved.url || (current.pendingUrl && current.pendingUrl !== saved.url) || current.windowId !== saved.windowId || current.groupId !== saved.groupId) { report.failures.push(`${saved.title}: saved, but left open because the page changed.`); continue; }
          await port.close(saved.id);
        } catch { report.failures.push(`${saved.title}: saved, but could not be closed.`); }
      }
      report.message = `${operation.preview.tabs.length} ${operation.preview.tabs.length === 1 ? 'tab' : 'tabs'} saved`; break;
    }
    case 'open': {
      if (!operation.items.length) throw new AppError('INVALID_INPUT', 'This collection is empty.');
      if (operation.items.some(item => !validUrl(item.url))) throw new AppError('INVALID_INPUT', 'Only http:// and https:// links can be opened.');
      if (operation.remember) await repo.mutate({ type: 'preferences', patch: { restoreMode: operation.remember } });
      const opened = { ...operation.opened };
      let groupId = operation.target.groupId;
      let groupFailed = false;
      let inspectionFailed = false;
      for (let index = 0; index < operation.items.length; index++) {
        const item = operation.items[index]!;
        if (opened[item.id] !== undefined) continue;
        const nextOpened = operation.items.slice(index + 1).find(next => opened[next.id] !== undefined);
        try {
          const target = { ...operation.target, ...(nextOpened ? { beforeTabId: opened[nextOpened.id] } : {}) };
          opened[item.id] = await port.create(item.url, target);
        } catch { report.failures.push(`${item.title}: could not be opened.`); }
      }
      const ids: number[] = [];
      for (const item of operation.items) {
        const tabId = opened[item.id];
        if (tabId === undefined) continue;
        let tab: LiveTab | undefined;
        try { tab = await port.getTab(tabId); }
        catch { inspectionFailed = true; report.failures.push(`${item.title}: opened, but its current state could not be checked.`); continue; }
        if (!tab || tab.windowId !== operation.target.windowId) {
          report.failures.push(`${item.title}: the opened page has changed. It was not moved or reopened.`);
          continue;
        }
        ids.push(tabId);
      }
      if (ids.length && (operation.group || groupId !== undefined)) {
        try {
          groupId = await port.group(ids, operation.target.windowId, groupId);
          if (operation.group) await port.editGroup(groupId, operation.group);
        } catch { groupFailed = true; report.failures.push('Tabs are open, but their group could not be completed.'); }
      }
      if (ids.length && !operation.group && groupId === undefined) {
        try { await port.ungroupTabs(ids); }
        catch { groupFailed = true; report.failures.push('Tabs are open, but could not be removed from an inherited browser group.'); }
      }
      if (operation.items.some(item => opened[item.id] === undefined) || groupFailed || inspectionFailed) {
        report.retry = { ...operation, opened, target: { ...operation.target, ...(groupId !== undefined ? { groupId } : {}) }, remember: undefined };
      }
      if (operation.activate && ids.length === 1 && !report.failures.length) try { await port.focus(ids[0]!); }
      catch { report.failures.push('The page opened, but could not be focused.'); }
      report.message = `${Object.keys(opened).length} ${Object.keys(opened).length === 1 ? 'tab' : 'tabs'} opened`; break;
    }
    default: throw new AppError('INVALID_INPUT', 'Unknown browser action.');
  }
  return report;
}
