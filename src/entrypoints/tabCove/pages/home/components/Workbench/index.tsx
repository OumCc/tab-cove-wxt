/*
 * @Description: 核心工作台
 */
import { useShallow } from 'zustand/react/shallow';
import { Button, Title, } from '@mantine/core';

import Empty from '~/components/Empty';
import Spaces from './Spaces';
import Cabinets from './Cabinets';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';

import styles from './index.module.less';

export default () => {
  const { setOpenAddTeamsModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddTeamsModal: state.setOpenAddTeamsModal,
  })));
  const {
    curTeam,
    delTeam,
  } = useTeamsStore(useShallow(state => ({
    teams: state.teams,
    curTeam: state.curTeam,
    delTeam: state.delTeam,
  })));

  const renderPanel = () => {
    return (
      <div className={styles.panel}>
        <div className={styles.panel__left}>
          <Title
            order={3}
            onClick={() => {
              delTeam(curTeam!._id);
            }}
          >
            { curTeam!.name }
          </Title>

          <Spaces />
        </div>

        <div className={styles.panel__right}>
          <Cabinets />
        </div>
      </div>
    );
  }

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
        !!curTeam ? renderPanel() : renderEmpty()
      }
    </div>
  );
};
