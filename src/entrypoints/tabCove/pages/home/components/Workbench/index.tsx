/*
 * @Description: 核心工作台
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@mantine/core';

import Empty from '~/components/Empty';
import Deck from './Deck';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '@/store/teams';

import styles from './index.module.less';

export default () => {
  const { setOpenAddTeamsModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddTeamsModal: state.setOpenAddTeamsModal,
  })));
  const {
    teams,
    curTeam,
  } = useTeamsStore(useShallow(state => ({
    teams: state.teams,
    curTeam: state.curTeam,
  })));

  const renderEmpty = () => {
    return (
      <Empty description="还没团队呢，赶紧新建一个吧~">
        <Button
          onClick={() => {
            setOpenAddTeamsModal(true);
          }}
        >
          新建团队
        </Button>
      </Empty>
    );
  }

  return (
    <div className={styles.box}>
      {
        teams.length ? (
          <div className={styles.panel}>
            <Deck />
          </div>
        ) : renderEmpty()
      }
    </div>
  );
};
