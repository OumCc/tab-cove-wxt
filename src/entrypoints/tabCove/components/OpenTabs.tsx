/** 实时目录按 Chrome 顺序显示窗口和组；浏览器命令结果由父级统一处理。 */
import { Menu } from '@mantine/core';
import { useState, type DragEvent, type CSSProperties } from 'react';
import { IconChevronDown, IconChevronRight, IconDownload, IconEdit, IconLayoutDistributeHorizontal, IconPin, IconRefresh, IconX } from '@tabler/icons-react';
import type { BrowserSnapshot, LiveGroup, LiveTab, OpenTarget, TabSource } from '../../../types/browser.ts';
import { validUrl } from '../../../services/libraryModel.ts';
import { DropZone, Favicon, MoreMenu, Tool, groupColors, type DragItem } from './ui';
export interface BrowserActions {
  move(tab: LiveTab, target?: OpenTarget): void;
  save(source: TabSource): void; focus(tab: LiveTab): void; close(tab: LiveTab): void;
  editGroup(group: LiveGroup): void; ungroup(group: LiveGroup): void; collapse(group: LiveGroup): void;
  startDrag(event: DragEvent, item: DragItem): void; drop(target: OpenTarget): void;
}
/** 支持标签和组的真实操作，不用本地数组伪造 Chrome 状态。 */
export function OpenTabs({ snapshot, currentWindowId, error, refresh, drag, actions }: { snapshot?: BrowserSnapshot; currentWindowId?: number; error?: string; refresh(): void; drag?: DragItem; actions: BrowserActions }) {
  const [closed, setClosed] = useState(new Set<number>());
  const accepting = !!drag && ['live', 'tab'].includes(drag.kind);
  function row(tab: LiveTab, target: OpenTarget) {
    return <DropZone key={tab.id} active={accepting && drag?.id !== tab.id && !tab.pinned} onDrop={() => actions.drop({ ...target, beforeTabId: tab.id })} label={`Insert before ${tab.title}`} className="live-drop">
      <div className={`live-tab ${tab.active ? 'live-active' : ''}`} draggable={!tab.pinned} onDragStart={e => actions.startDrag(e, { kind: 'live', id: tab.id })}>
        <button className="live-open" title={tab.url} onClick={() => actions.focus(tab)}><Favicon url={tab.url} title={tab.title} /><span>{tab.title}</span>{tab.pinned && <IconPin size={13} aria-label="Pinned" />}</button>
        <div className="live-tools"><MoreMenu label={`Options for open tab ${tab.title}`}>
          <Menu.Item disabled={tab.pinned} onClick={() => actions.move(tab)}>Move to window or group</Menu.Item>
          <Menu.Item disabled={tab.pinned || !snapshot?.windows.find(w => w.id === tab.windowId)?.tabs.some(t => t.index < tab.index && !t.pinned && t.groupId === tab.groupId)} onClick={() => {
            const previous = snapshot?.windows.find(w => w.id === tab.windowId)?.tabs.filter(t => t.index < tab.index && !t.pinned && t.groupId === tab.groupId).at(-1);
            if (previous) actions.move(tab, { ...target, beforeTabId: previous.id });
          }}>Move earlier</Menu.Item>
          <Menu.Item disabled={tab.pinned || !snapshot?.windows.find(w => w.id === tab.windowId)?.tabs.some(t => t.index > tab.index && t.groupId === tab.groupId)} onClick={() => {
            const after = snapshot?.windows.find(w => w.id === tab.windowId)?.tabs.filter(t => t.index > tab.index && t.groupId === tab.groupId);
            actions.move(tab, { ...target, beforeTabId: after?.[1]?.id });
          }}>Move later</Menu.Item>
        </MoreMenu><Tool label={validUrl(tab.url) ? `Save ${tab.title}` : 'Only HTTP and HTTPS pages can be saved'} disabled={!validUrl(tab.url)} onClick={() => actions.save({ windowId: tab.windowId, tabId: tab.id })}><IconDownload size={14} /></Tool><Tool label={`Close ${tab.title}`} onClick={() => actions.close(tab)}><IconX size={14} /></Tool></div>
      </div>
    </DropZone>;
  }
  return <>
    <div className="panel-title"><h2>Open Tabs</h2><Tool label="Refresh open tabs" onClick={refresh}><IconRefresh size={18} /></Tool></div>
    {error && <div className="inline-error" role="alert">{error}<button onClick={refresh}>Retry</button></div>}
    {!snapshot && !error && <p className="muted">Loading browser tabs…</p>}
    {snapshot && !snapshot.groupsAvailable && <p className="inline-error">Tab groups are unavailable. Check the extension’s permissions, then refresh.</p>}
    <div className="windows">
      {snapshot?.windows.map((w, wi) => {
        const rendered = new Set<number>();
        return <section className="browser-window" key={w.id}>
          <div className="window-title"><button onClick={() => setClosed(prev => { const next = new Set(prev); next.has(w.id) ? next.delete(w.id) : next.add(w.id); return next; })} aria-expanded={!closed.has(w.id)}>{closed.has(w.id) ? <IconChevronRight size={15} /> : <IconChevronDown size={15} />}{w.id === currentWindowId ? 'This window' : `Window ${wi + 1}`}</button></div>
          <div className="window-tools"><span>{w.tabs.length} {w.tabs.length === 1 ? 'tab' : 'tabs'}</span><Tool label={`Save session in ${w.id === currentWindowId ? 'this window' : `window ${wi + 1}`}`} disabled={!w.tabs.some(t => !t.pinned && validUrl(t.url))} onClick={() => actions.save({ windowId: w.id })}><IconDownload size={17} /></Tool></div>
          {!closed.has(w.id) && <>
            {w.tabs.map(tab => {
              const group = w.groups.find(g => g.id === tab.groupId);
              if (!group) return row(tab, { windowId: w.id });
              if (rendered.has(group.id)) return null; rendered.add(group.id);
              const members = w.tabs.filter(t => t.groupId === group.id);
              return <div className="native-group" key={`group-${group.id}`} style={{ '--group-color': groupColors[group.color] } as CSSProperties}>
                <div className="group-title"><button onClick={() => actions.collapse(group)} aria-expanded={!group.collapsed}><span className="group-dot" />{group.title || 'Unnamed group'}{group.collapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}</button></div>
                <div className="group-tools"><span>{members.length} tabs</span><Tool label={`Save group ${group.title}`} onClick={() => actions.save({ windowId: w.id, groupId: group.id })}><IconDownload size={15} /></Tool><Tool label={`Edit group ${group.title}`} onClick={() => actions.editGroup(group)}><IconEdit size={15} /></Tool><Tool label={`Ungroup ${group.title}`} onClick={() => actions.ungroup(group)}><IconLayoutDistributeHorizontal size={15} /></Tool></div>
                {!group.collapsed && members.map(t => row(t, { windowId: w.id, groupId: group.id }))}
                {accepting && <DropZone active label="Add to group" onDrop={() => actions.drop({ windowId: w.id, groupId: group.id })} className="live-end" />}
              </div>;
            })}
            {!w.tabs.length && <p className="window-empty">No other tabs in this window.</p>}
            {accepting && <DropZone active label="Move here without a group" onDrop={() => actions.drop({ windowId: w.id })} className="live-end" />}
          </>}
        </section>;
      })}
    </div>
  </>;
}
