import { debounceSendMessage } from '~/utils/debounceSendMessage';

import getCurrentWindows from './getCurrentWindows';

const TAB_COVE_URL = browser.runtime.getURL('/tabCove.html');

/** 仅当已有 Tab Cove 页面打开时再广播窗口信息，避免「无接收端」报错 */
async function broadcastWindowInfoIfListening() {
  const tabs = await browser.tabs.query({ url: TAB_COVE_URL });
  if (tabs.length === 0) return;
  debounceSendMessage('WC_updateWindowInfo', await getCurrentWindows());
}

export default () => {
  /*
    窗口事件
  */
  browser.windows.onCreated.addListener(async () => {
    console.log('windows onCreated :>> ');
    broadcastWindowInfoIfListening();
  });

  browser.windows.onRemoved.addListener(async () => {
    console.log('windows onRemoved :>> ');
    broadcastWindowInfoIfListening();
  });


  /*
    标签页事件 - PS：目前只选了必须的事件，避免触发过多
   */
  browser.tabs.onCreated.addListener(async (tab) => {
    console.log('tabs onCreated :>> ');
    broadcastWindowInfoIfListening();
  });

  browser.tabs.onRemoved.addListener(async () => {
    console.log('tabs onRemoved :>> ');
    broadcastWindowInfoIfListening();
  });

  // 当标签页的属性发生变化时触发，例如URL、加载状态或标题改变
  browser.tabs.onUpdated.addListener(async (tab) => {
    console.log('tabs onUpdated :>> ');
  });

  // 当标签页在同一个窗口内改变其位置（索引）时触发
  browser.tabs.onMoved.addListener(async (tab) => {
    console.log('tabs onMoved :>> ');
    broadcastWindowInfoIfListening();
  });

  // 当用户切换到一个新的标签页，使其成为窗口中的活动标签时触发
  // onDetached、onAttached，结束后最终都会触发 onActivated
  browser.tabs.onActivated.addListener(async (tab) => {
    console.log('tabs onActivated :>> ');
    broadcastWindowInfoIfListening();
  });

  // 测试防抖
  browser.tabs.onDetached.addListener(async (tab) => {
    console.log('tabs onDetached :>> ');
    broadcastWindowInfoIfListening();
  });
  browser.tabs.onAttached.addListener(async (tab) => {
    console.log('tabs onAttached :>> ');
    broadcastWindowInfoIfListening();
  });
};