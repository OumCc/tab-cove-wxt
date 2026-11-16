/** 工作台命令客户端；不重试有副作用请求，连接中断时提示重新核对实际结果。 */
import { sendMessage } from '../types/messaging.ts';
import { AppError } from './libraryModel.ts';
import type { Result, LibraryCommand } from '../types/core.ts';
import type { BrowserOperation, TabSource } from '../types/browser.ts';
async function unwrap<T>(pending: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try { result = await pending; } catch { throw new Error('The connection was interrupted. Refresh to check the result before trying again.'); }
  if (!result.ok) throw new AppError(result.code, result.message);
  return result.value;
}
/** 从后台读取经过校验的本地资料库。 */
export const getLibrary = () => unwrap(sendMessage('library:get'));
/** 提交一次本地修改；成功响应才代表已持久化。 */
export const mutateLibrary = (command: LibraryCommand) => unwrap(sendMessage('library:mutate', command));
/** 获取即时浏览器目录；不会使用持久化的旧 tabId。 */
export const getSnapshot = () => unwrap(sendMessage('browser:getSnapshot'));
/** 读取保存前的固定快照，取消确认不会发生副作用。 */
export const getSavePreview = (source: TabSource) => unwrap(sendMessage('browser:previewSave', source));
/** 执行浏览器操作并返回完整或部分成功报告。 */
export const browserOperation = (operation: BrowserOperation) => unwrap(sendMessage('browser:operate', operation));
