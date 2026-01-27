import { sendMessage } from '~/types/messaging';

import getCurrentWindows from './getCurrentWindows';

export default () => {
  /*
    窗口事件
  */
  browser.windows.onCreated.addListener(async () => {
    console.log('windows onCreated :>> ');

    sendMessage('WC_updateWindowInfo', await getCurrentWindows());
  });

  browser.windows.onRemoved.addListener(async () => {
    console.log('windows onRemoved :>> ');

    sendMessage('WC_updateWindowInfo', await getCurrentWindows());
  });


  /*
    标签页事件 - PS：目前只选了必须的事件，避免触发过多
   */
  browser.tabs.onCreated.addListener(async (tab) => {
    console.log('tabs onCreated :>> ');

    sendMessage('WC_updateWindowInfo', await getCurrentWindows());
  });

  browser.tabs.onRemoved.addListener(async (tab) => {
    console.log('tabs onRemoved :>> ');

    sendMessage('WC_updateWindowInfo', await getCurrentWindows());
  });

  // 当标签页的属性发生变化时触发，例如URL、加载状态或标题改变
  browser.tabs.onUpdated.addListener(async (tab) => {
    console.log('tabs onUpdated :>> ');
  });

  // 当标签页在同一个窗口内改变其位置（索引）时触发
  browser.tabs.onMoved.addListener(async (tab) => {
    console.log('tabs onMoved :>> ');

    sendMessage('WC_updateWindowInfo', await getCurrentWindows());
  });

  // 当用户切换到一个新的标签页，使其成为窗口中的活动标签时触发
  // onDetached、onAttached，结束后最终都会触发 onActivated
  browser.tabs.onActivated.addListener(async (tab) => {
    console.log('tabs onActivated :>> ');

    
  });
};