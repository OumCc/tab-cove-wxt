/*
 * @Description: 
 */
import { useEffect, } from 'react';

import { sendMessage, onMessage } from '~/types/messaging';

import styles from './index.module.less';

export default (props: any) => {
  useEffect(() => {
    getWindowInfo();
    const stopListening = onMessage('WC_updateWindowInfo', (message) => {
      console.log('WC_updateWindowInfo message :>> ', message);
    });

    return () => {
      stopListening();
    };
  }, []);

  const getWindowInfo = async () => {
    const res = await sendMessage('WC_getWindowInfo');
    console.log('getWindowInfo res :>> ', res);
  };

  return (
    <div>WindowCatalog</div>
  );
};