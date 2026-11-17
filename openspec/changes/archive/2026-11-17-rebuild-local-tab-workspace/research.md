# 调研记录

## 审阅摘要

- 调研缘由：[USER] 原项目希望模仿 Toby，现重新确定为 Toby Mini 2.0 的单机标签管理工作台，允许替换不匹配的业务代码和设计。
- 目标：[USER] 沿用现有技术，完成空间、集合、标签、搜索、拖拽、会话保存恢复和 Chrome 原生标签组。
- 已确认边界：[USER] 只做独立工作台入口；不接管 Chrome 新标签页，不做账号、协作、网络服务、侧边栏或 popup，不迁移旧数据。
- 暂缓能力：[USER] 星标、集合颜色设置、Tags、视图切换、卡片备注、去重、主题、导入导出后续再做。原生标签组的名称和颜色属于本轮必要能力。
- 证据限制：官方公开截图已经目视检查；工具禁止读取 `chrome-extension://` 页面。用户已同意以公开资料完成方案，实物对照作为实施验收项，不得提前宣称完成 1:1 验证。
- 就绪状态：Q-001 至 Q-008 已回答，没有未决 Blocking 问题；可以编写方案，实施仍需用户批准。

## 输入清单

检查日期：2026-11-16。网页资料是本次读取的版本，不代表所有 Toby 帮助页都已同步更新至 2.0。

| ID | 来源与位置 | 格式／版本 | 证据用途 |
| --- | --- | --- | --- |
| U1 | 本聊天原始目标及后续问题答复，见下方原始目标和决策记录 | 中文文本，2026-11-16 | [USER] 范围与授权 |
| P1 | [Toby Mini 商店页](https://chromewebstore.google.com/detail/toby-mini/gfdcgfhkelkdmglklfbndgopaihmoeci) | HTML，2.0.0.16，更新于 2026-10-26 | [PRD] Mini 不接管新标签页；产品版本 |
| P2 | [Toby 2.0 公告](https://www.gettoby.com/blog/toby-2-0) | HTML，2026-09-12 | [PRD] 布局、拖拽插入、集合合并、Esc 取消 |
| P3 | [界面与术语](https://help.gettoby.com/support/solutions/articles/66000497719-toby-s-interface-glossary) | HTML，当前帮助页 | [PRD] Space / Collection / Card / Open Tabs |
| P4 | [保存会话](https://help.gettoby.com/support/solutions/articles/66000521580-saving-session) | HTML，当前帮助页 | [PRD] 排除固定标签、保存并关闭／保持打开、追加集合 |
| P5 | [Chrome 原生标签组](https://help.gettoby.com/support/solutions/articles/66000527657-chrome-groups-in-toby) | HTML，当前帮助页 | [PRD] 保存组、恢复组、名称颜色、编辑与取消分组 |
| P6 | [搜索](https://help.gettoby.com/support/solutions/articles/66000520261-search) | HTML，当前帮助页 | [PRD] 分类搜索、快捷键、结果打开行为 |
| P7 | [添加后保持打开](https://help.gettoby.com/support/solutions/articles/66000501075-how-to-keep-tabs-open-after-adding-to-a-collection-)；[卡片打开位置](https://help.gettoby.com/support/solutions/articles/66000499571-how-to-open-toby-tabs-within-the-same-tab-) | HTML，部分仍为旧帮助模板 | [PRD] 保存关闭偏好、默认新标签打开；旧文案不作为像素基准 |
| P8 | [Tags](https://help.gettoby.com/support/solutions/articles/66000526362-tags)、[星标](https://help.gettoby.com/support/solutions/articles/66000526363-starred-collections)、[集合颜色](https://help.gettoby.com/support/solutions/articles/66000533608-using-colour-coding-collections-in-toby)、[导出](https://help.gettoby.com/support/solutions/articles/66000508502-how-to-export-your-collections) | HTML | [PRD] 识别附加功能后由 Q-008 明确暂缓 |
| A1 | [Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)、[tabGroups API](https://developer.chrome.com/docs/extensions/reference/api/tabGroups) | 官方 API 文档 | [API] 实时标签／组标识、权限、浏览器操作与事件 |
| A2 | [Chrome storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)、[favicon](https://developer.chrome.com/docs/extensions/how-to/ui/favicons) | 官方 API 文档 | [API] 本地持久化、异步失败、扩展内图标访问 |
| C1 | `package.json`、`pnpm-lock.yaml`、`.node-version`、`src/`、`wxt.config.ts` | 仓库源码与配置 | [CODE] 当前链路及工具链 |
| G1 | 用户提供的 AGENTS.md 指令 | 本聊天完整文本 | 中文文档、最小变更、依赖安全、审批与提交建议；仓库及父目录未发现其他 AGENTS.md / CLAUDE.md |

### 原始目标

> 原本这个项目，我是想模仿 https://www.gettoby.com/ 这个谷歌插件，自己开发一个类似的插件。但后续没有时间继续深入。
>
> 现阶段，我的想法是：项目中的技术选型可以保留，但里面具体代码、设计，如果跟下文目标相违背，可以弃用。
>
> 接下来，我的目标：
> 1. 模仿 https://chromewebstore.google.com/detail/toby-mini/gfdcgfhkelkdmglklfbndgopaihmoeci ，这个 Toby Mini 谷歌浏览器插件，实现其 Tab 页签的功能（其它功能都不需要实现）
> 2. 对于Tab页签功能，也只实现“单机”模式，不用考虑联网以及跟其他人协作的功能
> 3. 现阶段，可以直接对 Toby Mini 进行 1:1 复刻，后续我再结合你具体的输出结果，进行差异化定制
>
> PS：如果对于具体要实现的功能，有不明白、异议的地方，都可以直接跟我提问。

## 需求理解

### 已确认行为与验收方向

- [USER U1/Q-002] “Tab 页签”指空间 → 集合 → 保存的标签卡片，以及右侧打开的窗口和标签，不只是显示浏览器 tab 列表。
- [USER U1/Q-005] 点击插件图标打开或聚焦独立工作台；Chrome 新标签页保持原用途。
- [USER U1/Q-006] 包含 Chrome 原生标签组，区别于本地收藏集合。
- [USER U1/Q-003] 从全新本地数据开始，不提供旧项目和 Toby 数据迁移。
- [USER U1/Q-007] 方案按公开 2.0 资料制定，真实扩展对照留到实施验收。
- [INFERENCE] 验收应覆盖建立空间和集合 → 保存窗口或组 → 关闭／重新打开 → 整理和搜索 → 重启后保持数据的完整闭环，具体场景见 specs。

### 范围内

- 空间和集合基本管理，标签卡片保存、编辑标题和 URL、移除、打开。
- 三栏工作台、卡片布局、集合折叠、搜索、排序及跨集合拖拽。
- 按窗口展示实时标签，激活／关闭／移动，保存窗口与原生组，恢复普通标签或组。
- 单机存储、必要的操作确认和失败反馈；不把内存状态等同于已保存成功。

### 范围外

按 Q-002/Q-005/Q-008 排除账号、团队权限、协作分享、云同步、AI、Next、To/Links、独立笔记、侧边栏、popup、新标签页替换，以及本轮暂缓的工作台附加能力。首版只验收桌面 Chrome，不承诺 Firefox 兼容或商店发布。

## 视觉证据

| ID | 图片／界面 | 关联模块 | 检查发现 | 状态 |
| --- | --- | --- | --- | --- |
| V1 | [官方 dashboard.webp](https://www.gettoby.com/img/blog/2026-08-toby-2-0/dashboard.webp) | 工作台主界面 | 浅暖灰背景；左侧导航，中间集合卡片区，右侧 Open Tabs；粉色新建按钮；白色圆角卡片、柔和阴影；顶部空间名与计数；集合标题、折叠和悬停工具 | 已下载临时文件并目视检查，1664 × 1024；是官方示例，不是用户实物截图 |
| V2 | Chrome 已打开的 Toby Mini `newtab.html` | 实物对照 | 仅确认存在该页，未读取其内容 | 工具 URL 策略拒绝扩展协议；不能换用其他浏览器表面绕过 |
| V3 | [窗口面板](https://help.gettoby.com/_astro/01-session-panel%402x.MNBUjgXX_2aOcNN.webp) | 窗口保存入口 | This window 标题下显示数量和工具；保存图标位于标签列表上方；实时标签为紧凑白色行 | 已目视检查，290 × 300 |
| V4 | [新会话弹窗](https://help.gettoby.com/_astro/02-session-dialog%402x.CVIv-gOv_2ceOfC.webp) | 保存选择 | 白色圆角弹窗，右上关闭；正文显示日期时间名称；居中 Don't ask again；底部左侧描边保持打开、右侧粉色关闭按钮；没有内嵌名称输入框 | 已目视检查，440 × 278 |
| V5 | [追加集合弹窗](https://help.gettoby.com/_astro/04-session-into-collection-dialog%402x.Dd4YGwYF_Z7GNaS.webp) | 追加保存 | 与 V4 同结构，正文突出目标集合名称；保持和关闭动作布局相同 | 已目视检查，440 × 278 |
| V6 | [原生组面板](https://help.gettoby.com/_astro/02-tab-group-panel%402x.BtNylDbr_19JedH.webp) | 组列表 | 组名带颜色圆点，左侧同色边线；组内独立计数、保存／编辑／取消分组图标；未分组标签显示在组外 | 已目视检查，290 × 358；不等于已检查组编辑弹窗 |
| V7 | [搜索面板](https://help.gettoby.com/_astro/01-search-panel%402x.BenTAntE_ZWudQp.webp) | 分类搜索 | 居中浮层及背景遮罩；上方查询、Clear 和关闭；下方分类与结果数；结果行附图标和归属／数量；集合行区分跳转与打开；底部提示上下导航、Enter 打开、右方向跳转、Tab 筛选 | 已目视检查，728 × 486；本轮按 Q-008 移除 Tags 等范围外分类 |

界面不显示已排除功能的假入口。首版维持参考图的浅色、卡片布局和英文产品文案；保留项目 Tab Cove 名称，Toby 的示例账号、数据和品牌不作为业务数据初始化。

## 当前实现

| 证据 | 路径与符号 | 当前行为 | 影响 |
| --- | --- | --- | --- |
| [CODE] | `package.json` scripts；`.node-version` | WXT、React、TypeScript、Mantine、Zustand、Less；pnpm lockfile；Node 24.12.0 | 保留技术栈和包管理器，不安装依赖来做验证 |
| [CODE] | `background/modules/iconClickOpenTabCove.ts` 默认导出 | 查询 `/tabCove.html`，已存在则激活并聚焦窗口，否则创建 | 可保留入口语义，补快速重复点击验证 |
| [CODE] | `tabCove/App.tsx` 的 `init`；`CreateAccountModal` | 首次强制创建本地账号 | 与单机直接使用冲突，移除账号前置 |
| [CODE] | `types/core.ts` 的 User、Team、Space、Cabinet | 团队、成员、空间权限；Cabinet.urls 直接使用实时 TabInfo | 重建为本地 Space/Collection/SavedTab；持久化 ID 与浏览器 ID 分离 |
| [CODE] | `services/core.ts` 的 `getSpaces/addSpace/getCabinets/addCabinet` | 按用户和团队过滤，分别写多个 storage 项 | 简化数据关系；避免多个页面读改写覆盖 |
| [CODE] | `store/teams.ts`、`store/spaces.ts`、`store/cabinets.ts` | 内存列表和当前选择；无完整跨页面存储订阅 | 替换为本地文档状态与实时浏览器状态 |
| [CODE] | `Workbench/Cabinets/index.tsx` 默认导出；`AddCabinetModal` | 创建空 urls 集合，列表仅显示名称按钮 | 尚未形成标签保存、卡片或拖拽流程 |
| [CODE] | `WindowCatalog/index.tsx`、`getCurrentWindows` | 按窗口展示 HTTP(S) 标签标题，消息请求及广播 | 扩展为真实浏览器操作，保留分层思路 |
| [CODE] | `setupEventListeners.ts` | 创建／删除／移动／激活触发广播；onUpdated 只日志；缺少组事件 | 导航标题和分组变化需要补同步 |
| [CODE] | `keepAlive.ts`、`content.ts`、`wxt.config.ts` | alarms 保活日志、Google 页面示例脚本、旧权限列表 | 随业务重建移除无必要脚本与心跳，不依赖持续后台存活 |

### 已执行检查

- [CODE] 初始 Git 工作区无用户未提交改动。
- [CODE] graphify 源码检测得到 36 个支持文件、约 4,323 词，提示可直接完整阅读；无既有图谱。已直接追踪完整链路，未构建无关图谱；检测生成的临时索引已移除。
- [CODE] 在现有依赖环境运行 `pnpm run compile`，退出码 0；未安装、升级或切换包管理器。

## 契约映射

| 动作 | 当前输入／状态 | 目标契约 | 来源 |
| --- | --- | --- | --- |
| 打开工作台 | action 点击 → `/tabCove.html` | 创建或聚焦页面，不写新标签页覆盖 | [CODE] 入口模块；[USER] Q-005 |
| 管理收藏 | Cabinet.urls: TabInfo[] | 浏览器 ID 不作为收藏主键；本地持久化后反馈成功 | [CODE] 类型；[USER] 单机重启使用；[INFERENCE] 数据设计 |
| 保存窗口 | 当前缺失 | 选择窗口的非固定可保存标签 → 新建或追加集合；选择保持或关闭 | [PRD] P4 |
| 保存原生组 | 当前不读取 groupId | 按组成员顺序保存，保留组名与组颜色 | [PRD] P5；[USER] Q-006 |
| 恢复集合 | 当前缺失 | URL 顺序打开；可建 Chrome 标签组；收藏继续保留 | [PRD] P4/P5；[INFERENCE] 非破坏性实现 |
| 搜索 | 当前缺失 | 本地空间／集合／收藏标签／打开标签；不读取浏览历史 | [PRD] P6；[USER] Q-002/Q-008 |
| 拖拽 | 当前缺失 | 明确落点、跨集合移动、集合合并、间隙新建、Esc 取消；浏览器组拖入拖出 | [PRD] P2/P5 |

## 变更影响

- 核心替换范围：`src/types/core.ts`、`src/services/core.ts`、`src/utils/storage/`、`src/store/`、工作台组件与 background 消息协议。
- 浏览器层：添加 tabGroups 信息及事件；补全导航、跨窗口移动和恢复；Manifest 权限按实际 API 收敛。
- 数据边界：不提供旧数据迁移，也不主动删除旧 storage 键；新键与 schemaVersion 隔离，方便回退旧版本。
- 回归重点：多页面并发修改、后台休眠重启、浏览器标签已关闭／已导航、保存后关闭部分失败、分组失败、窗口关闭、存储不可写、拖拽取消。
- [API A2] storage.local 有容量上限，卸载扩展会清除数据；[USER Q-008] 本轮没有备份功能。设置只说明必要的数据边界，不承诺永久保存或无限容量。

## 矛盾与问题及决策

| ID | 分类／状态 | 缺口及影响 | 用户选择／结论 |
| --- | --- | --- | --- |
| Q-001 | Blocking / ANSWERED | 新旧版差异影响布局、入口、交互 | “以当前 2.0 版为准（推荐），按当前实物核对界面和交互” |
| Q-002 | Blocking / ANSWERED | “Tab 页签”可能仅指实时 tabs | “是，按上述工作台范围复刻（推荐）”；包含空间、集合、保存卡片、右侧窗口、搜索拖拽和会话；排除 Next 等其他产品模块 |
| Q-003 | Blocking / ANSWERED | 现有团队数据模型需要迁移与否 | “没有需要保留的数据，先做全新单机版” |
| Q-004 | Blocking / ANSWERED | 项目未初始化 OpenSpec | “允许初始化并准备方案（推荐）”；用户批准方案后才实施 |
| Q-005 | Blocking / ANSWERED | 新版有侧边栏，与独立工作台范围不同 | “是，只做独立工作台入口（推荐）”；不覆盖新标签页 |
| Q-006 | Blocking / ANSWERED | 收藏集合与 Chrome 原生组是两个模型 | “包含，原生标签组也要复刻” |
| Q-007 | Blocking / ANSWERED | 浏览器工具拒绝读取扩展页，不能实测像素和菜单 | “接受，先完成可审阅方案，实物对照在验收时完成（推荐）” |
| Q-008 | Blocking / ANSWERED | 工作台附加能力显著增加范围 | “先做核心空间/集合/标签、搜索拖拽、会话和原生标签组；上述附加能力后续再做” |

P3 的“接管新标签页”描述面向完整版 Toby；Mini 的 P1 和 Q-005 优先。P7 的旧版偏好文案与 P4 的新版保存对话框不完全一致；首版以 P4 明确的保持／关闭选择为准。原生组颜色属于 Q-006，不被 Q-008 的集合颜色设置延期排除。

## 就绪检查

- [x] 已接收初始目标并记录来源格式和逻辑边界。
- [x] 已检查主视觉图片，其余视觉证据限制有明确记录。
- [x] 已追踪现有入口、UI、状态、服务、存储和浏览器消息链路。
- [x] 重要结论区分用户决定、公开产品行为、API、代码和设计推论。
- [x] Blocking 问题均已回答，用户决定已记录。
- [x] 可以创建 proposal、specs、design、tasks。
- [x] 实物视觉与交互对照完成：用户确认 validation 清单全部符合预期；唯一插件页显示差异已修复并回归通过。
- [x] 用户批准实施：2026-11-16 在实施确认问题中答复“批准，按方案开始实施”。

## 方案验证结果

- 2026-11-16：`fnm exec --using v22.22.1 openspec status --change rebuild-local-tab-workspace` 显示 research-first 的 5 类产物已齐备。这只表示规划文件存在，不表示业务实现或验收完成。
- 2026-11-16：`fnm exec --using v22.22.1 openspec validate rebuild-local-tab-workspace --strict --no-interactive` 通过。
- 三份规范共 21 条 Requirement、41 个 Scenario；全部产物具有审阅摘要，未保留模板占位项。
- 规划完成时仅修改 OpenSpec；用户批准后已开始业务实现。当前实施与验证状态见 `validation.md`，未执行 Git 提交。
- 继续核查已补齐 V3–V7 的公开配图，并将保存弹窗与搜索结果的可见交互细节写入设计；任务 1.2 已完成。这是方案证据补充；实施批准已单独取得，后续用户已完成实物对照，见 validation 的验收记录。

## 用户验收补充

用户确认 `validation.md` 全部测试清单符合预期，并指出 Toby Mini 2.0 右侧不显示任何浏览器插件页面。该反馈作为明确行为基准，目录、计数和会话快照统一排除 `chrome-extension://` 当前及待导航 URL；修复前失败、修复后通过的回归证据见 validation。
