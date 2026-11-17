# 导入导出调研

## 审阅摘要

- [USER] 目标：增加数据导入/导出，支持现阶段离线迁移，为后续在线存储保留扩展空间。
- [USER] 已确认：追加与替换都支持，默认追加；导出包含本机界面偏好。
- [CODE] 资料库已有版本化模型、异步存储接口及后台串行队列；界面偏好独立存于 localStorage。
- 范围：本产品 JSON 备份、导入预览、校验与持久化；本次不实现在线服务。
- Blocking 问题已回答；产品边界已明确，用户于 2026-11-17 明确批准整体方案实施。
- 主要风险：两种存储不能原子提交；替换必须防止覆盖预览之后的修改。

## 输入清单

| ID | 来源 | 格式、日期与位置 | 状态 |
| --- | --- | --- | --- |
| U1 | 用户目标 | 纯文本，2026-11-16：“增加数据的导入/导出功能。方便现阶段离线迁移，同时也为后续做成在线存储数据留足拓展空间” | 完整 |
| U2 | 用户澄清 | 2026-11-16，选择“支持追加和替换，默认追加（推荐）”“同时导出本机界面偏好” | 已确认 |
| C1 | 仓库源码 | TypeScript，当前工作区 `src/`、`tests/` | 已核查 |
| D1 | README、现有 OpenSpec | Markdown，首版范围、本地持久化设计 | 已核查，首版不支持导出已过时 |
| G1 | 工程规则 | 本次用户提供的 AGENTS.md；`openspec/config.yaml` | 已读取 |

## 需求理解

- [USER] 完整备份应可用于离线迁移，并包含界面偏好；支持两种导入方式。
- [INFERENCE] 采用带格式版本的本产品 JSON 备份；导出全部空间、集合、卡片、行为偏好、界面偏好，导入保留原有顺序、文字、网址与组颜色。
- [INFERENCE] 追加是导入副本，不按名称或 URL 合并；替换是完整资料库恢复。具体安全行为见待审阅设计。
- [INFERENCE] 在线扩展保留在纯协议和异步存储边界，不在本次设计远程 API、账号或冲突合并服务。

## 视觉证据

本次无外部原型或必需图片。已检查 `App.tsx` 侧栏底部设置入口及 `Dialogs.tsx` 弹窗约定；新增数据管理入口沿用现有组件和三语文案。

## 当前实现与契约映射

| 证据 | 路径与符号 | 当前行为与影响 |
| --- | --- | --- |
| [CODE] | `src/types/core.ts`：`LibraryDocument` | `schemaVersion: 1`、本地 `revision`、有序 `spaces` 和行为偏好；所有实体 ID 全库唯一 |
| [CODE] | `src/services/libraryModel.ts`：`validateLibrary` | 校验结构、枚举、ID、HTTP/HTTPS URL；未知版本拒绝 |
| [CODE] | `src/services/libraryRepository.ts`：`createLibraryRepository` | `get/mutate` 串行，命令重读最新值；仅不存在时初始化；失败不阻塞后续队列 |
| [CODE] | `src/utils/storage/index.ts`：`libraryStorage` | `chrome.storage.local` 独立键 `tabCoveLibrary`，异步 `get/set` |
| [CODE] | `src/types/messaging.ts`、`src/services/core.ts` | UI → 类型化消息 → 后台 → repository；`Result` 返回错误；断线不自动重试 |
| [CODE] | `src/store/createWorkspace.ts`、`App.tsx` | 页面缓存已确认快照；请求代次防旧响应；存储变化后重新读取 |
| [CODE] | `src/store/uiPreferences.ts`：`useUiPreferences` | 主题、明暗、语言和侧栏写 localStorage；现有普通更新失败仅在会话内生效 |
| [CODE] | `theme/registry.ts`：`findTheme` | 未知主题 ID 降级默认主题 |
| [CODE] | `tests/preview/runtime.ts`、`tests/library.test.mjs` | 已有隔离预览端口及原生 Node 测试，可验证队列、失败、校验与并发 |

## 变更影响

- 新增备份纯解析/序列化模块、导入命令、数据管理弹窗、三语文案和测试。
- 保留 `LibraryDocument` v1 及现有存储键；界面偏好仍独立存储。
- 浏览器保存操作也使用同一个 repository；导入须进入同一队列，不打开或关闭真实标签。
- 既有 UI 偏好更新会吞掉持久化异常，导入恢复必须有可报告失败的专用路径。
- 现有接口仅提供本地串行化；不能把它描述为已支持跨设备并发事务。

## 矛盾与问题

| ID | 分类 | 状态 | 证据、重要性与选项 | 决策 |
| --- | --- | --- | --- | --- |
| Q-001 | Blocking | ANSWERED | U1 未指定导入覆盖语义，影响数据保留；可只追加、只替换或两者兼有，推荐两者兼有且默认追加 | [USER] 支持两者，默认追加 |
| Q-002 | Blocking | ANSWERED | C1 界面偏好与资料库分离，影响备份范围；可仅资料库或包含界面偏好 | [USER] 同时导出本机界面偏好 |
| Q-003 | Documentation defect | DISCOVERED | README 声明“没有导出备份功能”，与 U1 新目标冲突 | 完成实现后更新 README；不改写旧变更历史 |
| Q-004 | Blocking | ANSWERED | 合法的 10,485,730 字节资料库加上备份元数据后可达 10,485,922 字节，旧的 10 MiB 导入上限会中断往返 | [USER] 2026-11-17 同意调整以支持往返；统一采用 11 MiB 上限和紧凑 JSON |

## 决策记录与就绪检查

- Q-001、Q-002：以本次用户回答为准，已完成产品澄清。
- [USER] 2026-11-17 明确要求实现已批准的 `add-library-import-export`，并按 `tasks` 顺序实施与验证。批准涵盖 proposal、specs、design、tasks。
- [INFERENCE] 追加 ID 重建、替换 revision 检查、界面偏好可选择恢复及部分失败语义属于获批方案。
- [x] 输入已完整、格式与来源已保留，代码数据链路已核查。
- [x] 无必需但不可访问的视觉材料。
- [x] 无 OPEN Blocking 问题，重要结论含证据来源。
- [x] 用户明确批准 proposal、specs、design、tasks 后进入实施。
