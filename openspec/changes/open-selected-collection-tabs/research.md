# 集合按需打开调研

## 审阅摘要

- [USER] 集合的「打开」目前会打开全部标签页；希望新增入口，先选择本次要打开的标签页。
- [CODE] 当前普通打开和分组恢复共用接受条目数组的命令，选择功能可以留在工作台，无需修改后台协议或资料库。
- 验收：只打开勾选的收藏，原入口仍打开整组收藏；取消及未选中时不发起操作。没有待确认的范围分歧。

## 输入清单

| 来源 | 格式 | 位置 |
| --- | --- | --- |
| [USER] 朋友的使用反馈 | 2026-11-17 聊天中的纯文本 | 希望增加多一个“打开所选标签页”的按钮，点击后，选择希望本次打开的标签页，再打开，避免每次都是打开所有标签页。 |
| [CODE] 现行规范与代码 | Markdown、TypeScript | `openspec/specs/browser-tab-operations/spec.md` 的「打开和恢复收藏」，以及下表所列代码 |

未提供独立设计或 API 文档；按现有集合工具栏和 Mantine 弹窗样式实现。

## 当前行为与契约

| 证据 | 行为 |
| --- | --- |
| [CODE] `src/entrypoints/tabCove/components/Board.tsx` 的 `Board` | 集合工具栏调用 `actions.open(c)`，空集合禁用该入口。 |
| [CODE] `src/entrypoints/tabCove/App.tsx` 的 `openCollection`、`searchOpen` | 工具栏及搜索默认动作把 `collection.tabs` 交给 `perform`；打开方式遵循 `restoreMode`。 |
| [CODE] `src/entrypoints/background/modules/tabOperations/service.ts` 的 `operate` | `open` 只按 `items` 中的顺序创建标签。分组和失败重试均使用该批条目；除了显式记住偏好，不写入资料库。 |

## 决策与就绪

- [USER] 新增独立的选择入口，勾选后由用户发起打开；保留打开全部的现有入口。
- [INFERENCE] 选择初始为空，按收藏条目 ID 区分重复网址；沿用现有打开偏好，把方式选择放在同一个弹窗，以免再次确认。细节属于现有流程的局部界面设计。
- 无冲突或待澄清的产品决策。以隔离预览验证打开数量、顺序、分组、取消及打开全部的回归。
