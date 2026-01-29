/*
 * @Description: 空间(Space)列表
 */
import { Group, Title, ActionIcon, Tooltip, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import styles from './index.module.less';

export default () => {
  return (
    <div className={styles.box}>
      <Group justify="space-between">
        <Title order={5}>空间</Title>

        <Tooltip label="新增空间" withArrow position="right">
          <ActionIcon
            variant="subtle"
            radius="xl"
            aria-label="新增空间"
          >
            <IconPlus />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};
