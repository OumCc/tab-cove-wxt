/** 浏览器会话快照和操作协议；这里的数字 ID 只在当前 Chrome 会话有效。 */
import type { Locale } from '../i18n/core.ts';
import type { GroupColor, SaveTarget } from './core.ts';
export interface LiveTab { id: number; windowId: number; index: number; title: string; url: string; pendingUrl?: string; pinned: boolean; active: boolean; groupId: number }
export interface LiveGroup { id: number; windowId: number; title: string; color: GroupColor; collapsed: boolean }
export interface LiveWindow { id: number; focused: boolean; tabs: LiveTab[]; groups: LiveGroup[] }
export interface BrowserSnapshot { epoch: string; sequence: number; windows: LiveWindow[]; groupsAvailable: boolean }
export interface TabSource { locale?: Locale; windowId: number; groupId?: number; tabId?: number }
export interface SavePreview { tabs: LiveTab[]; name: string; groupColor?: GroupColor }
export interface OpenTarget { windowId: number; groupId?: number; beforeTabId?: number }
export interface OpenItem { id: string; title: string; url: string }
export interface OperationReport { message: string; failures: string[]; retry?: BrowserOperation }
export type BrowserOperation = { locale?: Locale } & (
  | { type: 'focus'; tabId: number }
  | { type: 'close'; tabId: number }
  | { type: 'closeTabs'; windowId: number; groupId?: number }
  | { type: 'move'; tabId: number; target: OpenTarget }
  | { type: 'editGroup'; groupId: number; title?: string; color?: GroupColor; collapsed?: boolean }
  | { type: 'ungroup'; groupId: number }
  | { type: 'save'; preview: SavePreview; target: SaveTarget; disposition: 'keep' | 'close'; remember: boolean }
  | { type: 'open'; items: OpenItem[]; target: OpenTarget; group?: { title: string; color?: GroupColor }; remember?: 'tabs' | 'group'; opened?: Record<string, number>; activate?: boolean });
