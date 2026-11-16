import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

import './styles/index.less';
import { startThemeSync } from './theme/index.ts';

// 在首次渲染前写入主题变量，避免闪烁。
startThemeSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
