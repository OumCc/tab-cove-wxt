/*
 * @Description: 空间(Space)列表
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Group, Title, ActionIcon, Tooltip, LoadingOverlay, Stack, Button, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useSpacesStore, } from '~/store/spaces';

import styles from './index.module.less';

export default () => {
  const { setOpenAddSpacesModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddSpacesModal: state.setOpenAddSpacesModal,
  })));
  const getSpacesLoading = useSpacesStore(state => state.getSpacesLoading);
  const { spaces, curSpace, setCurSpace, getSpaces,} = useSpacesStore(useShallow(state => ({
    spaces: state.spaces,
    curSpace: state.curSpace,
    setCurSpace: state.setCurSpace,
    getSpaces: state.getSpaces,
  })));

  useEffect(() => {
    getSpaces();
  }, []);

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

      <Stack
        align="stretch"
        justify="center"
        gap="md"
      >
        {
          spaces.map((space) => (
            <Button
              key={space._id}
              variant={space._id === curSpace?._id ? 'filled' : 'default'}
              onClick={() => {
                setCurSpace(space);
              }}
            >
              {space.name}
            </Button>
          ))
        }
      </Stack>

      <LoadingOverlay visible={getSpacesLoading} overlayProps={{ backgroundOpacity: 1}}/>
    </div>
  );
};
