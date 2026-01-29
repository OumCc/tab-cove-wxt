/*
 * @Description: 用户菜单
 *    展示当前账号下创建的用户列表
 */
import { useEffect, useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Stack, ActionIcon, Avatar, Modal, TextInput, Button, } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { nanoid } from 'nanoid';

import { useUserStore, } from '~/store/users';

import styles from './index.module.less';

export default () => {
  const getUsersLoading = useUserStore(state => state.getUsersLoading);
  const addUsersLoading = useUserStore(state => state.addUsersLoading);

  const {
    users,
    curUser,
    setCurUser,
    getUsers,
    addUsers,
  } = useUserStore(useShallow(state => ({
    users: state.users,
    curUser: state.curUser,
    setCurUser: state.setCurUser,
    getUsers: state.getUsers,
    addUsers: state.addUsers,
  })));

  const [opened, { open, close }] = useDisclosure(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <>
      <Stack
        align="center"
        justify="flex-start"
        gap="md"
      >
        {
          users.map((user) => (
            <Avatar
              key={user._id}
              src={user.avatar || undefined}
              color="initials"
              radius="xl"
              name={user.name || ''}
            />
          ))
        }

        <ActionIcon
          variant="subtle"
          size={38}
          radius="xl"
          aria-label="Add User"
          loading={addUsersLoading}
          onClick={() => {
            open();
          }}
        >
          <IconPlus />
        </ActionIcon>
      </Stack>

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
    </>
  );
};
