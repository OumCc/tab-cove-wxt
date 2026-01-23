import { MantineProvider } from '@mantine/core';

import Home from './pages/home';

import '@mantine/core/styles.css';

export default function App() {
  return (
    <MantineProvider>
      <Home />
    </MantineProvider>
  );
}
