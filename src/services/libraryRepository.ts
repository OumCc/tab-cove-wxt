/** 后台唯一写入边界；每次命令重读最新文档，失败不会阻塞后续队列。 */
import { AppError, applyCommand, emptyLibrary, validateLibrary } from './libraryModel.ts';
import type { LibraryCommand, LibraryDocument } from '../types/core.ts';
export interface LibraryStorage { get(): Promise<unknown>; set(value: LibraryDocument): Promise<void> }
/** 建立串行资料库接口；undefined 表示未初始化，null 或其他坏值均保留并报错。 */
export function createLibraryRepository(storage: LibraryStorage, id: () => string, initialSpaceName = 'Personal') {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run); queue = next.catch(() => undefined); return next;
  }
  async function write(value: LibraryDocument) {
    try { await storage.set(value); } catch { throw new AppError('STORAGE_WRITE_FAILED', 'Could not save locally. Your open tabs have not been closed.'); }
  }
  async function read(): Promise<LibraryDocument> {
    let value: unknown;
    try { value = await storage.get(); } catch { throw new AppError('STORAGE_READ_FAILED', 'Could not read your local library. Please retry.'); }
    if (value === undefined) { const initial = emptyLibrary(id, initialSpaceName); await write(initial); return initial; }
    validateLibrary(value); return value;
  }
  return {
    get: () => serial(read),
    mutate: (command: LibraryCommand) => serial(async () => { const next = applyCommand(await read(), command, id); await write(next); return next; }),
  };
}
