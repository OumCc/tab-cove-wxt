/** 规范化离线备份，仅依赖纯资料库模型；文件读取及写库由调用方负责。 */
import type { BackupDocument, ImportMode } from '../types/backup.ts';
import type { LibraryDocument } from '../types/core.ts';
import type { UiPreferences } from '../types/uiPreferences.ts';
import { AppError, validateLibrary } from './libraryModel.ts';

/** 文件读取、消息校验和序列化共用的 UTF-8 字节上限。 */
export const MAX_BACKUP_BYTES = 11 * 1024 * 1024;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function invalidBackup(): never {
  throw new AppError('INVALID_INPUT', 'This file is not a valid Tab Cove backup.');
}
function checkTextSize(text: string): void {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new AppError('INVALID_INPUT', 'The backup exceeds the 11 MiB size limit.');
  }
}
function projectSpaces(spaces: LibraryDocument['spaces'], copyId = (id: string) => id): LibraryDocument['spaces'] {
  return spaces.map(({ id, name, collections }) => ({
    id: copyId(id), name, collections: collections.map(({ id, name, groupColor, tabs }) => ({
      id: copyId(id), name, ...(groupColor === undefined ? {} : { groupColor }), tabs: tabs.map(({ id, title, url }) => ({ id: copyId(id), title, url })),
    })),
  }));
}
function normalizeLibrary(value: unknown): LibraryDocument {
  if (!object(value) || !Number.isSafeInteger(value.schemaVersion)) invalidBackup();
  validateLibrary(value);
  const { schemaVersion, revision, spaces, preferences: { saveDisposition, restoreMode } } = value;
  return { schemaVersion, revision, spaces: projectSpaces(spaces), preferences: { saveDisposition, restoreMode } };
}
function normalizeUiPreferences(value: unknown): UiPreferences {
  if (!object(value)) invalidBackup();
  const { themeId, colorMode, language, sidebarCollapsed } = value;
  if (typeof themeId !== 'string' || typeof sidebarCollapsed !== 'boolean'
    || (colorMode !== 'light' && colorMode !== 'dark' && colorMode !== 'system')
    || (language !== 'en' && language !== 'zh-CN' && language !== 'zh-TW' && language !== 'system')) invalidBackup();
  return { themeId, colorMode, language, sidebarCollapsed };
}
function normalizeBackup(value: unknown): BackupDocument {
  if (!object(value) || value.format !== 'tab-cove-backup' || !Number.isSafeInteger(value.formatVersion)) invalidBackup();
  if (value.formatVersion !== 1) throw new AppError('UNSUPPORTED_SCHEMA', 'This backup version is not supported.');
  const { exportedAt } = value;
  if (typeof exportedAt !== 'string') invalidBackup();
  const date = new Date(exportedAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== exportedAt) invalidBackup();
  return { format: 'tab-cove-backup', formatVersion: 1, exportedAt, library: normalizeLibrary(value.library), uiPreferences: normalizeUiPreferences(value.uiPreferences) };
}

/** 拒绝超限或不符合 v1 契约的文件，只返回可安全使用的已知字段。 */
export function parseBackup(text: string): BackupDocument {
  checkTextSize(text);
  let value: unknown;
  try { value = JSON.parse(text.startsWith('\uFEFF') ? text.slice(1) : text); } catch { invalidBackup(); }
  return normalizeBackup(value);
}

/** 生成同一解析器可读取的紧凑备份；不输出未知字段或超限文件。 */
export function serializeBackup(library: LibraryDocument, uiPreferences: UiPreferences, exportedAt: string): string {
  const text = JSON.stringify(normalizeBackup({ format: 'tab-cove-backup', formatVersion: 1, exportedAt, library, uiPreferences }));
  checkTextSize(text);
  return text;
}

/** 统计整个文档的实体数，包括重名空间和重复网址。 */
export function countLibrary(library: LibraryDocument): { spaces: number; collections: number; tabs: number } {
  let collections = 0; let tabs = 0;
  for (const space of library.spaces) {
    collections += space.collections.length;
    for (const collection of space.collections) tabs += collection.tabs.length;
  }
  return { spaces: library.spaces.length, collections, tabs };
}

function reserveIds(library: LibraryDocument, used: Set<string>): void {
  for (const space of library.spaces) {
    used.add(space.id);
    for (const collection of space.collections) {
      used.add(collection.id);
      for (const tab of collection.tabs) used.add(tab.id);
    }
  }
}

/** 从已校验的目标库和备份构造下一版；无副作用，不使用源 revision。 */
export function applyImport(current: LibraryDocument, source: LibraryDocument, mode: ImportMode, id: () => string): LibraryDocument {
  const revision = current.revision + 1;
  if (!Number.isSafeInteger(revision)) throw new AppError('INVALID_INPUT', 'The library revision limit has been reached.');
  let next: LibraryDocument;
  if (mode === 'replace') next = { ...normalizeLibrary(source), revision };
  else {
    const used = new Set<string>();
    reserveIds(current, used); reserveIds(source, used);
    const freshId = () => {
      for (let attempt = 0; attempt < 128; attempt++) {
        const candidate = id();
        if (typeof candidate === 'string' && candidate && !used.has(candidate)) { used.add(candidate); return candidate; }
      }
      throw new AppError('INVALID_INPUT', 'Could not create unique IDs for the imported items.');
    };
    const existing = structuredClone(current);
    next = { ...existing, revision, spaces: [...existing.spaces, ...projectSpaces(source.spaces, freshId)] };
  }
  validateLibrary(next);
  return next;
}
