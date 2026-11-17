/** 主题入口：把界面偏好解析为具体风格与明暗模式，并保持页面 CSS 变量与之同步。 */
import { useUiPreferences } from '../../../store/uiPreferences.ts';
import { applyTheme } from './applyTheme.ts';
import { findTheme } from './registry.ts';
import type { ResolvedColorMode, ThemeDefinition } from './tokens.ts';

export { toMantineTheme } from './applyTheme.ts';
export { themes } from './registry.ts';
export type { ResolvedColorMode, ThemeDefinition, ThemeTokens } from './tokens.ts';

function resolveMode(colorMode: 'light' | 'dark' | 'system', systemDark: boolean): ResolvedColorMode {
  return colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode;
}

/** 当前生效的风格与明暗模式；偏好或系统明暗变化时触发重渲染。 */
export function useActiveTheme(): { theme: ThemeDefinition; mode: ResolvedColorMode } {
  const themeId = useUiPreferences(state => state.themeId);
  const mode = useUiPreferences(state => resolveMode(state.colorMode, state.systemDark));
  return { theme: findTheme(themeId), mode };
}

/**
 * 立即应用当前主题并在偏好变化时重新应用。需在首次渲染前调用一次。
 * @returns 取消订阅函数。
 */
export function startThemeSync(): () => void {
  const sync = () => { const { themeId, colorMode, systemDark } = useUiPreferences.getState(); applyTheme(findTheme(themeId), resolveMode(colorMode, systemDark)); };
  sync();
  return useUiPreferences.subscribe(sync);
}
