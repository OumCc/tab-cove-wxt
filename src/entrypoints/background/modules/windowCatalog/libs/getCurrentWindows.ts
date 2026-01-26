import type { TabInfo, WindowInfo } from '../types';

export default async function getCurrentWindows(): Promise<WindowInfo[]> {
  try {
    const allWindows = await browser.windows.getAll({
      populate: false, // 若设为 true，会直接返回窗口+tabs，但部分场景信息不全。比如，缺少 TabInfo 中的 title、url、favIconUrl
      windowTypes: ['normal']
    });

    return await Promise.all(
      allWindows.map(async (window) => {
        const fullTabs = await browser.tabs.query({ windowId: window.id });

        return {
          id: window.id,
          tabs: fullTabs.map((tab) => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            windowId: tab.windowId,
            index: tab.index,
            favIconUrl: tab.favIconUrl,
          })),
        };
      })
    );
  } catch (error) {
    console.error('getCurrentWindows error :>> ', error);
  }
}