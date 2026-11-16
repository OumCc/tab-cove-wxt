/** 纸墨：近黑白的极简，仅品牌标记用暖橙点缀；暗色为中性炭黑配橙色强调。 */
import type { ThemeDefinition } from '../tokens.ts';

export const ink: ThemeDefinition = {
  id: 'ink',
  name: 'Ink',
  description: 'Near monochrome with a warm orange touch.',
  light: {
    sidebar: '#f2f2f0', board: '#fafaf9', panel: '#fafaf9', surface: '#ffffff', elevated: '#ffffff',
    border: '#e6e5e2', borderStrong: '#d0cfcb',
    text: '#3f3f46', textStrong: '#18181b', textMuted: '#71717a', textSubtle: '#a1a1aa',
    hover: '#eaeae7', selected: '#e4e3e0',
    accent: '#18181b', accentHover: '#34343a', onAccent: '#ffffff',
    brand: '#ee6a35', onBrand: '#ffffff', danger: '#c2413b', onSpace: '#ffffff',
    spaceColors: ['#ee6a35', '#52525b', '#b8901f', '#3f7f6f', '#8b6fb0'],
  },
  dark: {
    sidebar: '#121214', board: '#18181b', panel: '#18181b', surface: '#222226', elevated: '#1f1f23',
    border: '#303035', borderStrong: '#43434a',
    text: '#c4c4cc', textStrong: '#ececef', textMuted: '#85858f', textSubtle: '#5d5d66',
    hover: '#29292e', selected: '#2f2f35',
    accent: '#ff8a5c', accentHover: '#ff9d76', onAccent: '#22120b',
    brand: '#ff8a5c', onBrand: '#22120b', danger: '#f0787d', onSpace: '#121214',
    spaceColors: ['#ff8a5c', '#a1a1aa', '#e0b84a', '#6fbfa8', '#b79be0'],
  },
};
