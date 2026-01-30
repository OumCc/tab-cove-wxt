/*
 * @Description: 创建账号弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useUserStore, } from '@/store/user';

export default () => {
  const openCreateAccountModal = useGlobalStore(state => state.openCreateAccountModal);
  const createUserLoading = useUserStore(state => state.createUserLoading);

  const { setOpenCreateAccountModal,} = useGlobalStore(useShallow(state => ({
    setOpenCreateAccountModal: state.setOpenCreateAccountModal,
  })));
  const { createUser,} = useUserStore(useShallow(state => ({
    createUser: state.createUser,
  })));

  const [accountName, setAccountName] = useState('');

  const handleClose = () => {
    setOpenCreateAccountModal(false);
  }

  return (
    <Modal
      opened={openCreateAccountModal}
      onClose={handleClose}
      title="创建账号"
    >
      <Box pos="relative">
        <Stack gap="lg">
          <TextInput
            label="账号名称"
            placeholder="请输入账号名称"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!accountName) {
                notifications.warning({
                  message: '请输入账号名称',
                });
                return;
              }

              await createUser({
                _id: nanoid(),
                name: accountName,
              });
              handleClose();
            }}
          >
            提交
          </Button>
        </Stack>

        <LoadingOverlay visible={createUserLoading} overlayProps={{ blur: 2 }} />
      </Box>
    </Modal>
  );
};
