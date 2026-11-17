/**
 * 界面偏好（风格、明暗模式、语言、侧栏收起）：属于本机的展示状态，不进入资料库文档。
 * 使用同步的 localStorage，保证首次渲染前即可读取，避免主题闪烁。
 */
import { create } from 'zustand';
import { languagePreference } from '../i18n/core.ts';
import type { UiPreferences } from '../types/uiPreferences.ts';

export type { ColorMode, UiPreferences } from '../types/uiPreferences.ts';

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

function pickPreferences({ themeId, colorMode, sidebarCollapsed, language }: UiPreferences): UiPreferences {
  return { themeId, colorMode, sidebarCollapsed, language };
}

/** 界面偏好的唯一来源；主题同步与组件都订阅它。 */
export const useUiPreferences = create<UiPreferencesState>((set, get) => ({
  ...readStored(),
  systemDark: darkQuery.matches,
  browserLanguages: navigator.languages,
  update(patch) {
    set(patch);
    try { localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(pickPreferences(get()))); } catch { /* 见 update 的降级说明。 */ }
  },
}));

/** 同步读取当前界面偏好用于导出，排除浏览器和会话的派生状态。 */
export function getUiPreferences(): UiPreferences {
  return pickPreferences(useUiPreferences.getState());
}

/** 恢复已校验的偏好；写入异常由调用方处理，且原界面状态保持不变。 */
export function restoreUiPreferences(value: UiPreferences): void {
  const next = pickPreferences(value);
  localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(next));
  useUiPreferences.setState(next);
}

/** 仅在资料库确认写入后恢复偏好；部分成功时只需要重试偏好。 */
export async function importWithUiPreferences(importLibrary: () => Promise<void>, preferences?: UiPreferences): Promise<'success' | 'partial'> {
  await importLibrary();
  if (preferences) {
    try { restoreUiPreferences(preferences); } catch { return 'partial'; }
  }
  return 'success';
}

darkQuery.addEventListener('change', event => useUiPreferences.setState({ systemDark: event.matches }));

window.addEventListener('languagechange', () => useUiPreferences.setState({ browserLanguages: navigator.languages }));
window.addEventListener('storage', event => { if (event.key === UI_PREFERENCES_KEY || event.key === null) useUiPreferences.setState(readStored()); });
