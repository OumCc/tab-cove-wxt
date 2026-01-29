/*
 * @Description: 新增用户弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExclamationCircle } from '@tabler/icons-react';

import { useUserStore, } from '~/store/users';

export default () => {
  const addUsersLoading = useUserStore(state => state.addUsersLoading);

  const {
    addUsers,
  } = useUserStore(useShallow(state => ({
    addUsers: state.addUsers,
  })));

  const [userName, setUserName] = useState('');

  return (
    <Modal
      opened={opened}
      onClose={close}
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
            close();
          }}
        >
          提交
        </Button>
      </Stack>
    </Modal>
  );
};
