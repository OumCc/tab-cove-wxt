/** 工作台的数据管理弹窗；文件操作留在页面，资料库读写从后台获取权威结果。 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Divider, FileButton, Group, Modal, Radio, Stack, Text } from '@mantine/core';
import { useI18n, errorMessage } from '../../../i18n/index.ts';
import { getLibrary } from '../../../services/core.ts';
import { countLibrary, MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '../../../services/libraryBackup.ts';
import { AppError } from '../../../services/libraryModel.ts';
import { getUiPreferences, importWithUiPreferences, restoreUiPreferences } from '../../../store/uiPreferences.ts';
import { useWorkspace } from '../../../store/workspace.ts';
import type { BackupDocument, ImportMode } from '../../../types/backup.ts';
import type { UiPreferences } from '../../../types/uiPreferences.ts';

interface Selection { name: string; text: string; backup: BackupDocument }
interface Preview {
  selection: Selection;
  revision: number;
  current: ReturnType<typeof countLibrary>;
  incoming: ReturnType<typeof countLibrary>;
  request: number;
}
type ImportFlow =
  | { step: 'idle' | 'reading' | 'importing' | 'unknown' }
  | { step: 'success'; preferencesRestored: boolean }
  | { step: 'error'; error: unknown }
  | { step: 'preview'; preview: Preview; issue?: { error: unknown; stale: boolean } }
  | { step: 'partial'; preferences: UiPreferences };

async function readSelection(file: File): Promise<Selection> {
  if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error('Could not determine the backup file size.');
  if (file.size > MAX_BACKUP_BYTES) throw new Error('The backup exceeds the 11 MiB size limit.');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer()); }
  catch { throw new Error('Could not read the backup as a UTF-8 file.'); }
  return { name: file.name, text, backup: parseBackup(text) };
}

function download(text: string, exportedAt: string) {
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  anchor.href = url;
  anchor.download = `tab-cove-backup-${exportedAt.replaceAll(':', '-')}.json`;
  try { document.body.append(anchor); anchor.click(); }
  finally {
    anchor.remove();
    // 给浏览器留出解析下载链接的时间，再释放对象 URL。
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** 导出最新快照，或显示只读预览并在用户确认后执行一次导入。 */
export function DataTransferDialog({ onClose }: { onClose(): void }) {
  const { locale, t } = useI18n();
  const exportLock = useRef(false);
  const importLock = useRef(false);
  const readRequest = useRef(0);
  const resetFile = useRef<() => void>(null);
  const nextAction = useRef<HTMLButtonElement>(null);
  const pending = useWorkspace(s => s.pending);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<Error>();
  const [flow, setFlow] = useState<ImportFlow>({ step: 'idle' });
  const [mode, setMode] = useState<ImportMode>('append');
  const [restore, setRestore] = useState(true);
  const busy = exporting || flow.step === 'importing';
  const finished = flow.step === 'success' || flow.step === 'partial' || flow.step === 'unknown';
  const stale = flow.step === 'preview' && flow.issue?.stale;
  useEffect(() => () => { readRequest.current++; }, []);
  useEffect(() => { nextAction.current?.focus(); }, [flow.step, stale]);

  function close() {
    if (exportLock.current || importLock.current) return;
    readRequest.current++;
    onClose();
  }

  async function exportBackup() {
    if (exportLock.current || importLock.current) return;
    exportLock.current = true; setExporting(true); setExported(false); setExportError(undefined);
    try {
      const library = await getLibrary({ readOnly: true });
      const preferences = getUiPreferences();
      const exportedAt = new Date().toISOString();
      download(serializeBackup(library, preferences, exportedAt), exportedAt);
      setExported(true);
    } catch (error) { setExportError(error instanceof Error ? error : new Error()); }
    finally { exportLock.current = false; setExporting(false); }
  }

  async function loadPreview(select: () => Promise<Selection>, previous?: Preview) {
    const request = ++readRequest.current;
    setFlow({ step: 'reading' });
    try {
      const selection = await select();
      if (request !== readRequest.current) return;
      const library = await getLibrary({ readOnly: true });
      if (request !== readRequest.current) return;
      setFlow({ step: 'preview', preview: {
        selection, request, revision: library.revision, current: countLibrary(library), incoming: countLibrary(selection.backup.library),
      } });
    } catch (error) {
      if (request !== readRequest.current) return;
      setFlow(previous ? { step: 'preview', preview: previous, issue: { error, stale: true } } : { step: 'error', error });
    }
  }

  function chooseFile(file: File | null) {
    resetFile.current?.();
    if (!file || finished || importLock.current || exportLock.current) return;
    setMode('append'); setRestore(true);
    void loadPreview(() => readSelection(file));
  }

  async function confirmImport() {
    if (flow.step !== 'preview' || flow.issue?.stale || flow.preview.request !== readRequest.current
      || exportLock.current || importLock.current || useWorkspace.getState().pending) return;
    const { preview } = flow;
    const { text, backup } = preview.selection;
    const preferences = restore ? backup.uiPreferences : undefined;
    importLock.current = true; setFlow({ step: 'importing' });
    try {
      const result = await importWithUiPreferences(() => useWorkspace.getState().importBackup(mode === 'replace'
        ? { text, mode, expectedRevision: preview.revision } : { text, mode }), preferences);
      setFlow(result === 'partial' && preferences ? { step: 'partial', preferences } : { step: 'success', preferencesRestored: !!preferences });
    } catch (error) {
      if (error instanceof AppError && error.code !== 'BROWSER_OPERATION_FAILED') {
        setFlow({ step: 'preview', preview, issue: { error, stale: error.code === 'IMPORT_CONFLICT' } });
      } else setFlow({ step: 'unknown' });
    } finally { importLock.current = false; }
  }

  function retryPreferences() {
    if (flow.step !== 'partial') return;
    try { restoreUiPreferences(flow.preferences); setFlow({ step: 'success', preferencesRestored: true }); }
    catch { /* 保留部分成功结果，便于继续重试偏好。 */ }
  }

  return <Modal opened onClose={close} title={t('Data management')} closeButtonProps={{ 'aria-label': t('Close'), disabled: busy }} centered radius="lg" closeOnClickOutside={!busy} closeOnEscape={!busy}>
    <Stack gap="md">
      <div>
        <Text size="sm" mb="xs">{t('Download a JSON backup of your library and preferences.')}</Text>
        <Button variant="default" loading={exporting} disabled={flow.step === 'importing'} onClick={() => void exportBackup()}>{t('Download backup')}</Button>
        {exported && <Text size="sm" mt="xs" role="status">{t('Backup download started.')}</Text>}
        {exportError && <Alert mt="xs" color="red" role="alert">{errorMessage(exportError)}</Alert>}
      </div>
      <Divider />
      {!finished && flow.step !== 'importing' && <FileButton accept=".json,application/json" disabled={busy} onChange={chooseFile} resetRef={resetFile} inputProps={{ 'aria-label': t('Choose backup file') }}>
        {props => <Button {...props} data-autofocus variant="default" disabled={busy} style={{ alignSelf: 'start' }}>{t('Choose backup file')}</Button>}
      </FileButton>}
      {flow.step === 'reading' && <Text role="status" size="sm">{t('Preparing backup preview…')}</Text>}
      {flow.step === 'importing' && <Text role="status" size="sm">{t('Importing backup…')}</Text>}
      {flow.step === 'error' && <Alert color="red" role="alert">{errorMessage(flow.error)}</Alert>}
      {flow.step === 'preview' && <>
        <Stack gap={4}>
          <Text fw={600} size="sm" style={{ overflowWrap: 'anywhere' }}>{flow.preview.selection.name}</Text>
          <Text size="sm" c="dimmed">{t('Exported {date}', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(flow.preview.selection.backup.exportedAt)) })}</Text>
          <Text size="sm">{t('Current library — Spaces: {spaces} · Collections: {collections} · Saved tabs: {tabs}', flow.preview.current)}</Text>
          <Text size="sm">{t('Backup — Spaces: {spaces} · Collections: {collections} · Saved tabs: {tabs}', flow.preview.incoming)}</Text>
        </Stack>
        <Radio.Group label={t('Import mode')} value={mode} onChange={value => setMode(value === 'replace' ? 'replace' : 'append')}>
          <Group mt="xs">
            <Radio value="append" label={t('Append a copy')} disabled={busy || flow.issue?.stale} />
            <Radio value="replace" label={t('Replace library')} disabled={busy || flow.issue?.stale} />
          </Group>
        </Radio.Group>
        {mode === 'replace'
          ? <Alert color="orange" role="status">{t('This replaces all saved content and saving and opening preferences. Open browser tabs stay as they are. Download a backup of your current library first if you want to keep it.')}</Alert>
          : <Text size="sm">{t('Adds a copy of every space. Your existing content and saving and opening preferences stay as they are.')}</Text>}
        <Checkbox checked={restore} onChange={event => setRestore(event.currentTarget.checked)} disabled={busy || flow.issue?.stale} label={t('Restore appearance, language and sidebar preferences')} />
        {flow.issue && <Alert color="red" role="alert">{errorMessage(flow.issue.error)}</Alert>}
      </>}
      {flow.step === 'success' && <Alert color="green" role="status">{t(flow.preferencesRestored ? 'Library imported and interface preferences restored.' : 'Library imported.')}</Alert>}
      {flow.step === 'partial' && <Alert color="orange" role="alert">{t('Library imported, but interface preferences were not restored. Retry restoring preferences without importing the library again.')}</Alert>}
      {flow.step === 'unknown' && <Alert color="orange" role="alert">{t('The import result is unknown. Refresh and review your library before trying again. Interface preferences were not restored.')}</Alert>}
      <Group justify="flex-end">
        <Button ref={flow.step === 'success' ? nextAction : undefined} variant="default" onClick={close} disabled={busy}>{t(finished ? 'Done' : 'Cancel')}</Button>
        {flow.step === 'preview' && (flow.issue?.stale
          ? <Button ref={nextAction} disabled={busy} onClick={() => void loadPreview(async () => flow.preview.selection, flow.preview)}>{t('Refresh preview')}</Button>
          : <Button color={mode === 'replace' ? 'red' : undefined} disabled={busy || pending} onClick={() => void confirmImport()}>{t(mode === 'replace' ? 'Replace library' : 'Append backup')}</Button>)}
        {flow.step === 'partial' && <Button ref={nextAction} disabled={busy} onClick={retryPreferences}>{t('Retry preferences')}</Button>}
        {flow.step === 'unknown' && <Button ref={nextAction} disabled={busy} onClick={() => { void useWorkspace.getState().loadLibrary(); close(); }}>{t('Refresh library')}</Button>}
      </Group>
    </Stack>
  </Modal>;
}
