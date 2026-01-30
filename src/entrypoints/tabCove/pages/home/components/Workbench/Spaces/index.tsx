/*
 * @Description: 空间(Space)列表
 */
import { useShallow } from 'zustand/react/shallow';
import { Group, Title, ActionIcon, Tooltip, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useSpacesStore, } from '~/store/spaces';

import styles from './index.module.less';

export default () => {
  const { setOpenAddSpacesModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddSpacesModal: state.setOpenAddSpacesModal,
  })));
  const { setCurSpace,} = useSpacesStore(useShallow(state => ({
    setCurSpace: state.setCurSpace,
  })));

  return (
    <div className={styles.box}>
      <Group justify="space-between">
        <Title order={5}>空间</Title>

        <Tooltip label="新增空间" withArrow position="right">
          <ActionIcon
            variant="subtle"
            radius="xl"
            aria-label="新增空间"
            onClick={() => {
              setOpenAddSpacesModal(true);
            }}
          >
            <IconPlus />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};
