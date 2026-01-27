import type { WindowInfo } from '../types';

import shouldIncludeTab from '../utils/shouldIncludeTab';

export default async (): Promise<WindowInfo[]> => {
  try {
    const allWindows = await browser.windows.getAll({
      populate: false, // 若设为 true，会直接返回窗口+tabs，但部分场景信息不全。比如，缺少 TabInfo 中的 title、url、favIconUrl
      windowTypes: ['normal']
    });

    const windowInfos = await Promise.all(
      allWindows
        .filter((window): window is typeof window & { id: number } => window.id !== undefined)
        .map(async (window) => {
          const fullTabs = await browser.tabs.query({ windowId: window.id });

          return {
            id: window.id,
            tabs: fullTabs
              .filter((tab): tab is typeof tab & { id: number; url: string; title: string } =>
                tab.id !== undefined && tab.title !== undefined && tab.url !== undefined && shouldIncludeTab(tab.url)
              )
              .map((tab) => ({
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

    // console.log('windowInfos :>> ', windowInfos);
    return windowInfos;
  } catch (error) {
    console.error('getCurrentWindows error :>> ', error);
    return [];
  }
};