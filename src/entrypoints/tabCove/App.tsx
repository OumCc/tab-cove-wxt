import { useEffect, } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import Home from './pages/home';

import CreateAccountModal from './components/CreateAccountModal';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

export default function App() {
  const { getUser,} = useUserStore(useShallow(state => ({
    getUser: state.getUser,
  })));

  useEffect(() => {
    getUser();
  }, []);

  return (
    <MantineProvider>
      <Notifications limit={3} />
      <Home />

      <CreateAccountModal />
    </MantineProvider>
  );
}
