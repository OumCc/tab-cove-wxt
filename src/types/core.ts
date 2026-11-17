/** 本地资料库及跨上下文命令；永久收藏不引用浏览器会话标识。 */
export type GroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';
export interface SavedTab { id: string; title: string; url: string }
export interface Collection { id: string; name: string; tabs: SavedTab[]; groupColor?: GroupColor }
export interface Space { id: string; name: string; collections: Collection[] }
export interface Preferences { saveDisposition: 'ask' | 'keep' | 'close'; restoreMode: 'ask' | 'tabs' | 'group' }
export interface LibraryDocument { schemaVersion: 1; revision: number; spaces: Space[]; preferences: Preferences }
export type LibraryCommand =
  | { type: 'space:create'; name: string }
  | { type: 'space:rename'; id: string; name: string }
  | { type: 'space:delete'; id: string }
  | { type: 'space:move'; id: string; beforeId?: string }
  | { type: 'collection:create'; spaceId: string; name: string; beforeId?: string; groupColor?: GroupColor }
  | { type: 'collection:rename'; id: string; name: string }
  | { type: 'collection:delete'; id: string }
  | { type: 'collection:move'; id: string; spaceId: string; beforeId?: string }
  | { type: 'collection:merge'; id: string; targetId: string }
  | { type: 'tab:edit'; id: string; title: string; url: string }
  | { type: 'tab:delete'; id: string }
  | { type: 'tab:move'; id: string; collectionId: string; beforeId?: string }
  | { type: 'tab:newCollection'; id: string; spaceId: string; name: string; beforeId?: string }
  | { type: 'tabs:save'; target: SaveTarget; tabs: { title: string; url: string }[]; preference?: 'keep' | 'close' }
  | { type: 'preferences'; patch: Partial<Preferences> };
export type SaveTarget =
  | { collectionId: string; beforeId?: string }
  | { spaceId: string; name: string; beforeId?: string; groupColor?: GroupColor };
export type ErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'STORAGE_READ_FAILED' | 'STORAGE_WRITE_FAILED' | 'UNSUPPORTED_SCHEMA' | 'BROWSER_OPERATION_FAILED' | 'IMPORT_CONFLICT';
export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string };
