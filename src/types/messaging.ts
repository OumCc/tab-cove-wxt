import { defineExtensionMessaging } from '@webext-core/messaging';

import type { WindowInfo } from '~/entrypoints/background/modules/windowCatalog/types';

interface ProtocolMap {
  WC_getInitData: () => Promise<WindowInfo[]>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();