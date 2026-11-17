/**
 * 风格注册表：切换菜单按此数组顺序展示。
 * 新增风格只需在 `themes/` 下新建一个导出 `ThemeDefinition` 的文件并追加到 `themes`，无需改动样式表或组件。
 */
import type { ThemeDefinition } from './tokens.ts';
import { graphite } from './themes/graphite.ts';
import { ink } from './themes/ink.ts';
import { mist } from './themes/mist.ts';

/** 全部可选风格；第一项是默认风格。 */
export const themes: readonly ThemeDefinition[] = [graphite, mist, ink];

/** 按持久化的 id 查找风格；id 未知（如风格已被移除）时降级为默认风格。 */
export function findTheme(id: string): ThemeDefinition {
  return themes.find(theme => theme.id === id) || themes[0]!;
}
