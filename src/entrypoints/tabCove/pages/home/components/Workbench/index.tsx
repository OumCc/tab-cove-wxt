/*
 * @Description: 核心工作台
 */
import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@mantine/core';

import Empty from '~/components/Empty';

import { useGlobalStore, } from '~/store/global';
import { useUserStore, } from '~/store/users';

import styles from './index.module.less';

export default () => {
  const { setOpenAddUsersModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddUsersModal: state.setOpenAddUsersModal,
  })));
  const {
    users,
    curUser,
    setCurUser,
    getUsers,
  } = useUserStore(useShallow(state => ({
    users: state.users,
    curUser: state.curUser,
    setCurUser: state.setCurUser,
    getUsers: state.getUsers,
  })));

  const renderEmpty = () => {
    return (
      <Empty description="还没添加用户呢，赶紧添加一个吧~">
        <Button
          onClick={() => {
            setOpenAddUsersModal(true);
          }}
        >
          添加用户
        </Button>
      </Empty>
    );
  }

  return (
    <div className={styles.box}>
      {
        users.length ? null : renderEmpty()
      }
    </div>
  );
};
