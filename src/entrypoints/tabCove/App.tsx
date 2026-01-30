import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import Home from './pages/home';

import CreateAccountModal from './components/CreateAccountModal';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

export default function App() {
  return (
    <MantineProvider>
      <Notifications limit={3} />
      <Home />

      <CreateAccountModal />
    </MantineProvider>
  );
}
