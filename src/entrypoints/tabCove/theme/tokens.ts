/** 主题契约：每套风格必须为浅色与暗色各提供一份完整 token，样式表只通过 `--tc-*` 变量消费它们。 */

/** 实际渲染的明暗模式；`system` 在界面偏好层解析为其中之一。 */
export type ResolvedColorMode = 'light' | 'dark';

/**
 * 单个明暗模式下的全部颜色。字段名按 camelCase → kebab-case 映射为 `--tc-*` CSS 变量
 * （如 `textMuted` → `--tc-text-muted`），新增字段后即可直接在样式表中引用。
 */
export interface ThemeTokens {
  /** 左侧 Spaces 栏背景。 */
  sidebar: string;
  /** 中间收藏区背景，也是页面底色。 */
  board: string;
  /** 右侧 Open Tabs 栏背景。 */
  panel: string;
  /** 卡片、输入框等内容承载面。 */
  surface: string;
  /** 弹窗、菜单等浮层。 */
  elevated: string;
  border: string;
  /** 悬停或需要强调的边框。 */
  borderStrong: string;
  /** 正文。 */
  text: string;
  /** 标题与选中项。 */
  textStrong: string;
  /** 次要说明。 */
  textMuted: string;
  /** 占位、计数等最弱文字。 */
  textSubtle: string;
  /** 图标按钮与行的悬停底色。 */
  hover: string;
  /** 当前选中项底色。 */
  selected: string;
  /** 主要操作、焦点环与拖拽落点。 */
  accent: string;
  accentHover: string;
  /** 叠在 accent 上的文字。 */
  onAccent: string;
  /** 品牌标记底色，可与 accent 不同。 */
  brand: string;
  onBrand: string;
  /** 错误提示。 */
  danger: string;
  /** 叠在 Space 色块上的首字母。 */
  onSpace: string;
  /** Space 色块按序循环使用，映射为 `--tc-space-0` … `--tc-space-4`。 */
  spaceColors: readonly [string, string, string, string, string];
}

/** 一套可切换的风格。`id` 会被持久化，发布后不要修改。 */
export interface ThemeDefinition {
  id: string;
  /** 显示在风格切换菜单中的名称。 */
  name: string;
  description: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}
