/*
 * @Description: 新增用户弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExclamationCircle } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useUserStore, } from '@/store/teams';

export default () => {
  const openAddUsersModal = useGlobalStore(state => state.openAddUsersModal);
  const addUsersLoading = useUserStore(state => state.addUsersLoading);

  const { setOpenAddUsersModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddUsersModal: state.setOpenAddUsersModal,
  })));
  const { addUsers,} = useUserStore(useShallow(state => ({
    addUsers: state.addUsers,
  })));

  const [userName, setUserName] = useState('');

  const handleClose = () => {
    setOpenAddUsersModal(false);
  }

  return (
    <Modal
      opened={openAddUsersModal}
      onClose={handleClose}
      title="新增用户"
    >
      <Stack gap="lg">
        <TextInput
          label="用户名"
          placeholder="请输入用户名"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
        />
        <Button
          loading={addUsersLoading}
          onClick={async () => {
            if (!userName) {
              notifications.show({
                message: '请输入用户名',
                position: 'top-center',
                icon: <IconExclamationCircle />,
                color: '#faad14'
              })
              return;
            }

            await addUsers({
              _id: nanoid(),
              name: userName,
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
