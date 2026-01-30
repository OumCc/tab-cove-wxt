/*
 * @Description: 窗口目录
 *    展示当前浏览器打开的所有窗口，以及每个窗口包含的所有标签页
 */
import { useEffect, useState, } from 'react';
import { Accordion, ScrollArea, } from '@mantine/core';

import { sendMessage, onMessage } from '~/types/messaging';
import type { WindowInfo } from '~/entrypoints/background/modules/windowCatalog/types';

import styles from './index.module.less';

export default () => {
  const [windowInfo, setWindowInfo] = useState<WindowInfo[]>([]);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  useEffect(() => {
    getWindowInfo();
    const stopListening = onMessage('WC_updateWindowInfo', (message) => {
      console.log('WC_updateWindowInfo message :>> ', message);

      setWindowInfo(message.data);
      setAccordionValue(message.data.map((item: WindowInfo) => `item-${item.id}`));
    });

    return () => {
      stopListening();
    };
  }, []);

  const getWindowInfo = async () => {
    const res = await sendMessage('WC_getWindowInfo');
    console.log('getWindowInfo res :>> ', res);
    setWindowInfo(res);
    setAccordionValue(res.map((item: WindowInfo) => `item-${item.id}`));
  };

  return (
    <ScrollArea h="100%">
      <Accordion
        variant="separated"
        radius="lg"
        multiple // 关键属性：允许同时展开多个项目
        value={accordionValue}
        onChange={setAccordionValue}
      >
        {
          windowInfo.map((item) => (
            <Accordion.Item key={item.id} value={`item-${item.id}`}>
              <Accordion.Control>{item.id}</Accordion.Control>
              {
                item.tabs.map((tab) => (
                  <Accordion.Panel key={tab.id}>{tab.title}</Accordion.Panel>
                ))
              }
              
            </Accordion.Item>
          ))
        }
      </Accordion>
    </ScrollArea>
  );
};