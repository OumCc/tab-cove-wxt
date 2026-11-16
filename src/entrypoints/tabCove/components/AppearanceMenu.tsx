/** 外观菜单：切换风格与明暗模式；选项来自主题注册表，点击后立即生效并持久化。 */
import { Menu } from '@mantine/core';
import { IconCheck, IconDeviceDesktop, IconMoon, IconPalette, IconSun } from '@tabler/icons-react';
import { useUiPreferences, type ColorMode } from '../../../store/uiPreferences.ts';
import { themes, useActiveTheme } from '../theme/index.ts';

const modes: { value: ColorMode; label: string; icon: typeof IconSun }[] = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'system', label: 'System', icon: IconDeviceDesktop },
];

/** 侧栏底部的外观入口；菜单在选择后保持打开，便于连续对比多套风格。 */
export function AppearanceMenu() {
  const { theme: active, mode } = useActiveTheme();
  const colorMode = useUiPreferences(state => state.colorMode);
  const update = useUiPreferences(state => state.update);
  const check = <IconCheck size={15} />;
  return <Menu position="right-end" withinPortal closeOnItemClick={false} width={248}>
    <Menu.Target><button type="button" title="Appearance"><IconPalette size={18} /><span className="label">Appearance</span></button></Menu.Target>
    <Menu.Dropdown>
      <Menu.Label>Style</Menu.Label>
      {themes.map(theme => {
        const tokens = theme[mode];
        return <Menu.Item key={theme.id} aria-current={theme.id === active.id || undefined} onClick={() => update({ themeId: theme.id })} rightSection={theme.id === active.id ? check : undefined}
          leftSection={<span className="theme-swatch" aria-hidden="true">{[tokens.sidebar, tokens.surface, tokens.accent].map((color, i) => <span key={i} style={{ background: color }} />)}</span>}>
          {theme.name}<small className="theme-description">{theme.description}</small>
        </Menu.Item>;
      })}
      <Menu.Divider />
      <Menu.Label>Mode</Menu.Label>
      {modes.map(({ value, label, icon: Icon }) => <Menu.Item key={value} aria-current={value === colorMode || undefined} leftSection={<Icon size={16} />} rightSection={value === colorMode ? check : undefined} onClick={() => update({ colorMode: value })}>{label}</Menu.Item>)}
    </Menu.Dropdown>
  </Menu>;
}
