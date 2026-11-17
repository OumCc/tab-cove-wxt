/** 石墨靛蓝：冷灰中性配靛蓝；暗色取自 One Dark Pro 色板。 */
import type { ThemeDefinition } from '../tokens.ts';

export const graphite: ThemeDefinition = {
  id: 'graphite',
  name: 'Graphite',
  description: 'Cool gray with indigo. One Dark in dark mode.',
  light: {
    sidebar: '#ebedf0', board: '#f4f5f7', panel: '#f4f5f7', surface: '#ffffff', elevated: '#ffffff',
    border: '#e1e4e9', borderStrong: '#cdd2da',
    text: '#3a4150', textStrong: '#1f2430', textMuted: '#6b7280', textSubtle: '#9aa1ad',
    hover: '#e3e6eb', selected: '#dfe2fb',
    accent: '#4f5bd5', accentHover: '#434ec2', onAccent: '#ffffff',
    brand: '#4f5bd5', onBrand: '#ffffff', danger: '#c2413b', onSpace: '#ffffff',
    spaceColors: ['#d1596a', '#4f9a6b', '#8a63c9', '#3f86c9', '#c08a2e'],
  },
  dark: {
    sidebar: '#21252b', board: '#282c34', panel: '#282c34', surface: '#2f343e', elevated: '#2c313a',
    border: '#3a3f4b', borderStrong: '#4b5263',
    text: '#abb2bf', textStrong: '#d7dae0', textMuted: '#7f848e', textSubtle: '#5c6370',
    hover: '#353b45', selected: '#2c3a4d',
    accent: '#61afef', accentHover: '#7abcf2', onAccent: '#1b1f25',
    brand: '#61afef', onBrand: '#1b1f25', danger: '#e06c75', onSpace: '#21252b',
    spaceColors: ['#e06c75', '#98c379', '#c678dd', '#61afef', '#e5c07b'],
  },
};
