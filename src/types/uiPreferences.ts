/** 可备份的本机界面偏好；不包含依赖浏览器会话的状态。 */
import type { LanguagePreference } from '../i18n/core.ts';

/** 用户选择的明暗模式；`system` 跟随操作系统。 */
export type ColorMode = 'light' | 'dark' | 'system';

/** 保存和备份的界面偏好；未知主题由主题注册表降级。 */
export interface UiPreferences { themeId: string; language: LanguagePreference; colorMode: ColorMode; sidebarCollapsed: boolean }
