/** Chrome API 适配：每次操作重新解析目标，不信任过期的 UI 索引。 */
import type { browser as BrowserApi } from 'wxt/browser';
import { AppError } from '../../../../services/libraryModel.ts';
import type { LiveTab, OpenTarget } from '../../../../types/browser.ts';
import type { BrowserPort } from './service.ts';
/** 目录和会话快照共用过滤规则：插件页及正跳转到插件的页面不进入工作台。 */
export function isVisibleBrowserTab(tab: { id?: number; url?: string; pendingUrl?: string }): boolean {
  return tab.id !== undefined && ![tab.url, tab.pendingUrl].some(url => url?.startsWith('chrome-extension://'));
}
/** 将 Chrome 的可选字段归一化；没有 ID 的暂态标签由调用方过滤。 */
export function liveTab(tab: { id?: number; windowId: number; index: number; title?: string; url?: string; pendingUrl?: string; pinned: boolean; active: boolean; groupId?: number }): LiveTab {
  return { id: tab.id!, windowId: tab.windowId, index: tab.index, title: tab.title || tab.url || tab.pendingUrl || 'Untitled tab', url: tab.url || tab.pendingUrl || '', pendingUrl: tab.pendingUrl, pinned: tab.pinned, active: tab.active, groupId: tab.groupId ?? -1 };
}
/** 注入 Chrome API 以验证原生调用边界；生产与测试使用相同的索引和校验逻辑。 */
export function createChromePort(browser: typeof BrowserApi): BrowserPort {
  /** 仅操作普通非隐身窗口，插件页面不能被目录命令移动或关闭。 */
  async function checkWindow(id: number) {
    const window = await browser.windows.get(id);
    if (window.incognito || window.type !== 'normal') throw new AppError('INVALID_INPUT', 'Choose a regular browser window.');
  }
  async function checkTab(id: number) {
    const tab = await browser.tabs.get(id); await checkWindow(tab.windowId);
    if (!isVisibleBrowserTab(tab)) throw new AppError('INVALID_INPUT', 'Extension pages cannot be managed here.');
    return tab;
  }
  async function destination(target: OpenTarget): Promise<number> {
    await checkWindow(target.windowId);
    if (target.groupId !== undefined) { const group = await browser.tabGroups.get(target.groupId); if (group.windowId !== target.windowId) throw new AppError('NOT_FOUND', 'The target group has moved.'); }
    if (target.beforeTabId !== undefined) {
      const before = await browser.tabs.get(target.beforeTabId);
      if (before.windowId !== target.windowId || before.pinned || (target.groupId ?? -1) !== (before.groupId ?? -1)) throw new AppError('NOT_FOUND', 'The drop position has changed.');
      return before.index;
    }
    if (target.groupId !== undefined) {
      const tabs = await browser.tabs.query({ groupId: target.groupId });
      if (!tabs.length || tabs.some(t => t.windowId !== target.windowId)) throw new AppError('NOT_FOUND', 'The target group has changed.');
      return Math.max(...tabs.map(t => t.index)) + 1;
    }
    return -1;
  }
  /** 真实浏览器端口；错误交由上层区分完全失败与部分成功。 */
  return {
    async getTab(id) {
      // 只把确认不存在视为已关闭；权限或查询失败仍向上报告。
      const tabs = await browser.tabs.query({}); const found = tabs.find(t => t.id === id); return found ? liveTab(found) : undefined;
    },
    async getTabs(windowId) { await checkWindow(windowId); return (await browser.tabs.query({ windowId })).filter(isVisibleBrowserTab).map(liveTab); },
    async getGroup(id) { const group = await browser.tabGroups.get(id); await checkWindow(group.windowId); return { ...group, title: group.title || '' }; },
    async focus(id) { const tab = await checkTab(id); await browser.tabs.update(id, { active: true }); await browser.windows.update(tab.windowId, { focused: true }); },
    async close(id, scope) {
      const tab = await checkTab(id);
      // 批量关闭过程中，用户可能把标签移出目标窗口或分组。
      if (scope && (tab.windowId !== scope.windowId || (scope.groupId !== undefined && (tab.groupId ?? -1) !== scope.groupId))) {
        throw new AppError('NOT_FOUND', 'The tab has moved out of the selected window or group.');
      }
      await browser.tabs.remove(id);
    },
    async move(id, target) {
      const tab = await checkTab(id); if (tab.pinned) throw new AppError('INVALID_INPUT', 'Unpin this tab before moving it.');
      if (target.beforeTabId === id) return;
      let index = await destination(target);
      if (tab.windowId === target.windowId && index > tab.index) index -= 1;
      await browser.tabs.move(id, { windowId: target.windowId, index });
      if (target.groupId !== undefined) await browser.tabs.group({ tabIds: [id], groupId: target.groupId });
      else await browser.tabs.ungroup(id);
    },
    async editGroup(id, patch) { const group = await browser.tabGroups.get(id); await checkWindow(group.windowId); await browser.tabGroups.update(id, patch); },
    async ungroup(id) { const group = await browser.tabGroups.get(id); await checkWindow(group.windowId); const tabs = await browser.tabs.query({ groupId: id }); if (tabs.length) await browser.tabs.ungroup(tabs.map(t => t.id!) as [number, ...number[]]); },
    async ungroupTabs(ids) { for (const id of ids) await checkTab(id); if (ids.length) await browser.tabs.ungroup(ids as [number, ...number[]]); },
    async create(url, target) { const index = await destination(target); const tab = await browser.tabs.create({ windowId: target.windowId, url, active: false, ...(index >= 0 ? { index } : {}) }); if (tab.id === undefined) throw new Error('No tab ID'); return tab.id; },
    async group(ids, windowId, groupId) {
      await checkWindow(windowId);
      for (const id of ids) { const tab = await checkTab(id); if (tab.windowId !== windowId) throw new AppError('NOT_FOUND', 'An opened tab has moved.'); }
      if (groupId !== undefined) { const group = await browser.tabGroups.get(groupId); if (group.windowId !== windowId) throw new AppError('NOT_FOUND', 'The target group has moved.'); }
      if (!ids.length) throw new AppError('INVALID_INPUT', 'No tabs were selected for grouping.');
      return browser.tabs.group({ tabIds: ids as [number, ...number[]], ...(groupId === undefined ? { createProperties: { windowId } } : { groupId }) });
    },
  };
}
