/*
 * @Description: 新增团队弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExclamationCircle } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '@/store/teams';

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
  }

  return (
    <Modal
      opened={openAddTeamsModal}
      onClose={handleClose}
      title="新增团队"
    >
      <Stack gap="lg">
        <TextInput
          label="团队名"
          placeholder="请输入团队名"
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
        />
        <Button
          loading={addTeamsLoading}
          onClick={async () => {
            if (!teamName) {
              notifications.show({
                message: '请输入团队名',
                position: 'top-center',
                icon: <IconExclamationCircle />,
                color: '#faad14'
              })
              return;
            }

            await addTeams({
              _id: nanoid(),
              name: teamName,
            });
            handleClose();
          }}
        >
          提交
        </Button>
      </Stack>
    </Modal>
  );
};
