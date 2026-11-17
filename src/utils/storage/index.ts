/** 只使用独立的 local 键；旧版本的用户、团队及收藏键保持原值。 */
import { browser } from 'wxt/browser';
import type { LibraryStorage } from '../../services/libraryRepository.ts';
/** 原生 storage.local 不包含 WXT 的区域前缀。 */
export const LIBRARY_KEY = 'tabCoveLibrary';
/** 仅由 background 的 repository 调用写入，读取不设置 fallback。 */
export const libraryStorage: LibraryStorage = {
  async get() { const result = await browser.storage.local.get(LIBRARY_KEY); return result[LIBRARY_KEY]; },
  async set(value) { await browser.storage.local.set({ [LIBRARY_KEY]: value }); },
};
