/*
 * @Description: 创建账号弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExclamationMark } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '@/store/teams';

export default () => {
  const openCreateAccountModal = useGlobalStore(state => state.openCreateAccountModal);
  const addTeamsLoading = useTeamsStore(state => state.addTeamsLoading);

  const { setOpenCreateAccountModal,} = useGlobalStore(useShallow(state => ({
    setOpenCreateAccountModal: state.setOpenCreateAccountModal,
  })));
  const { addTeams,} = useTeamsStore(useShallow(state => ({
    addTeams: state.addTeams,
  })));

  const [accountName, setAccountName] = useState('');

  const handleClose = () => {
    setOpenCreateAccountModal(false);
  }

  return (
    <Modal
      opened={openCreateAccountModal}
      onClose={handleClose}
      title="创建账号"
    >
      <Stack gap="lg">
        <TextInput
          label="账号名称"
          placeholder="请输入账号名称"
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
        />
        <Button
          loading={addTeamsLoading}
          onClick={async () => {
            if (!accountName) {
              notifications.show({
                message: '请输入账号名称',
                position: 'top-right',
                icon: <IconExclamationMark />,
                color: '#faad14'
              })
              return;
            }

            await addTeams({
              _id: nanoid(),
              name: accountName,
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
