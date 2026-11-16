/** 扩展运行时装配；浏览器适配算法独立于 WXT 全局，便于测试调用约束。 */
import { browser } from 'wxt/browser';
import { createChromePort } from './chromeAdapter.ts';
export { liveTab, isVisibleBrowserTab } from './chromeAdapter.ts';
/** 工作台 URL 用于点击图标时查找并聚焦已有页面。 */
export const workspaceUrl = browser.runtime.getURL('/tabCove.html');
/** 生产浏览器端口；所有副作用调用真实 Chrome API。 */
export const chromePort = createChromePort(browser);
