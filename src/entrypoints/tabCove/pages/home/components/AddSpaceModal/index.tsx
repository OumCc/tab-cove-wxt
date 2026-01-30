/*
 * @Description: 新增空间弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';

export default () => {
  const openAddSpacesModal = useGlobalStore(state => state.openAddSpacesModal);
  const addTeamLoading = useTeamsStore(state => state.addTeamLoading);

  const { setOpenAddSpacesModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddSpacesModal: state.setOpenAddSpacesModal,
  })));
  const { addTeam,} = useTeamsStore(useShallow(state => ({
    addTeam: state.addTeam,
  })));

  const [teamName, setTeamName] = useState('');

  const handleClose = () => {
    setOpenAddSpacesModal(false);
  };

  return (
    <Modal
      opened={openAddSpacesModal}
      onClose={handleClose}
      title="新增空间"
    >
      <Box pos="relative">
        <Stack gap="lg">
          <TextInput
            label="空间名"
            placeholder="请输入空间名"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!teamName) {
                notifications.warning({ message: '请输入空间名' });
                return;
              }

              await addTeam({
                _id: nanoid(),
                name: teamName,
              });
              handleClose();
              notifications.success({ message: '新增空间成功' });
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
