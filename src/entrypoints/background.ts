export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 监听插件图标点击事件
  browser.action.onClicked.addListener(async () => {
    // 打开 tabs 页面
    // @ts-ignore - WXT 类型定义限制，但运行时支持任意入口点 URL
    const tabsUrl = browser.runtime.getURL('/cove.html');
    
    // 检查是否已经打开了 tabs 页面
    const existingTabs = await browser.tabs.query({ url: tabsUrl });
    
    if (existingTabs.length > 0) {
      // 如果已经打开，则激活该标签页
      const tab = existingTabs[0];
      if (tab.id) {
        await browser.tabs.update(tab.id, { active: true });
        if (tab.windowId) {
          await browser.windows.update(tab.windowId, { focused: true });
        }
      }
    } else {
      // 如果未打开，则创建新标签页
      await browser.tabs.create({ url: tabsUrl });
    }
  });
});
