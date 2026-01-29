/*
 * @Description: 核心工作台
 */
import { Button } from '@mantine/core';

import Empty from '~/components/Empty';

import styles from './index.module.less';

export default () => {
  return (
    <div className={styles.box}>
      <Empty description="还没添加用户呢，赶紧添加一个吧~">
        <Button>
          添加用户
        </Button>
      </Empty>
    </div>
  );
};
