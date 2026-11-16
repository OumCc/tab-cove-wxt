/** 可取消的编辑、确认与会话弹窗；提交失败保留输入，不把失败当成功关闭。 */
import { useState } from 'react';
import { useI18n, t, errorMessage } from '../../../i18n/index.ts';
import { Alert, Button, Checkbox, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
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
/** 保持／关闭和普通／分组使用同样的明确二选一，不预先执行危险副作用。 */
export function ChoiceDialog({ title, description, left, right, rightDisabled, onChoose, onClose }: { title: string; description: string; left: string; right: string; rightDisabled?: boolean; onChoose(right: boolean, remember: boolean): Promise<void>; onClose(): void }) {
  useI18n();
  const [remember, setRemember] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function choose(right: boolean) { if (busy) return; setBusy(true); setError(''); try { await onChoose(right, remember); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <Modal opened onClose={() => { if (!busy) onClose(); }} title={title} closeButtonProps={{ 'aria-label': t('Close') }} centered radius="lg" size={480} className="choice-modal" closeOnClickOutside={!busy} closeOnEscape={!busy}>
    <Text ta="center" size="sm" mt="lg" mb={32}>{description}</Text>
    <Checkbox label={t('Don’t ask again')} checked={remember} onChange={e => setRemember(e.currentTarget.checked)} disabled={busy} className="remember-choice" />
    {error && <Alert color="red" mt="md" role="alert">{error}</Alert>}
    <Group grow mt={30}><Button variant="outline" disabled={busy} onClick={() => void choose(false)}>{left}</Button><Button loading={busy} disabled={rightDisabled} onClick={() => void choose(true)}>{right}</Button></Group>
  </Modal>;
}
