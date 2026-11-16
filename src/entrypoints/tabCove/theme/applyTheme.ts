/** 把主题 token 落到运行环境：页面的 `--tc-*` CSS 变量，以及 Mantine 组件的主色。 */
import { colorsTuple, type MantineThemeOverride } from '@mantine/core';
import type { ResolvedColorMode, ThemeDefinition, ThemeTokens } from './tokens.ts';

const FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function cssVariableName(tokenKey: string) { return `--tc-${tokenKey.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`; }

/**
 * 将指定风格与明暗模式写入根元素的内联 CSS 变量，并标记 `data-theme` / `data-color-mode`。
 * 同步执行、可重复调用；应在首次渲染前调用一次以避免闪烁。
 */
export function applyTheme(theme: ThemeDefinition, mode: ResolvedColorMode, root: HTMLElement = document.documentElement) {
  const { spaceColors, ...colors } = theme[mode];
  for (const [key, value] of Object.entries(colors)) root.style.setProperty(cssVariableName(key), value);
  spaceColors.forEach((color, index) => root.style.setProperty(`--tc-space-${index}`, color));
  root.dataset.theme = theme.id;
  root.dataset.colorMode = mode;
  // 让原生滚动条和表单控件跟随明暗模式。
  root.style.colorScheme = mode;
}

/**
 * 生成 Mantine 主题：主色取自 accent，按钮文字由 Mantine 按对比度自动选择黑或白。
 * 弹窗、菜单等表面色不在此处，由样式表把 Mantine 变量桥接到 `--tc-*`。
 */
export function toMantineTheme(tokens: ThemeTokens): MantineThemeOverride {
  return { primaryColor: 'accent', colors: { accent: colorsTuple(tokens.accent) }, autoContrast: true, fontFamily: FONT_FAMILY, defaultRadius: 'md' };
}
