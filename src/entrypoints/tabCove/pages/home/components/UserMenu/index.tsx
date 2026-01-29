/*
 * @Description: 用户菜单
 *    展示当前账号下创建的用户列表
 */
import { useShallow } from 'zustand/react/shallow';
import { ActionIcon, Avatar, } from '@mantine/core';
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

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div>
      {
        users.map((user) => (
          <Avatar
            key={user._id}
            src={user.avatar || undefined}
            color="initials"
            radius="xl"
            name={user.name || ''}
          >
            { user.name?.slice(0, 2).toUpperCase() }
          </Avatar>
        ))
      }

      <ActionIcon
        variant="subtle"
        size="lg"
        radius="xl"
        aria-label="Add User"
        loading={addUsersLoading}
        onClick={() => {
          addUsers({
            _id: nanoid(),
            name: 'John Doe',
          });
        }}
      >
        <IconPlus />
      </ActionIcon>
    </div>
  );
};
