/** 离线备份与导入请求协议，独立于文件、持久化和扩展消息实现。 */
import type { LibraryDocument } from './core.ts';
import type { UiPreferences } from './uiPreferences.ts';

/** v1 备份保留源资料库的身份和 revision，但不以其决定目标库的 revision。 */
export interface BackupDocument {
  format: 'tab-cove-backup';
  formatVersion: 1;
  exportedAt: string;
  library: LibraryDocument;
  uiPreferences: UiPreferences;
}

/** 追加复制备份空间；替换恢复备份的实体及行为偏好。 */
export type ImportMode = 'append' | 'replace';

/** 确认预览时提交备份原文；替换必须携带预览时的目标 revision。 */
export type ImportBackupRequest = { text: string } & (
  | { mode: 'append'; expectedRevision?: never }
  | { mode: 'replace'; expectedRevision: number }
);
