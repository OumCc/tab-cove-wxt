/**
 * 界面偏好（风格、明暗模式、语言、侧栏收起）：属于本机的展示状态，不进入资料库文档。
 * 使用同步的 localStorage，保证首次渲染前即可读取，避免主题闪烁。
 */
import { create } from 'zustand';
import { languagePreference, type LanguagePreference } from '../i18n/core.ts';

/** 用户选择的明暗模式；`system` 跟随操作系统。 */
export type ColorMode = 'light' | 'dark' | 'system';

/** 会被持久化的界面偏好。`themeId` 不在此处校验，由主题注册表负责降级。 */
export interface UiPreferences { themeId: string; language: LanguagePreference; colorMode: ColorMode; sidebarCollapsed: boolean }

interface UiPreferencesState extends UiPreferences {
  /** 操作系统当前是否为暗色，仅在 `colorMode` 为 `system` 时生效。 */
  systemDark: boolean;
  browserLanguages: readonly string[];
  /** 合并更新并立即持久化；写入失败（如存储被禁用）时仅本次会话生效。 */
  update(patch: Partial<UiPreferences>): void;
}

const UI_PREFERENCES_KEY = 'tabCoveUiPreferences';
const NARROW_WINDOW = 960;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readStored(): UiPreferences {
  let stored: Partial<Record<keyof UiPreferences, unknown>> = {};
  try { const parsed: unknown = JSON.parse(localStorage.getItem(UI_PREFERENCES_KEY) || '{}'); if (parsed && typeof parsed === 'object') stored = parsed; } catch { /* 损坏或不可用的存储按首次使用处理。 */ }
  return {
    language: languagePreference(stored.language),
    themeId: typeof stored.themeId === 'string' ? stored.themeId : '',
    colorMode: stored.colorMode === 'light' || stored.colorMode === 'dark' ? stored.colorMode : 'system',
    sidebarCollapsed: typeof stored.sidebarCollapsed === 'boolean' ? stored.sidebarCollapsed : window.innerWidth <= NARROW_WINDOW,
  };
}

/** 界面偏好的唯一来源；主题同步与组件都订阅它。 */
export const useUiPreferences = create<UiPreferencesState>((set, get) => ({
  ...readStored(),
  systemDark: darkQuery.matches,
  browserLanguages: navigator.languages,
  update(patch) {
    set(patch);
    const { themeId, colorMode, sidebarCollapsed, language } = get();
    try { localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify({ themeId, colorMode, sidebarCollapsed, language } satisfies UiPreferences)); } catch { /* 见 update 的降级说明。 */ }
  },
}));

darkQuery.addEventListener('change', event => useUiPreferences.setState({ systemDark: event.matches }));

window.addEventListener('languagechange', () => useUiPreferences.setState({ browserLanguages: navigator.languages }));
window.addEventListener('storage', event => { if (event.key === UI_PREFERENCES_KEY || event.key === null) useUiPreferences.setState(readStored()); });
