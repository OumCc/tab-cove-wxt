/*
 * @Description: 新增空间弹窗
 */
import { useState, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { Stack, Modal, TextInput, Button, LoadingOverlay, Box, } from '@mantine/core';

import { notifications } from '~/utils/notifications';

import { useGlobalStore, } from '~/store/global';
import { useTeamsStore, } from '~/store/teams';
import { useSpacesStore, } from '~/store/spaces';

export default () => {
  const openAddSpacesModal = useGlobalStore(state => state.openAddSpacesModal);
  const addSpaceLoading = useSpacesStore(state => state.addSpaceLoading);

  const { setOpenAddSpacesModal,} = useGlobalStore(useShallow(state => ({
    setOpenAddSpacesModal: state.setOpenAddSpacesModal,
  })));
  const { curTeam, } = useTeamsStore(useShallow(state => ({
    curTeam: state.curTeam,
  })));
  const { addSpace,} = useSpacesStore(useShallow(state => ({
    addSpace: state.addSpace,
  })));

  const [spaceName, setSpaceName] = useState('');

  const handleClose = () => {
    setOpenAddSpacesModal(false);
  };

  return (
    <Modal
      opened={openAddSpacesModal}
      onClose={handleClose}
      title="新增空间"
    >
      <Box pos="relative">
        <Stack gap="lg">
          <TextInput
            label="空间名"
            placeholder="请输入空间名"
            value={spaceName}
            onChange={(event) => setSpaceName(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!spaceName) {
                notifications.warning({ message: '请输入空间名' });
                return;
              }

              if (!curTeam) {
                notifications.warning({ message: '请先选择团队' });
                return;
              }

              await addSpace({
                _id: nanoid(),
                name: spaceName,
                teamId: curTeam._id,
                visibility: 'private',
              });
              handleClose();
              notifications.success({ message: '新增空间成功' });
            }}
          >
            提交
          </Button>
        </Stack>

        <LoadingOverlay visible={addSpaceLoading} overlayProps={{ blur: 2 }} />
      </Box>
    </Modal>
  );
};
