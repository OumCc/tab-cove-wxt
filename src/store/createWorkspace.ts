/** 页面状态仅缓存已确认数据；请求代次防止慢响应覆盖新的后台快照。 */
import { create } from 'zustand';

import type { LibraryCommand, LibraryDocument } from '../types/core.ts';
import type { BrowserSnapshot } from '../types/browser.ts';
interface WorkspaceState {
  library?: LibraryDocument; snapshot?: BrowserSnapshot; spaceId?: string;
  libraryError?: string; browserError?: string; pending: boolean;
  selectSpace(id: string): void; loadLibrary(): Promise<void>; loadBrowser(): Promise<void>;
  mutate(command: LibraryCommand): Promise<void>;
}
interface WorkspacePort {
  getLibrary(): Promise<LibraryDocument>;
  getSnapshot(): Promise<BrowserSnapshot>;
  mutateLibrary(command: LibraryCommand): Promise<LibraryDocument>;
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please retry.'; }
/** 资料库与浏览器目录分别加载，单侧失败不抹掉另一侧已确认的数据。 */
export function createWorkspace({ getLibrary, getSnapshot, mutateLibrary }: WorkspacePort) {
  let libraryRequest = 0; let browserRequest = 0;
  return create<WorkspaceState>((set, get) => ({
  pending: false,
  selectSpace: spaceId => set({ spaceId }),
  async loadLibrary() {
    const request = ++libraryRequest;
    try { const library = await getLibrary(); if (request !== libraryRequest) return; const current = get().spaceId; set({ library, libraryError: undefined, spaceId: library.spaces.some(s => s.id === current) ? current : library.spaces[0]?.id }); }
    catch (error) { if (request === libraryRequest) set({ libraryError: message(error) }); }
  },
  async loadBrowser() {
    const request = ++browserRequest;
    try { const snapshot = await getSnapshot(); if (request === browserRequest) set({ snapshot, browserError: undefined }); }
    catch (error) { if (request === browserRequest) set({ browserError: message(error) }); }
  },
  async mutate(command) {
    if (get().pending) throw new Error('Please wait for the current change to finish.');
    set({ pending: true });
    try { await mutateLibrary(command); await get().loadLibrary(); } finally { set({ pending: false }); }
  },
}));
}
