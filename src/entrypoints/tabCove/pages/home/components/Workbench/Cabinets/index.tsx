/*
 * @Description: 储藏柜(Cabinet)列表
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Group, Title, ActionIcon, Tooltip, LoadingOverlay, Stack, Button, ScrollArea, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useSpacesStore, } from '~/store/spaces';
import { useCabinetsStore, } from '~/store/cabinets';

import styles from './index.module.less';

export default () => {
  const { setOpenAddCabinetModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddCabinetModal: state.setOpenAddCabinetModal,
  })));
  const { curSpace,} = useSpacesStore(useShallow(state => ({
    curSpace: state.curSpace,
  })));
  const getCabinetsLoading = useCabinetsStore(state => state.getCabinetsLoading);
  const { cabinets, getCabinets,} = useCabinetsStore(useShallow(state => ({
    cabinets: state.cabinets,
    getCabinets: state.getCabinets,
  })));

  useEffect(() => {
    if (curSpace?._id) {
      getCabinets(curSpace._id);
    }
  }, [curSpace]);

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
          <Stack
            align="stretch"
            justify="center"
            gap="md"
          >
            {
              cabinets.map((cabinet) => (
                <Button
                  key={cabinet._id}
                  
                >
                  {cabinet.name}
                </Button>
              ))
            }
          </Stack>
        </ScrollArea>
      </div>

      <LoadingOverlay visible={getCabinetsLoading} overlayProps={{ backgroundOpacity: 1}}/>
    </div>
  );
};
