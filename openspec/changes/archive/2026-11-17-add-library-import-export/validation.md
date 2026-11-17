# 备份与迁移实施验证

## 审阅摘要

- 验收目标：备份可在离线环境往返；追加保留原数据，替换要求确认并拒绝过期预览；资料库与界面偏好分别报告结果。
- 结果：19 条聚焦测试及 63 条全量测试通过，类型检查、生产构建通过；隔离预览和真实 MV3 的主要流程均已执行。
- 边界：无新增权限、依赖或联网服务，未使用用户日常 Chrome 配置。真实浏览器的配额异常和消息断线由隔离测试覆盖，未在真实扩展里人为触发。
- 残余提示：主 JavaScript chunk 约 568 kB，仍有既有的 500 kB 体积提示。

## 自动测试与构建

2026-11-17，使用 Node `24.12.0` 和已安装的 pnpm `11.22.0`。运行 pnpm scripts 时关闭依赖预校验，未安装依赖或修改 lockfile。

| 命令 | 结果与证据 |
| --- | --- |
| `node --test tests/library-backup.test.mjs tests/workspace-state.test.mjs tests/language-preferences.test.mjs` | 19 / 19；覆盖规范备份往返、UTF-8/BOM、近 10 MiB 资料库往返、无效数据、空库、ID 和顺序、并发、容量失败、断线不重试、偏好单独重试 |
| `pnpm run test` | 63 / 63；同时通过既有工作台、Chrome 适配和三语词条校验 |
| `pnpm run compile`、`pnpm run build` | 通过；生成 `.output/chrome-mv3`，Manifest 权限仍为 `tabs`、`storage`、`tabGroups`、`favicon`，无 host permissions |
| `openspec status --change add-library-import-export`、`openspec validate add-library-import-export --strict` | `research-first` 的 5 个产物均完成，变更通过严格校验 |

## 隔离 UI

使用 `tests/preview/server.mjs`、本机 Chrome for Testing `145.0.7632.6` 的临时上下文与既有 Playwright Core。预览使用 fixture 和本地存储替代扩展端口。

- 实际下载 Blob 文件，确认其全量资料库和界面偏好可被解析；核对 object URL 已释放，用原下载文件重新选择并预览，显示 3 个空间、3 个集合、9 张收藏。
- 默认追加、默认勾选恢复偏好；Esc 取消后两个存储值均不变，焦点回到数据管理入口。同一文件可再次选择，故意延迟旧文件读取不会覆盖新预览；连续触发两次确认只追加一次。
- 坏 JSON 显示错误且无写入。键盘可选替换模式并确认，覆盖提醒说明实时标签不受影响；模拟界面偏好写失败时资料库成功，旧偏好保持不变，仅重试偏好不增加资料库 revision。
- 切换并核对英文、简体、繁体的入口及文件选择，确认侧栏折叠后数据管理仍可通过键盘使用。

## 真实 MV3 扩展

在同版本 Chrome for Testing 的隔离配置加载生产产物，通过扩展页面、后台 service worker 和真实 `chrome.storage.local` 执行，浏览器上下文置为离线：

- 下载实际备份并重新导入；追加保留旧空间 ID，生成副本 ID，第二个工作台页面收到存储事件并刷新。
- 在一个页面打开替换预览，并在第二个页面创建空间；过期确认被拒绝，三个空间仍在。手动刷新预览后须再点一次替换，才恢复备份中的实体 ID、重复网址、组颜色和行为偏好。两个页面同步到新文档，实际打开的标签 ID 不变。
- 重开页面后，主题、明暗、繁体语言和折叠状态仍保留；界面偏好仍存放于 localStorage。
- 未执行用户日常配置下的手工验收、系统文件选择或另存为对话框、真实 Chrome 配额拒绝或停止 service worker 后的断线注入。坏输入、写失败和断线行为以自动测试或隔离 UI 的证据为准。
