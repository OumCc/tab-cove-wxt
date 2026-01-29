/*
 * @Description: 用户菜单
 *    展示当前账号下创建的用户列表
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Stack, ActionIcon, Avatar, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '@/store/teams';

import styles from './index.module.less';

export default () => {
  const getTeamsLoading = useTeamsStore(state => state.getTeamsLoading);
  const addTeamsLoading = useTeamsStore(state => state.addTeamsLoading);

  const { setOpenAddUsersModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddUsersModal: state.setOpenAddUsersModal,
  })));
  const {
    teams,
    curTeam,
    setCurTeam,
    getTeams,
  } = useTeamsStore(useShallow(state => ({
    teams: state.teams,
    curTeam: state.curTeam,
    setCurTeam: state.setCurTeam,
    getTeams: state.getTeams,
  })));

  useEffect(() => {
    getTeams();
  }, []);

  return (
    <Stack
      align="center"
      justify="flex-start"
      gap="md"
    >
      {
        teams.map((user) => (
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
        loading={addTeamsLoading}
        onClick={() => {
          setOpenAddUsersModal(true);
        }}
      >
        <IconPlus />
      </ActionIcon>
    </Stack>
  );
};
