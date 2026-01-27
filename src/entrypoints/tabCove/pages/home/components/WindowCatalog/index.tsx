/*
 * @Description: 
 */
import { useEffect, } from 'react';
import { Accordion } from '@mantine/core';

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
    <div>
      <Accordion
        variant="separated"
        radius="lg"
        multiple // 关键属性：允许同时展开多个项目
        defaultValue={["item-1", "item-2", "item-3"]} // 关键属性：指定默认展开所有项目
      >
        <Accordion.Item value="item-1">
          <Accordion.Control>第一项标题</Accordion.Control>
          <Accordion.Panel>第一项内容</Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="item-2">
          <Accordion.Control>第二项标题</Accordion.Control>
          <Accordion.Panel>第二项内容</Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="item-3">
          <Accordion.Control>第三项标题</Accordion.Control>
          <Accordion.Panel>第三项内容</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};