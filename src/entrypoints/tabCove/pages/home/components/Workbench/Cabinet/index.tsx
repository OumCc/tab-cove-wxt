/*
 * @Description: 储藏柜(Cabinet)
 */
import { Group, Title, ActionIcon, Tooltip, LoadingOverlay, Stack, Button, ScrollArea, } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import styles from './index.module.less';

export default () => {
  return (
    <div className={styles.box}>
      <ScrollArea h="100%">
        <div>
          <Button
            leftSection={<IconPlus size={14} />}
          >
            新增储藏柜
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
