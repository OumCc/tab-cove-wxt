import { onMessage } from '~/types/messaging';

import getCurrentWindows from './getCurrentWindows';

export default () => {
  onMessage('WC_getWindowInfo', async () => {
    return await getCurrentWindows();
  });
};