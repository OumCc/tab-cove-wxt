import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import Home from './pages/home';

import CreateAccountModal from './components/CreateAccountModal';

import { useGlobalStore, } from '~/store/global';
import { useUserStore, } from '~/store/user';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

export default function App() {
  const { setOpenCreateAccountModal,} = useGlobalStore(useShallow(state => ({
    setOpenCreateAccountModal: state.setOpenCreateAccountModal,
  })));
  const { getUser,} = useUserStore(useShallow(state => ({
    getUser: state.getUser,
  })));

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const res = await getUser();
    if (!res) {
      setOpenCreateAccountModal(true);
    }
  };

  return (
    <MantineProvider>
      <Notifications limit={3} />
      <Home />

      <CreateAccountModal />
    </MantineProvider>
  );
}
