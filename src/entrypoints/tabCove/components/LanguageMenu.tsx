/** 语言入口始终可用；选择后立即更新界面并保存到本机偏好。 */
import { Menu } from '@mantine/core';
import { IconCheck, IconLanguage } from '@tabler/icons-react';
import { useUiPreferences } from '../../../store/uiPreferences.ts';
import { useI18n } from '../../../i18n/index.ts';
import type { LanguagePreference } from '../../../i18n/core.ts';

/** 语言名使用各自语言书写，便于在不熟悉的界面中找回设置。 */
export function LanguageMenu() {
  const { t } = useI18n();
  const language = useUiPreferences(state => state.language);
  const update = useUiPreferences(state => state.update);
  const options: { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t('Follow browser') },
    { value: 'en', label: 'English' },
    { value: 'zh-CN', label: '简体中文' },
    { value: 'zh-TW', label: '繁體中文' },
  ];
  return <Menu position="right-end" withinPortal width={220} closeOnItemClick={false}>
    <Menu.Target><button type="button" title={t('Language')}><IconLanguage size={18} /><span className="label">{t('Language')}</span></button></Menu.Target>
    <Menu.Dropdown><Menu.Label>{t('Language')}</Menu.Label>
      {options.map(option => <Menu.Item key={option.value} lang={option.value === 'system' ? undefined : option.value} aria-current={language === option.value || undefined} rightSection={language === option.value ? <IconCheck size={15} /> : undefined} onClick={() => update({ language: option.value })}>{option.label}</Menu.Item>)}
    </Menu.Dropdown>
  </Menu>;
}
