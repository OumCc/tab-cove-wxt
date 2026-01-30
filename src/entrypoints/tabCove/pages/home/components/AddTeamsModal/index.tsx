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
  const addTeamsLoading = useTeamsStore(state => state.addTeamsLoading);

  const { setOpenAddTeamsModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddTeamsModal: state.setOpenAddTeamsModal,
  })));
  const { addTeams,} = useTeamsStore(useShallow(state => ({
    addTeams: state.addTeams,
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
                notifications.warning({
                  message: '请输入团队名',
                });
                return;
              }

              await addTeams({
                _id: nanoid(),
                name: teamName,
              });
              handleClose();
              notifications.success({
                message: '新增团队成功',
              });
            }}
          >
            提交
          </Button>
        </Stack>

        <LoadingOverlay visible={addTeamsLoading} overlayProps={{ blur: 2 }} />
      </Box>
    </Modal>
  );
};
