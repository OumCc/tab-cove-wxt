/*
 * @Description: 储藏柜(Cabinet)
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
      <ScrollArea h="100%">
        <div>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setOpenAddCabinetModal(true);
            }}
          >
            新增储藏柜
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
