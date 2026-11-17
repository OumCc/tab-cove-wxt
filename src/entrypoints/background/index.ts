/** 注册存储与浏览器命令；监听器同步建立，状态在每次请求时从权威来源读取。 */
import { browser } from 'wxt/browser';
import { nanoid } from 'nanoid';
import { defineBackground } from 'wxt/utils/define-background';
import { onMessage, sendMessage } from '../../types/messaging.ts';
import { AppError } from '../../services/libraryModel.ts';
import { createLibraryRepository } from '../../services/libraryRepository.ts';
import { libraryStorage } from '../../utils/storage/index.ts';
import { chromePort, liveTab, isVisibleBrowserTab } from './modules/tabOperations/adapter.ts';
import { operate, previewSave } from './modules/tabOperations/service.ts';
import registerWorkspaceAction from './modules/iconClickOpenTabCove.ts';
import type { Result } from '../../types/core.ts';
import type { BrowserSnapshot, LiveGroup } from '../../types/browser.ts';

export default defineBackground(() => {
  const repo = createLibraryRepository(libraryStorage, nanoid, browser.i18n.getMessage('defaultSpaceName'));
  const epoch = nanoid(); let sequence = 0; let timer: ReturnType<typeof setTimeout> | undefined;
  async function result<T>(run: () => Promise<T>): Promise<Result<T>> {
    try { return { ok: true, value: await run() }; }
    catch (error) { return { ok: false, code: error instanceof AppError ? error.code : 'BROWSER_OPERATION_FAILED', message: error instanceof AppError ? error.message : 'The browser could not complete this action. Refresh and try again.' }; }
  }
  function changed() {
    clearTimeout(timer);
    timer = setTimeout(() => { void sendMessage('browser:changed', { epoch, sequence: ++sequence }).catch(() => undefined); }, 80);
  }
  async function snapshot(): Promise<BrowserSnapshot> {
    const querySequence = ++sequence;
    const windows = (await browser.windows.getAll({ populate: true, windowTypes: ['normal'] })).filter(w => w.id !== undefined && !w.incognito);
    let groups: LiveGroup[] = []; let groupsAvailable = true;
    try { groups = (await browser.tabGroups.query({})).map(g => ({ ...g, title: g.title || '' })); } catch { groupsAvailable = false; }
    return { epoch, sequence: querySequence, groupsAvailable, windows: windows.map(w => ({ id: w.id!, focused: w.focused, tabs: (w.tabs || []).filter(isVisibleBrowserTab).map(liveTab).sort((a, b) => a.index - b.index), groups: groups.filter(g => g.windowId === w.id) })) };
  }
  onMessage('library:get', ({ data }) => result(() => repo.get(data)));
  onMessage('library:mutate', ({ data }) => result(() => repo.mutate(data)));
  onMessage('library:import', ({ data }) => result(() => repo.importBackup(data)));
  onMessage('browser:getSnapshot', () => result(snapshot));
  onMessage('browser:previewSave', ({ data }) => result(() => previewSave(chromePort, data)));
  onMessage('browser:operate', async ({ data }) => { const response = await result(() => operate(chromePort, repo, data)); changed(); return response; });
  registerWorkspaceAction();
  browser.tabs.onCreated.addListener(changed);
  browser.tabs.onRemoved.addListener(changed);
  browser.tabs.onMoved.addListener(changed);
  browser.tabs.onActivated.addListener(changed);
  browser.tabs.onAttached.addListener(changed);
  browser.tabs.onDetached.addListener(changed);
  browser.tabs.onUpdated.addListener((_id, info) => { if (['url', 'title', 'pinned', 'groupId', 'status'].some(key => key in info)) changed(); });
  browser.windows.onCreated.addListener(changed);
  browser.windows.onRemoved.addListener(changed);
  browser.windows.onFocusChanged.addListener(changed);
  browser.tabGroups?.onCreated.addListener(changed);
  browser.tabGroups?.onUpdated.addListener(changed);
  browser.tabGroups?.onRemoved.addListener(changed);
  browser.tabGroups?.onMoved.addListener(changed);
});
