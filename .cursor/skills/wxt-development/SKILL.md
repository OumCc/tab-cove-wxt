---
name: wxt-development
description: 帮助开发基于 WXT 框架的浏览器插件。熟悉 WXT 的项目结构、入口点、配置 API、模块系统、构建流程和最佳实践。当用户开发浏览器插件、修改 WXT 配置、创建入口点、使用 WXT API 或询问 WXT 相关问题时使用此技能。
---

# WXT 浏览器插件开发

WXT 是一个现代化的浏览器插件开发框架，受 Nuxt 启发，提供出色的开发体验和对所有主流浏览器的支持。

## 核心概念

### 项目结构

WXT 项目遵循约定优于配置的原则：

```
project-root/
├── src/
│   ├── entrypoints/          # 入口点目录（必需）
│   │   ├── background.ts     # Service Worker (MV3) 或 Background Script (MV2)
│   │   ├── content.ts       # Content Script
│   │   ├── popup/            # Popup 页面
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── App.tsx
│   │   ├── options/          # Options 页面
│   │   └── sidepanel/        # Side Panel 页面
│   └── assets/               # 静态资源
├── public/                   # 公共文件（直接复制到输出目录）
├── wxt.config.ts            # WXT 配置文件
└── package.json
```

### 入口点 (Entrypoints)

入口点是浏览器插件的各个功能模块，WXT 会自动识别并构建它们。

#### Background Script

```typescript
// src/entrypoints/background.ts
import { defineBackground } from 'wxt/browser';

export default defineBackground(() => {
  console.log('Background script loaded', { id: browser.runtime.id });
  
  // 监听消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理消息
  });
});
```

#### Content Script

```typescript
// src/entrypoints/content.ts
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  main() {
    console.log('Content script loaded');
    // 操作 DOM
  },
});
```

#### Popup/Options/Sidepanel 页面

这些是 UI 页面，可以使用 React、Vue 等框架：

```typescript
// src/entrypoints/popup/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### 配置文件

`wxt.config.ts` 是 WXT 的核心配置文件：

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  // 源码目录
  srcDir: 'src',
  
  // 入口点目录（相对于 srcDir）
  entrypointsDir: 'entrypoints',
  
  // 公共文件目录
  publicDir: 'public',
  
  // 输出目录
  outDir: '.output',
  
  // WXT 模块
  modules: ['@wxt-dev/module-react'],
  
  // Manifest 配置
  manifest: {
    name: 'My Extension',
    permissions: ['storage', 'tabs'],
  },
  
  // Vite 配置
  vite: (env) => ({
    // 自定义 Vite 配置
  }),
});
```

### 常用配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `srcDir` | 源码目录 | `root` |
| `entrypointsDir` | 入口点目录 | `${srcDir}/entrypoints` |
| `publicDir` | 公共文件目录 | `public` |
| `outDir` | 输出目录 | `.output` |
| `modules` | WXT 模块列表 | `[]` |
| `manifest` | Manifest 配置 | 从 package.json 推断 |
| `browser` | 目标浏览器 | `chrome` |
| `manifestVersion` | Manifest 版本 | `3` |

## 开发命令

```bash
# 开发模式（Chrome）
pnpm dev

# 开发模式（Firefox）
pnpm dev:firefox

# 构建
pnpm build

# 构建并打包为 ZIP
pnpm zip
```

## WXT API

### 浏览器 API

WXT 使用 `browser` 命名空间访问浏览器 API（兼容 Chrome 和 Firefox）：

```typescript
// 存储 API
await browser.storage.local.set({ key: 'value' });
const data = await browser.storage.local.get('key');

// 标签页 API
const tabs = await browser.tabs.query({ active: true, currentWindow: true });

// 消息传递
browser.runtime.sendMessage({ type: 'action' });
```

### 环境变量

WXT 提供内置环境变量：

```typescript
// 浏览器类型
import.meta.env.BROWSER  // 'chrome' | 'firefox' | 'safari' | 'edge'

// Manifest 版本
import.meta.env.MANIFEST_VERSION  // 2 | 3

// 模式
import.meta.env.MODE  // 'development' | 'production'

// 开发模式
import.meta.env.DEV  // boolean
```

### 自动导入

WXT 支持自动导入常用函数：

```typescript
// 无需手动导入
export default defineBackground(() => {
  // defineBackground 已自动导入
});

export default defineContentScript({
  // defineContentScript 已自动导入
});
```

## WXT 模块

WXT 模块扩展框架功能：

- `@wxt-dev/module-react` - React 支持
- `@wxt-dev/module-vue` - Vue 支持
- `@wxt-dev/storage` - 类型安全的存储
- `@wxt-dev/i18n` - 国际化支持

在 `wxt.config.ts` 中配置：

```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
});
```

## 最佳实践

### 1. 类型安全

使用 TypeScript 和 WXT 的类型定义：

```typescript
// 定义消息类型
type Message = 
  | { type: 'GET_DATA' }
  | { type: 'SET_DATA'; data: unknown };

// 类型安全的消息处理
browser.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    // message 已正确类型化
  }
);
```

### 2. 资源导入

使用 `~/` 别名导入项目文件：

```typescript
import logo from '~/assets/logo.png';
import { utils } from '~/utils/helper';
```

### 3. Content Script 隔离

Content Script 运行在隔离环境中，需要通过消息传递与 Background 通信：

```typescript
// Content Script
const response = await browser.runtime.sendMessage({ type: 'GET_DATA' });

// Background
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    sendResponse({ data: 'result' });
  }
});
```

### 4. 多浏览器支持

使用 `browser` API 而不是 `chrome` API，WXT 会自动处理兼容性。

### 5. 开发调试

- 使用 `console.log` 调试（WXT 会保留这些日志）
- 使用浏览器开发者工具检查 Background 和 Content Script
- 使用 `pnpm dev` 启用热重载

## 常见问题

### 如何添加新的入口点？

在 `src/entrypoints/` 目录下创建新文件或目录，WXT 会自动识别。

### 如何配置 Manifest？

在 `wxt.config.ts` 中使用 `manifest` 选项：

```typescript
export default defineConfig({
  manifest: {
    permissions: ['storage', 'tabs'],
    host_permissions: ['*://*.example.com/*'],
  },
});
```

### 如何支持多个浏览器？

WXT 默认支持所有主流浏览器。使用 `browser` API 而不是 `chrome` API 即可。

### 如何自定义构建输出？

使用 `outDirTemplate` 配置输出目录结构：

```typescript
export default defineConfig({
  outDirTemplate: '{{browser}}-mv{{manifestVersion}}',
});
```

## 参考资源

- [WXT 官方文档](https://wxt.dev/guide/introduction.html)
- [WXT API 文档](https://wxt.dev/api/config.html)
- [Chrome 扩展文档](https://developer.chrome.com/docs/extensions/)
- [Firefox 扩展文档](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

## 当前项目信息

本项目使用：
- WXT 版本：`^0.20.6`
- React 模块：`@wxt-dev/module-react`
- 源码目录：`src/`
- 入口点目录：`src/entrypoints/`

在帮助用户开发时，请参考项目的实际配置和结构。