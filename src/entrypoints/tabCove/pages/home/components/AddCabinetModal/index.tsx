/*
 * @Description: 新增存储柜弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';
import { useSpacesStore, } from '~/store/spaces';

export default () => {
  const openAddCabinetModal = useGlobalStore(state => state.openAddCabinetModal);
  const addTeamLoading = useTeamsStore(state => state.addTeamLoading);

  const { setOpenAddCabinetModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddCabinetModal: state.setOpenAddCabinetModal,
  })));
  const { addTeam,} = useTeamsStore(useShallow(state => ({
    addTeam: state.addTeam,
  })));
  const { curSpace,} = useSpacesStore(useShallow(state => ({
    curSpace: state.curSpace,
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

              await addTeam({
                _id: nanoid(),
                name: cabinetName,
              });
              handleClose();
              notifications.success({ message: '新增存储柜成功' });
            }}
          >
            提交
          </Button>
        </Stack>

        <LoadingOverlay visible={addTeamLoading} overlayProps={{ blur: 2 }} />
      </Box>
    </Modal>
  );
};
