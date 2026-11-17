/** 后台唯一写入边界；每次命令重读最新文档，失败不会阻塞后续队列。 */
import { AppError, applyCommand, emptyLibrary, validateLibrary } from './libraryModel.ts';
import { applyImport, parseBackup } from './libraryBackup.ts';
import type { ImportBackupRequest } from '../types/backup.ts';
import type { LibraryCommand, LibraryDocument } from '../types/core.ts';

/** 异步存储端口；写入成功才发布下一版资料库。 */
export interface LibraryStorage { get(): Promise<unknown>; set(value: LibraryDocument): Promise<void> }
/** 建立串行资料库接口；undefined 表示未初始化，null 或其他坏值均保留并报错。 */
export function createLibraryRepository(storage: LibraryStorage, id: () => string, initialSpaceName = 'Personal') {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run); queue = next.catch(() => undefined); return next;
  }
  async function write(value: LibraryDocument, errorMessage = 'Could not save locally. Your open tabs have not been closed.') {
    try { await storage.set(value); } catch { throw new AppError('STORAGE_WRITE_FAILED', errorMessage); }
  }
  async function read(initialize = true): Promise<LibraryDocument> {
    let value: unknown;
    try { value = await storage.get(); } catch { throw new AppError('STORAGE_READ_FAILED', 'Could not read your local library. Please retry.'); }
    if (value === undefined) { const initial = emptyLibrary(id, initialSpaceName); if (initialize) await write(initial); return initial; }
    validateLibrary(value); return value;
  }
  return {
    get: (options?: { readOnly?: boolean }) => serial(() => read(!options?.readOnly)),
    mutate: (command: LibraryCommand) => serial(async () => { const next = applyCommand(await read(), command, id); await write(next); return next; }),
    importBackup: (request: ImportBackupRequest) => serial(async () => {
      if (!request || typeof request.text !== 'string' || (request.mode !== 'append' && request.mode !== 'replace')
        || (request.mode === 'replace' && (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0))) {
        throw new AppError('INVALID_INPUT', 'The import request is invalid. Choose the backup file again.');
      }
      const backup = parseBackup(request.text);
      const current = await read(false);
      if (request.mode === 'replace' && current.revision !== request.expectedRevision) {
        throw new AppError('IMPORT_CONFLICT', 'The library changed after this preview. Refresh the preview and confirm again.');
      }
      const next = applyImport(current, backup.library, request.mode, id);
      await write(next, 'Could not save the imported library. Check available storage and try again.');
      return next;
    }),
  };
}
