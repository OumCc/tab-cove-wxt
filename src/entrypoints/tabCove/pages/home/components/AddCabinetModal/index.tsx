/*
 * @Description: 新增存储柜弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useSpacesStore, } from '~/store/spaces';
import { useCabinetsStore, } from '~/store/cabinets';

export default () => {
  const openAddCabinetModal = useGlobalStore(state => state.openAddCabinetModal);
  const addCabinetLoading = useCabinetsStore(state => state.addCabinetLoading);

  const { setOpenAddCabinetModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddCabinetModal: state.setOpenAddCabinetModal,
  })));
  const { curSpace,} = useSpacesStore(useShallow(state => ({
    curSpace: state.curSpace,
  })));
  const { addCabinet,} = useCabinetsStore(useShallow(state => ({
    addCabinet: state.addCabinet,
  })));

  const [cabinetName, setCabinetName] = useState('');

  const handleClose = () => {
    setOpenAddCabinetModal(false);
  };

  return (
    <Modal
      opened={openAddCabinetModal}
      onClose={handleClose}
      title="新增存储柜"
    >
      <Box pos="relative">
        <Stack gap="lg">
          <TextInput
            label="存储柜名"
            placeholder="请输入存储柜名"
            value={cabinetName}
            onChange={(event) => setCabinetName(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!cabinetName) {
                notifications.warning({ message: '请输入存储柜名' });
                return;
              }

              if (!curSpace) {
                notifications.warning({ message: '请先选择空间' });
                return;
              }

              await addCabinet({
                _id: nanoid(),
                name: cabinetName,
                spaceId: curSpace._id,
                urls: [],
              });
              handleClose();
              notifications.success({ message: '新增存储柜成功' });
            }}
          >
            提交
          </Button>
        </Stack>

        <LoadingOverlay visible={addCabinetLoading} overlayProps={{ blur: 2 }} />
      </Box>
    </Modal>
  );
};
