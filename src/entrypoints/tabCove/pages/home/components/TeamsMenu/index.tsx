/*
 * @Description: 团队菜单
 *    展示当前账号下创建的团队列表
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Stack, ActionIcon, Avatar, Tooltip, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';

import styles from './index.module.less';

export default () => {
  const addTeamsLoading = useTeamsStore(state => state.addTeamsLoading);

  const { setOpenAddTeamsModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddTeamsModal: state.setOpenAddTeamsModal,
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
        teams.map((team) => (
          <Avatar
            key={team._id}
            src={team.avatar || undefined}
            color="initials"
            radius="xl"
            name={team.name || ''}
            onClick={() => {
              setCurTeam(team);
            }}
          />
        ))
      }

      <Tooltip label="新增团队" withArrow position="right">
        <ActionIcon
          variant="subtle"
          size={38}
          radius="xl"
          aria-label="新增团队"
          loading={addTeamsLoading}
          onClick={() => {
            setOpenAddTeamsModal(true);
          }}
        >
          <IconPlus />
        </ActionIcon>
      </Tooltip>
    </Stack>
  );
};
