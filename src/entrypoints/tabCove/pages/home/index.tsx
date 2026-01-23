import { Button, Popover, Text, Loader, Checkbox, Stack, } from '@mantine/core';

import styles from './index.module.less';

export default function home() {
  return (
    <div className={styles.page}>
      <div className={styles.page__left}></div>
      <div className={styles.page__center}>
        <Stack
          h={300}
          bg="var(--mantine-color-body)"
          align="stretch"
          justify="center"
          gap="md"
        >
          <Button fullWidth>Full width button</Button>

          <Popover width={200} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Button>Toggle popover</Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="xs">This is uncontrolled popover, it is opened when button is clicked</Text>
            </Popover.Dropdown>
          </Popover>

          <Loader color="blue" />

          <Checkbox
            defaultChecked
            label="I agree to sell my privacy"
          />
        </Stack>

        <div className={styles.testRem}></div>
      </div>
      <div className={styles.page__right}></div>
    </div>
  );
}