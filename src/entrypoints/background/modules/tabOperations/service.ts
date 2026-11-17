/** 会话编排：将浏览器命令限制在指定范围内，保存会话时先持久化再关闭，并报告部分失败。 */
import { countLabel, sessionName, translate } from '../../../../i18n/core.ts';
import type { MessageKey } from '../../../../i18n/messages.ts';
import { AppError, GROUP_COLORS, validUrl } from '../../../../services/libraryModel.ts';
import type { createLibraryRepository } from '../../../../services/libraryRepository.ts';
import type { BrowserOperation, LiveGroup, LiveTab, OpenTarget, OperationReport, SavePreview, TabSource } from '../../../../types/browser.ts';
import type { GroupColor } from '../../../../types/core.ts';
export interface BrowserPort {
  getTab(id: number): Promise<LiveTab | undefined>;
  getTabs(windowId: number): Promise<LiveTab[]>;
  getGroup(id: number): Promise<LiveGroup>;
  /** 读取指定窗口中的实时原生组。查询失败向上报告，空数组表示没有组。 */
  getGroups(windowId: number): Promise<LiveGroup[]>;
  focus(id: number): Promise<void>;
  /** 批量关闭时复查标签仍在指定窗口或组内，移出范围的标签保留。 */
  close(id: number, scope?: { windowId: number; groupId?: number }): Promise<void>;
  move(id: number, target: OpenTarget): Promise<void>;
  editGroup(id: number, patch: { title?: string; color?: GroupColor; collapsed?: boolean }): Promise<void>;
  ungroup(id: number): Promise<void>;
  ungroupTabs(ids: number[]): Promise<void>;
  create(url: string, target: OpenTarget): Promise<number>;
  group(ids: number[], windowId: number, groupId?: number): Promise<number>;
}
type Repository = ReturnType<typeof createLibraryRepository>;
const groupRestoreQueue = new Map<number, Promise<void>>();

// 同一窗口的恢复须等前一组写入颜色后再查询，避免并发选中同一个空闲颜色。
function restoreGroupInWindow(windowId: number, run: () => Promise<void>): Promise<void> {
  const previous = groupRestoreQueue.get(windowId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  groupRestoreQueue.set(windowId, next);
  return next.finally(() => {
    if (groupRestoreQueue.get(windowId) === next) groupRestoreQueue.delete(windowId);
  });
}

function chooseGroupColor(groups: LiveGroup[], groupId: number): GroupColor {
  const usage = new Map<GroupColor, number>();
  for (const group of groups) {
    if (group.id !== groupId) usage.set(group.color, (usage.get(group.color) ?? 0) + 1);
  }
  const minimum = Math.min(...GROUP_COLORS.map(color => usage.get(color) ?? 0));
  const candidates = GROUP_COLORS.filter(color => (usage.get(color) ?? 0) === minimum);
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

/** 将指定窗口、组或单标签转换为确认弹窗的固定快照；不写入也不关闭。 */
export async function previewSave(port: BrowserPort, source: TabSource, now = new Date()): Promise<SavePreview> {
  const all = await port.getTabs(source.windowId);
  const tabs = all.filter(t => validUrl(t.url) && (source.tabId === undefined ? !t.pinned : t.id === source.tabId) && (source.groupId === undefined || t.groupId === source.groupId)).sort((a, b) => a.index - b.index);
  if (!tabs.length) throw new AppError('INVALID_INPUT', 'There are no web tabs to save. Pinned tabs are excluded from a session.');
  const dateName = sessionName(source.locale || 'en', now);
  if (source.groupId !== undefined) { const group = await port.getGroup(source.groupId); return { tabs, name: group.title || dateName, groupColor: group.color }; }
  return { tabs, name: dateName };
}
/** 在存储／浏览器端口之间执行一次用户动作，不自动重放未知完成状态的请求。 */
export async function operate(port: BrowserPort, repo: Repository, operation: BrowserOperation): Promise<OperationReport> {
  const locale = operation.locale || 'en';
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params);
  const report: OperationReport = { message: t('Done'), failures: [] };
  switch (operation.type) {
    case 'focus': await port.focus(operation.tabId); break;
    case 'close': await port.close(operation.tabId); break;
    case 'closeTabs': {
      const tabs = await port.getTabs(operation.windowId);
      for (const tab of tabs) {
        if (operation.groupId !== undefined && tab.groupId !== operation.groupId) continue;
        try { await port.close(tab.id, operation); }
        catch { report.failures.push(t('{name}: could not be closed.', { name: tab.title })); }
      }
      if (report.failures.length) report.message = t('Could not close all tabs.');
      break;
    }
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
          if (current.url !== saved.url || (current.pendingUrl && current.pendingUrl !== saved.url) || current.windowId !== saved.windowId || current.groupId !== saved.groupId) { report.failures.push(t('{name}: saved, but left open because the page changed.', { name: saved.title })); continue; }
          await port.close(saved.id);
        } catch { report.failures.push(t('{name}: saved, but could not be closed.', { name: saved.title })); }
      }
      report.message = countLabel(locale, 'saved', operation.preview.tabs.length); break;
    }
    case 'open': {
      if (!operation.items.length) throw new AppError('INVALID_INPUT', 'This collection is empty.');
      if (operation.items.some(item => !validUrl(item.url))) throw new AppError('INVALID_INPUT', 'Only http:// and https:// links can be opened.');
      if (operation.remember) await repo.mutate({ type: 'preferences', patch: { restoreMode: operation.remember } });
      const opened = { ...operation.opened };
      const { group, target } = operation;
      let groupId = target.groupId;
      let pendingGroup = group;
      let groupFailed = false;
      let inspectionFailed = false;
      for (let index = 0; index < operation.items.length; index++) {
        const item = operation.items[index]!;
        if (opened[item.id] !== undefined) continue;
        const nextOpened = operation.items.slice(index + 1).find(next => opened[next.id] !== undefined);
        try {
          const target = { ...operation.target, ...(nextOpened ? { beforeTabId: opened[nextOpened.id] } : {}) };
          opened[item.id] = await port.create(item.url, target);
        } catch { report.failures.push(t('{name}: could not be opened.', { name: item.title })); }
      }
      const ids: number[] = [];
      for (const item of operation.items) {
        const tabId = opened[item.id];
        if (tabId === undefined) continue;
        let tab: LiveTab | undefined;
        try { tab = await port.getTab(tabId); }
        catch { inspectionFailed = true; report.failures.push(t('{name}: opened, but its current state could not be checked.', { name: item.title })); continue; }
        if (!tab || tab.windowId !== operation.target.windowId) {
          report.failures.push(t('{name}: the opened page has changed. It was not moved or reopened.', { name: item.title }));
          continue;
        }
        ids.push(tabId);
      }
      if (ids.length && (group || groupId !== undefined)) {
        try {
          const completeGroup = async () => {
            const id = await port.group(ids, target.windowId, groupId);
            groupId = id;
            if (group) {
              const color = group.color ?? chooseGroupColor(await port.getGroups(target.windowId), id);
              await port.editGroup(id, { title: group.title, color });
              pendingGroup = undefined;
            }
          };
          if (group) await restoreGroupInWindow(target.windowId, completeGroup);
          else await completeGroup();
        } catch { groupFailed = true; report.failures.push(t('Tabs are open, but their group could not be completed.')); }
      }
      if (ids.length && !group && groupId === undefined) {
        try { await port.ungroupTabs(ids); }
        catch { groupFailed = true; report.failures.push(t('Tabs are open, but could not be removed from an inherited browser group.')); }
      }
      if (operation.items.some(item => opened[item.id] === undefined) || groupFailed || inspectionFailed) {
        report.retry = { ...operation, opened, group: pendingGroup, target: { ...target, ...(groupId !== undefined ? { groupId } : {}) }, remember: undefined };
      }
      if (operation.activate && ids.length === 1 && !report.failures.length) try { await port.focus(ids[0]!); }
      catch { report.failures.push(t('The page opened, but could not be focused.')); }
      report.message = countLabel(locale, 'opened', Object.keys(opened).length); break;
    }
    default: throw new AppError('INVALID_INPUT', 'Unknown browser action.');
  }
  return report;
}
