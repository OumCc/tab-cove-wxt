/** UI 与 background 的类型化消息协议，所有失败显式返回而不伪装为空数据。 */
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { LibraryCommand, LibraryDocument, Result } from './core.ts';
import type { BrowserOperation, BrowserSnapshot, OperationReport, SavePreview, TabSource } from './browser.ts';
interface ProtocolMap {
  'library:get': () => Result<LibraryDocument>;
  'library:mutate': (command: LibraryCommand) => Result<LibraryDocument>;
  'browser:getSnapshot': () => Result<BrowserSnapshot>;
  'browser:previewSave': (source: TabSource) => Result<SavePreview>;
  'browser:operate': (operation: BrowserOperation) => Result<OperationReport>;
  'browser:changed': (version: { epoch: string; sequence: number }) => void;
}
/** 所有业务调用统一通过此协议；调用方必须处理返回的失败分支。 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
