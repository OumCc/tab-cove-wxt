/*
 * @Description: 储藏柜(Cabinet)列表
 */
import { useShallow } from 'zustand/react/shallow';
import { Group, Title, ActionIcon, Tooltip, LoadingOverlay, Stack, Button, ScrollArea, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';

import styles from './index.module.less';

export default () => {
  const { setOpenAddCabinetModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddCabinetModal: state.setOpenAddCabinetModal,
  })));

  return (
    <div className={styles.box}>
      <div className={styles.box__hd}>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            setOpenAddCabinetModal(true);
          }}
        >
          新增储藏柜
        </Button>
      </div>
      <div className={styles.box__bd}>
        <ScrollArea h="100%">
          <div>111</div>
        </ScrollArea>
      </div>
    </div>
  );
};
