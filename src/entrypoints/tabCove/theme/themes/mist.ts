/** 雾青：带一点青的浅灰配青绿；暗色为深海蓝灰。 */
import type { ThemeDefinition } from '../tokens.ts';

export const mist: ThemeDefinition = {
  id: 'mist',
  name: 'Mist',
  description: 'Soft teal-tinted gray. Deep sea blue in dark mode.',
  light: {
    sidebar: '#e9eeee', board: '#f3f6f6', panel: '#f3f6f6', surface: '#ffffff', elevated: '#ffffff',
    border: '#dde4e4', borderStrong: '#c6d1d1',
    text: '#33454a', textStrong: '#18262a', textMuted: '#62757a', textSubtle: '#94a4a7',
    hover: '#e0e8e8', selected: '#d3ebe7',
    accent: '#0e8f80', accentHover: '#0b7c6f', onAccent: '#ffffff',
    brand: '#0e8f80', onBrand: '#ffffff', danger: '#c2413b', onSpace: '#ffffff',
    spaceColors: ['#d98a3d', '#0e8f80', '#5f7fd6', '#b75f8f', '#7a8f3c'],
  },
  dark: {
    sidebar: '#161a21', board: '#1b2028', panel: '#1b2028', surface: '#232a34', elevated: '#20262f',
    border: '#2e3743', borderStrong: '#3d4857',
    text: '#b6c2cf', textStrong: '#dde5ee', textMuted: '#7c8a99', textSubtle: '#55616f',
    hover: '#28303b', selected: '#1f3a3a',
    accent: '#4fd1b5', accentHover: '#6cdbc3', onAccent: '#10231f',
    brand: '#4fd1b5', onBrand: '#10231f', danger: '#f0787d', onSpace: '#161a21',
    spaceColors: ['#f2a65a', '#4fd1b5', '#7aa2f7', '#e58fb8', '#b4cf6a'],
  },
};
