/*
 * @Description: 新增团队弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';

export default () => {
  const openAddTeamsModal = useGlobalStore(state => state.openAddTeamsModal);
  const addTeamLoading = useTeamsStore(state => state.addTeamLoading);

  const { setOpenAddTeamsModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddTeamsModal: state.setOpenAddTeamsModal,
  })));
  const { addTeam,} = useTeamsStore(useShallow(state => ({
    addTeam: state.addTeam,
  })));

  const [teamName, setTeamName] = useState('');

  const handleClose = () => {
    setOpenAddTeamsModal(false);
  };

  return (
    <Modal
      opened={openAddTeamsModal}
      onClose={handleClose}
      title="新增团队"
    >
      <Box pos="relative">
        <Stack gap="lg">
          <TextInput
            label="团队名"
            placeholder="请输入团队名"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!teamName) {
                notifications.warning({ message: '请输入团队名' });
                return;
              }

              await addTeam({
                _id: nanoid(),
                name: teamName,
              });
              handleClose();
              notifications.success({ message: '新增团队成功' });
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
