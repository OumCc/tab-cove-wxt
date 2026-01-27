import getCurrentWindows from './getCurrentWindows';

export default () => {
  // 窗口事件
  browser.windows.onCreated.addListener(async () => {
    await getCurrentWindows();
  });

  browser.windows.onRemoved.addListener(async () => {
    await getCurrentWindows();
  });


  // 标签页事件
  browser.tabs.onCreated.addListener(async (tab) => {
    console.log('tabs onCreated :>> ');
  });

  browser.tabs.onRemoved.addListener(async (tab) => {
    console.log('tabs onRemoved :>> ');
  });

  browser.tabs.onUpdated.addListener(async (tab) => {
    console.log('tabs onUpdated :>> ');
  });

  browser.tabs.onMoved.addListener(async (tab) => {
    console.log('tabs onMoved :>> ');
  });

  browser.tabs.onActivated.addListener(async (tab) => {
    console.log('tabs onActivated :>> ');
  });

  browser.tabs.onDetached.addListener(async (tab) => {
    console.log('tabs onDetached :>> ');
  });

  browser.tabs.onAttached.addListener(async (tab) => {
    console.log('tabs onAttached :>> ');
  });
};