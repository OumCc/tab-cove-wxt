/** 工作台小型交互控件；按钮都有名称，拖拽只接受本页面创建的内部实体。 */
import { useState, type DragEvent, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Menu } from '@mantine/core';
import { IconDots } from '@tabler/icons-react';
import { browser } from 'wxt/browser';
import type { GroupColor } from '../../../types/core.ts';
export type DragItem = { kind: 'tab' | 'collection' | 'space'; id: string } | { kind: 'live'; id: number };
/** Chrome 颜色名称到界面色值的映射，不承担收藏主题设置。 */
export const groupColors: Record<GroupColor, string> = { grey: '#80868b', blue: '#4285f4', red: '#ea4335', yellow: '#e8a200', green: '#34a853', pink: '#e76bb3', purple: '#a142f4', cyan: '#00a0ae', orange: '#ed791d' };
/** 可访问的图标按钮，原生 title 同时用于鼠标提示。 */
export function Tool({ label, children, ...props }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="tool" aria-label={label} title={label} {...props}>{children}</button>;
}
/** 菜单项保留按钮语义，Mantine 负责箭头导航及焦点恢复。 */
export function MoreMenu({ label, children }: { label: string; children: ReactNode }) {
  return <Menu position="bottom-end" withinPortal><Menu.Target><button className="tool" aria-label={label} title={label}><IconDots size={18} /></button></Menu.Target><Menu.Dropdown>{children}</Menu.Dropdown></Menu>;
}
/** 图标仅从浏览器自身资源获取，缺图时退回本地首字母。 */
export function Favicon({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  let src = '';
  try { const u = new URL('/_favicon/', browser.runtime.getURL('/tabCove.html')); u.searchParams.set('pageUrl', url); u.searchParams.set('size', '32'); src = u.href; } catch { /* 普通网页预览没有扩展运行时。 */ }
  return <span className="favicon" aria-hidden="true">{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : (title || url).slice(0, 1).toUpperCase()}</span>;
}
/** 展示明确落点；外部文本或网页拖入不会被误认为库内移动。 */
export function DropZone({ active, onDrop, children, label, className = '' }: { active: boolean; onDrop: () => void; children?: ReactNode; label: string; className?: string }) {
  const [over, setOver] = useState(false);
  const accept = (event: DragEvent) => { if (active) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setOver(true); } };
  return <div className={`drop-zone ${className} ${active ? 'drop-enabled' : ''} ${active && over ? 'drop-over' : ''}`} aria-label={label}
    onDragOver={accept} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false); }}
    onDrop={event => { setOver(false); if (active) { event.preventDefault(); event.stopPropagation(); onDrop(); } }}>{children || <span>{label}</span>}</div>;
}
