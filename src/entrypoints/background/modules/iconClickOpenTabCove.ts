/** 独立工作台入口；快速重复点击共享同一打开任务，防止产生重复页面。 */
import { browser } from 'wxt/browser';
import { workspaceUrl } from './tabOperations/adapter.ts';
/** 同步注册图标点击，保留 Chrome 原有的新标签页配置。 */
export default function registerWorkspaceAction() {
  let opening: Promise<void> | undefined;
  browser.action.onClicked.addListener(() => {
    if (opening) return;
    opening = (async () => {
      const [tab] = await browser.tabs.query({ url: workspaceUrl });
      if (tab?.id !== undefined) { await browser.tabs.update(tab.id, { active: true }); await browser.windows.update(tab.windowId, { focused: true }); }
      else await browser.tabs.create({ url: workspaceUrl });
    })().catch(error => console.error('Could not open Tab Cove', error)).finally(() => { opening = undefined; });
  });
}
