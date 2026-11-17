# 导入导出技术设计

## 审阅摘要

- 方案：版本化 JSON 备份 + 纯校验/变换 + 后台串行导入 + 独立文件 UI。
- 边界：资料库使用现有异步 `LibraryStorage`；界面偏好仍在 localStorage，导入时单独报告结果。
- 兼容：不改变 `LibraryDocument` v1 与存储键，不把备份 revision 当作目标库版本。
- 验证：纯协议、repository 并发/失败、界面偏好持久化测试，以及类型检查、构建和隔离 UI 验证。
- 风险：两种存储非原子、追加重试可能产生副本、替换预览可能过期；下文定义明确处理。
- 本设计待整体实施批准；无未回答的产品 Blocking 问题。

## 背景、目标与非目标

依据 research 的 Q-001/Q-002 实现两种导入与完整偏好迁移。数据已有稳定实体 ID、递增 revision 与后台唯一写入者。复用这些边界，不把文件上传、下载或 React 状态混入领域逻辑。

本次只接受本产品格式；不接入云端，不预先定义远程 API、认证、实体时间戳、删除墓碑或跨设备冲突合并。未来远程存储仍需服务端条件写入/ETag 等并发保障，不能依靠本地队列实现跨设备同步。

## 备份协议

文件使用 UTF-8 JSON，文件名 `tab-cove-backup-<UTC时间戳>.json`，MIME 为 `application/json`。文档形状：

```ts
interface BackupDocument {
  format: 'tab-cove-backup';
  formatVersion: 1;
  exportedAt: string; // ISO 8601 UTC 时间
  library: LibraryDocument;
  uiPreferences: {
    themeId: string;
    colorMode: 'light' | 'dark' | 'system';
    language: 'en' | 'zh-CN' | 'zh-TW' | 'system';
    sidebarCollapsed: boolean;
  };
}
```

- 外层格式版本与领域 schemaVersion 独立；第一版只接受二者均为 1，未知版本拒绝，不猜测降级。
- `exportedAt` 需为合法规范化 ISO UTC 时间；导入不用于排序或冲突判断。
- 复用 `validateLibrary`，并将通过校验的数据按已知字段重建为纯对象，忽略未使用字段，不透传任意属性。只允许现有 HTTP/HTTPS URL。
- 备份保留实体 ID，保证替换迁移后的身份连续性；`revision` 仅作源端信息。
- `uiPreferences` 四项均必需并验证类型/枚举；未知 `themeId` 允许并按已有主题注册表降级。不导出 `systemDark`、浏览器语言列表、当前选中空间、搜索或拖拽状态。
- 文件读取前检查 11 MiB 上限；消息入口按同一上限校验文本 UTF-8 字节长度，防止绕过 UI。使用紧凑 JSON，为约 10 MiB 的资料库预留备份元数据空间（见 research Q-004）。序列化时也检查该上限，避免生成无法重新导入的文件。输入大小限制不保证追加后容量足够，实际写入失败仍须处理。
- 拒绝原始 storage dump 和第三方文件；允许 UTF-8 BOM。没有旧版正式备份需要兼容。

## 当前与目标流程

现有：UI → `library:mutate` → repository 队列 → 校验/变换 → storage.local。

导出：读取后台最新资料库 → 同步读取当前界面偏好 → 生成并验证规范备份 → Blob 下载 → 释放 object URL。不能拿页面上可能过期的资料库缓存导出。下载动作只表示已发起下载，不声称系统文件保存已经完成。

导入：文件选择 → 大小/读取/JSON/结构校验 → 获取当前库 revision → 预览 → 模式与偏好选择 → 后台重新校验 → 串行重读目标库并变换 → 一次写库 → 刷新工作台 → 如勾选则恢复界面偏好。

## 导入与并发规则

### 追加

- 默认模式；所有导入空间按顺序放在现有空间末尾。
- 为导入空间、集合、卡片生成新的全库唯一 ID，保留现有实体 ID，不按名称或 URL 合并。生成器注入，避免与现有及本次生成 ID 冲突。
- 现有保存/恢复行为偏好保持不变；UI 明确说明。重复导入会再增加一份副本。
- 在队列内重读最新目标，允许预览后发生非覆盖式修改；新 revision = 当前 revision + 1。

### 替换

- 显示覆盖当前资料库的说明、当前与备份的空间/集合/卡片数量；按钮使用明确的“替换资料库”，提示可先导出旧数据。
- 请求必须带预览时的 `expectedRevision`；队列内比较最新 revision，不一致返回 `IMPORT_CONFLICT`，保留文件但要求重新加载预览和确认。
- 使用备份实体和行为偏好，保留备份实体 ID；新 revision = 目标当前 revision + 1，不直接使用源 revision。
- 当前库不存在时，可视作 revision 0 的内存初始状态，导入最终结果前不先落盘初始化。当前库损坏、读取失败或版本未知时拒绝导入，不提供隐式修复覆盖路径。
- 写入前校验结果；revision 溢出安全整数时拒绝写入。

## 界面偏好恢复与结果

- 导出始终包含界面偏好；导入预览提供“恢复界面偏好”，默认勾选，追加和替换均可关闭该选项。
- 先持久化资料库，再恢复界面偏好；资料库失败时不得改动界面偏好。
- 为导入增加可抛出持久化错误的恢复函数：先写 localStorage，成功后才更新 Zustand。普通设置沿用既有会话降级语义。
- 界面偏好失败时保持旧界面偏好，展示“资料库已导入，界面偏好未恢复”，只能重试恢复偏好，不重新执行追加。
- 断线/超时不自动重试有副作用请求；提示先刷新核对资料库。如果结果未知，暂不恢复界面偏好。
- 存储写入引起的现有跨页通知继续生效；导入后已不存在的选中空间按 `createWorkspace` 现有逻辑回退。

## 接口与修改地图

| 区域 | 当前职责 | 计划变更 |
| --- | --- | --- |
| 新 `src/types/backup.ts` | 无 | 备份格式、导入模式与请求类型 |
| 新 `src/services/libraryBackup.ts` | 无 | 纯解析、字段投影、序列化、计数及导入变换；无浏览器或 DOM 依赖 |
| `src/services/libraryRepository.ts` | 唯一串行写入 | 增加 `importBackup`，与 get/mutate 共用队列、写入错误处理 |
| `src/types/core.ts` | 错误码 | 增加 `IMPORT_CONFLICT`，保留已有错误码 |
| `src/types/messaging.ts`、`background/index.ts`、`services/core.ts` | 消息边界 | 新增 `library:import`；输入 `{ text, mode, expectedRevision? }`，返回 `Result<LibraryDocument>`；后台重校验，不信任预览 |
| `src/store/createWorkspace.ts`、`workspace.ts` | confirmed state | 导入复用 pending 与加载流程，失败释放 pending，成功刷新权威快照 |
| `src/store/uiPreferences.ts` | 本机展示状态 | 提取无 DOM 的偏好类型/校验供备份模块使用；增加明确成功/失败的恢复入口 |
| 新 `components/DataTransferDialog.tsx`、`App.tsx` | 弹窗与工作台 | 侧栏数据管理按钮，导出、文件选择、预览、模式、偏好选项、确认及结果 |
| `src/i18n/messages.ts` | 三语文案 | 入口、数量、覆盖提醒、错误和部分成功翻译 |
| `tests/preview/runtime.ts` | 隔离端口 | 支持真实 import 服务，沿用隔离数据 |
| `tests/*`、README | 验证及说明 | 新增数据迁移契约测试及备份使用说明 |

## UI 状态、权限与空数据

状态为 idle → reading → preview → importing → success/partial/error。操作中禁用重复提交，写入中不允许关闭弹窗；文件读取请求代次防止旧选择覆盖新选择。取消、换文件与重新选择同一个文件均能恢复正常流程。失败保留可操作提示。

预览显示文件名、导出时间、两侧数量以及模式说明。空资料库可导出/替换；空备份追加不增加内容，仍允许恢复界面偏好。对未知大小、损坏结构、非支持版本显示不同的可理解提示。所有标题/文件名按 React 文本显示，不执行 HTML。

沿用 Mantine Modal 的焦点管理，文件输入有标签，模式控件可键盘访问，错误/结果提供可访问状态。侧栏折叠时保留图标及可访问名称。不添加 downloads 或网络权限。

## 决策、兼容与回滚

- 整库版本化快照适合现阶段离线迁移；CSV 无法无损保留层级和偏好，因此本次不采用。
- 新增显式导入入口而不是开放普通整库 mutation，保留日常修改的并发不变量。
- 保留双存储，避免为了导入功能迁移所有主题启动读取逻辑；以明确的部分成功结果处理跨存储失败。
- 未来在线适配可复用规范化数据、领域校验和异步接口；格式版本分派提供后续迁移位置，本次不添加空实现的 provider 注册框架。
- 无持久化 schema 迁移，撤回代码后旧版本仍能读取导入的 LibraryDocument v1。替换前建议导出旧备份作为用户回滚路径；本次不增设隐藏备份历史库。

## 测试策略与完成边界

- 纯协议：完整往返、中文/特殊字符、空库、重复网址、排序、组颜色、所有偏好；未知版本、坏 JSON、缺字段、重复 ID、非法 URL、BOM、边界大小和未知字段。
- repository：追加保留当前偏好与 ID，替换保留来源 ID 并重设 revision；输入不可变；并发追加、过期替换、写入失败、失败后队列可用、坏目标不覆盖、非法请求不写入。
- 偏好恢复：资料库失败零偏好写入；偏好失败保持原值且返回部分成功；仅重试偏好不会重复导入。
- UI：三语入口、文件选择与取消、预览计数、默认追加、覆盖确认、重复点击保护、真实 Blob 下载及重新导入、侧栏折叠与键盘操作。
- 使用既有 pnpm 与本地 Node 24.12.0 工具链运行 test/compile/build；不安装依赖。真实 Chrome 下载、扩展消息与跨页事件如无法直接验收，应记录限制，不以隔离预览冒充真实端到端验证。

## 未解决事项

无 Non-blocking 产品问题；待用户批准整体方案后实施。
