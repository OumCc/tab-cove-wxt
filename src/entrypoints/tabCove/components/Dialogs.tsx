/** 可取消的编辑、确认与会话弹窗；提交失败保留输入，不把失败当成功关闭。 */
import { useState, type ReactNode } from 'react';
import { useI18n, t, errorMessage } from '../../../i18n/index.ts';
import { Alert, Button, Checkbox, Group, Modal, ScrollArea, Select, Stack, Text, TextInput } from '@mantine/core';
import type { Collection, Preferences, SavedTab } from '../../../types/core.ts';
export interface Field { key: string; label: string; value: string; optional?: boolean; options?: { value: string; label: string }[] }
export interface EditorConfig { key: number; title: string; description?: string; fields: Field[]; confirmLabel?: string; danger?: boolean; onSubmit(values: Record<string, string>): Promise<void> }
/** 通用编辑仅表达字段和提交契约，业务命令由调用方构造。 */
export function EditorDialog({ config, onClose }: { config: EditorConfig; onClose(): void }) {
  useI18n();
  const [values, setValues] = useState(Object.fromEntries(config.fields.map(f => [f.key, f.value])));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal opened onClose={() => { if (!busy) onClose(); }} title={config.title} closeButtonProps={{ 'aria-label': t('Close') }} centered radius="lg" closeOnClickOutside={!busy} closeOnEscape={!busy}>
    <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await config.onSubmit(values); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }}>
      <Stack gap="md">
        {config.description && <Text size="sm" c="dimmed">{config.description}</Text>}
        {config.fields.map((f, i) => f.options ? <Select key={f.key} label={f.label} data={f.options} value={values[f.key]} allowDeselect={false} searchable onChange={v => setValues({ ...values, [f.key]: v || '' })} disabled={busy} required={!f.optional} /> : <TextInput key={f.key} label={f.label} value={values[f.key]} data-autofocus={i === 0 || undefined} onChange={e => setValues({ ...values, [f.key]: e.currentTarget.value })} disabled={busy} required={!f.optional} />)}
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <Group justify="flex-end"><Button variant="default" onClick={onClose} disabled={busy}>{t('Cancel')}</Button><Button type="submit" color={config.danger ? 'red' : undefined} loading={busy}>{config.confirmLabel || t('Save')}</Button></Group>
      </Stack>
    </form>
  </Modal>;
}
interface ChoiceDialogProps {
  title: string; description: string; left: string; right?: string;
  disabled?: boolean; rightDisabled?: boolean; children?: ReactNode;
  onChoose(right: boolean, remember: boolean): Promise<void>; onClose(): void;
}
/** 在确认后提交会话操作。仅在有两个选项时允许记住选择；提交失败时保留弹窗。 */
export function ChoiceDialog({ title, description, left, right, disabled, rightDisabled, children, onChoose, onClose }: ChoiceDialogProps) {
  useI18n();
  const [remember, setRemember] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const hasChoice = right !== undefined;
  async function choose(useRight: boolean) { if (busy || disabled || (useRight && rightDisabled)) return; setBusy(true); setError(''); try { await onChoose(useRight, remember); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <Modal opened onClose={() => { if (!busy) onClose(); }} title={title} closeButtonProps={{ 'aria-label': t('Close') }} centered radius="lg" size={480} className="choice-modal" closeOnClickOutside={!busy} closeOnEscape={!busy}>
    <Text ta="center" size="sm" mt="lg" mb={children ? 'md' : 32} style={children ? { overflowWrap: 'anywhere' } : undefined}>{description}</Text>
    {children && <fieldset className="workspace-fieldset" disabled={busy}>{children}</fieldset>}
    {hasChoice && <Checkbox label={t('Don’t ask again')} checked={remember} onChange={e => setRemember(e.currentTarget.checked)} disabled={busy} className="remember-choice" />}
    {error && <Alert color="red" mt="md" role="alert">{error}</Alert>}
    <Group grow={hasChoice} justify="flex-end" mt={30}>
      {hasChoice ? <Button variant="outline" disabled={busy || disabled} onClick={() => void choose(false)}>{left}</Button> : <Button variant="default" disabled={busy} onClick={onClose}>{t('Cancel')}</Button>}
      <Button loading={busy} disabled={disabled || rightDisabled} onClick={() => void choose(hasChoice)}>{right ?? left}</Button>
    </Group>
  </Modal>;
}

/** 只提交本次勾选的收藏，保留集合顺序；打开方式由偏好或弹窗中的选择决定。 */
export function OpenSelectedTabsDialog({ collection, mode, groupsAvailable, onOpen, onClose }: {
  collection: Collection; mode: Preferences['restoreMode']; groupsAvailable: boolean;
  onOpen(items: SavedTab[], group: boolean, remember: boolean): Promise<void>; onClose(): void;
}) {
  useI18n();
  const [selected, setSelected] = useState(new Set<string>());
  const items = collection.tabs.filter(tab => selected.has(tab.id));
  const ask = mode === 'ask';
  function toggle(id: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }
  return <ChoiceDialog
    title={t('Open selected tabs')}
    description={t('Choose the tabs to open from {name}.', { name: collection.name })}
    left={ask ? t('Open Tabs') : t('Open selected tabs')}
    right={ask ? t('Open as Group') : undefined}
    rightDisabled={ask && !groupsAvailable}
    disabled={!items.length}
    onChoose={(group, remember) => onOpen(items, ask ? group : mode === 'group', remember)}
    onClose={onClose}
  >
    <ScrollArea.Autosize mah="min(45vh, 320px)" mb={ask ? 'lg' : 0} type="auto" offsetScrollbars>
      <Stack gap="sm" p={4} style={{ overflowWrap: 'anywhere' }}>
        {collection.tabs.map((tab, index) => <Checkbox key={tab.id} data-autofocus={index === 0 || undefined}
          checked={selected.has(tab.id)} onChange={() => toggle(tab.id)}
          label={<>
            <Text component="span" display="block" size="sm" fw={500}>{tab.title}</Text>
            <Text component="span" display="block" size="xs" c="dimmed">{tab.url}</Text>
          </>}
        />)}
      </Stack>
    </ScrollArea.Autosize>
  </ChoiceDialog>;
}
