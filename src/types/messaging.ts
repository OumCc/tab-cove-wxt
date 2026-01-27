import { defineExtensionMessaging } from '@webext-core/messaging';

import type { WindowInfo } from '~/entrypoints/background/modules/windowCatalog/types';

interface ProtocolMap {
  // tab 向 background 请求窗口信息
  // WC_reqWindowInfo: () => Promise<WindowInfo[]>;
  WC_getWindowInfo: () => Promise<WindowInfo[]>;

  // background 给 tab 返回窗口信息
  WC_resWindowInfo: () => Promise<WindowInfo[]>;

  // background 给 tab 发送最新的窗口信息
  // WC_sendWindowInfo: () => Promise<WindowInfo[]>;
  WC_updateWindowInfo: (windowInfos: WindowInfo[]) => void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();